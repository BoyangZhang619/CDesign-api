import pool from '../config/db.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';
import { PortraitDAL } from '../services/portraitDAL.js';
import { AIChatService } from '../services/aiChatService.js';
import { getCurrentDateTimeString } from '../util/dateTime.js';
// 检测是否需要输入健康信息
async function CheckHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const [rows] = await pool.query(
        'SELECT id, created_at, updated_at FROM user_profile WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            needHealthInfo: true,
            setup_date: null
        });
    }

    const healthProfile = (rows as any[])[0];
    return sendResult(res, {
        message: '用户已填写健康信息',
        needHealthInfo: false,
        setup_date: healthProfile.updated_at || healthProfile.created_at,
        is_completed: 1
    });
}

// 插入健康信息
async function InsertHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    console.log('[InsertHealthInfo] 用户ID:', userId);
    console.log('[InsertHealthInfo] 请求体:', req.body);
    try {
        const response = await PortraitDAL.updateUserProfile(userId, req.body);
        if (!response) {
            throw new Error('更新用户健康信息失败');
        }
        sendResult(res, '健康信息保存成功');

        // 后台异步生成AI建议的任务
        generateAISuggestedTasks(userId, req.body).catch(err =>
            console.error('生成AI建议任务失败:', err)
        );

    } catch (error) {
        console.error('[InsertHealthInfo] 保存健康信息时出错:', error);
        return sendError(res, '保存健康信息失败', 500);
    }
}

// 更新健康信息
async function UpdateHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const { gender, birthday, height, currentWeight, targetWeight, dietPreferences, dietOtherText, healthGoals, goalOtherText, allergies, sleepHabit, activityLevel } = req.body;

    // 检查必填字段
    if (!gender || !birthday || !dietPreferences || !healthGoals || !allergies || !sleepHabit || !activityLevel) {
        return sendError(res, '请填写所有必填字段', 400);
    }

    try {
        await pool.query(
            `UPDATE user_profile SET gender = ?, birthday = ?, height_cm = ?, current_weight_kg = ?, target_weight_kg = ?, diet_preferences = ?, diet_other_text = ?, health_goals = ?, goal_other_text = ?, allergies = ?, sleep_habit = ?, activity_level = ? WHERE user_id = ?`,
            [gender, birthday, height, currentWeight, targetWeight, JSON.stringify(dietPreferences), dietOtherText, JSON.stringify(healthGoals), goalOtherText, allergies, sleepHabit, activityLevel, userId]
        );

        return sendResult(res, '健康信息更新成功');
    } catch (error) {
        console.error('更新健康信息时出错:', error);
        return sendError(res, '更新健康信息失败', 500);
    }
}

// 获取健康信息
async function GetHealthInfo(req: Request, res: Response): Promise<Response> {
    const userId = req.user.userId;
    const [rows] = await pool.query(
        'SELECT * FROM user_profile WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
    );

    if ((rows as any[]).length === 0) {
        return sendResult(res, {
            message: '用户未填写健康信息',
            healthInfo: null
        });
    }

    const healthInfo = (rows as any[])[0];

    // 将逗号分隔的字符串转换回数组
    if (healthInfo.dietary_preferences && typeof healthInfo.dietary_preferences === 'string') {
        // healthInfo.dietary_preferences = healthInfo.dietary_preferences.split(',').filter((v: string) => v.trim());
        healthInfo.dietary_preferences = JSON.parse(healthInfo.dietary_preferences);
    }
    if (healthInfo.health_goals && typeof healthInfo.health_goals === 'string') {
        // healthInfo.health_goals = healthInfo.health_goals.split(',').filter((v: string) => v.trim());
        healthInfo.health_goals = JSON.parse(healthInfo.health_goals);
    }

    return sendResult(res, {
        message: '用户已填写健康信息',
        healthInfo: healthInfo,
        is_completed: 1
    });
}

/**
 * 异步生成基于健康信息的AI建议任务
 * 根据用户的健康目标、活动级别等信息生成个性化的任务建议
 */
async function generateAISuggestedTasks(userId: number, healthInfo: any) {
    try {
        console.log('[generateAISuggestedTasks] 为用户 ' + userId + ' 生成AI建议任务');

        // 获取用户现有的所有任务
        const [existingTasks] = await pool.query(
            `SELECT id, title, description, category, priority, status, is_daily 
             FROM tasks 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        );

        const taskList = (existingTasks as any[]) || [];
        console.log(`[generateAISuggestedTasks] 用户 ${userId} 已有 ${taskList.length} 个任务`);

        // 构建现有任务的统计信息
        const taskStats = {
            total: taskList.length,
            byCategory: {} as Record<string, number>,
            byPriority: {} as Record<string, number>,
            dailyCount: 0,
            pendingCount: 0,
            completedCount: 0
        };

        for (const task of taskList) {
            taskStats.byCategory[task.category] = (taskStats.byCategory[task.category] || 0) + 1;
            taskStats.byPriority[task.priority] = (taskStats.byPriority[task.priority] || 0) + 1;
            if (task.is_daily) taskStats.dailyCount++;
            if (task.status === 'pending') taskStats.pendingCount++;
            if (task.status === 'completed') taskStats.completedCount++;
        }

        // 构建现有任务的详细列表（仅显示最近10个）
        const recentTasksDesc = taskList.slice(0, 10).map((t: any) =>
            `- ${t.title} (分类: ${t.category}, 优先级: ${t.priority}, 状态: ${t.status})`
        ).join('\n');

        // 构建AI请求的prompt
        const prompt = `请根据以下用户的健康信息和现有任务情况，判断是否需要生成新的AI建议任务。
如果用户已有足够的任务来支撑其健康目标，则可以不生成新任务（返回空数组[]）。
如果需要补充，则生成1-3条新的、与现有任务互补的健康任务建议。

【用户健康信息】
性别: ${healthInfo.gender === 'male' ? '男' : '女'}
年龄: ${healthInfo.birthday ? Math.floor((new Date().getTime() - new Date(healthInfo.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '未知'}岁
身高: ${healthInfo.height_cm || healthInfo.heightCm || '未知'}cm
当前体重: ${healthInfo.current_weight_kg || healthInfo.currentWeight || '未知'}kg
目标体重: ${healthInfo.target_weight_kg || healthInfo.targetWeight || '未知'}kg
活动级别: ${healthInfo.activity_level || healthInfo.activityLevel || '未知'}
健康目标: ${Array.isArray(healthInfo.health_goals) ? healthInfo.health_goals.join('、') : (healthInfo.health_goals || '未知')}
饮食偏好: ${Array.isArray(healthInfo.dietary_preferences) ? healthInfo.dietary_preferences.join('、') : (healthInfo.dietary_preferences || '未知')}
过敏信息: ${healthInfo.allergies || '无'}
作息习惯: ${healthInfo.work_rest_habit || healthInfo.workRestHabit || '未知'}

【用户现有任务情况】
总任务数: ${taskStats.total}
待完成任务数: ${taskStats.pendingCount}
已完成任务数: ${taskStats.completedCount}
日常任务数: ${taskStats.dailyCount}
任务分布(分类): ${JSON.stringify(taskStats.byCategory)}
任务分布(优先级): ${JSON.stringify(taskStats.byPriority)}

【最近的任务列表】
${recentTasksDesc || '用户暂无任务'}

【任务生成要求】
请根据用户的健康目标和现有任务情况，判断：
1. 用户是否已经有足够的任务来支撑健康目标？
2. 是否存在覆盖不足的健康领域（如运动、饮食、睡眠）？
3. 现有任务的优先级分配是否合理？

如果判断用户已有足够的任务且分布合理，请返回空JSON数组：[]

如果需要补充新任务，请生成1-3条新任务，每条任务必须包含以下内容，用JSON格式返回（每条任务之间用换行符\\n分隔）：
{
  "title": "具体的任务标题（20字以内，且不能与现有任务重复）",
  "description": "详细的任务描述（100字以内，说明为什么这个任务对用户有帮助以及如何与现有任务互补）",
  "category": "任务分类，必须是以下之一：exercise（运动）、diet（饮食）、sleep（睡眠）、custom（自定义）",
  "priority": "优先级，必须是以下之一：high（高）、medium（中）、low（低）",
  "is_daily": 0或1（是否为日常任务，1表示每天重复，0表示一次性）",
  "ai_suggestion_reason": "AI建议这个任务的原因，说明如何补充现有任务的不足（50字以内）"
}

【重要规则】
1. 只在必要时生成新任务，优先复用现有任务
2. 每条任务必须是独立的JSON对象，多条任务用换行符分隔；如果不需要新任务，返回空数组[]
3. 只返回JSON内容，不要添加其他文字或说明
4. 不要使用markdown代码块，直接输出JSON
5. category字段必须从列表中选择，不能自定义
6. priority字段必须从列表中选择，不能自定义
7. is_daily字段必须是0或1的数字
8. 新生成的任务必须与现有任务无重复，标题不能相同或相似
9. 根据用户的健康目标和当前任务情况，合理设置任务的优先级
10. 生成的任务应该是可执行的、具体的、有明确目标的、能与现有任务形成互补`;

        // 调用AI服务
        const sessionData = {
            title: `Health Tasks Generation ${getCurrentDateTimeString()}`,
            description: '根据健康信息和现有任务生成AI建议任务',
            ai_model: 'dashscope'
        };

        const session = await AIChatService.createSession(userId, sessionData);
        const aiResult = await AIChatService.sendMessage(userId, session.id, prompt);

        if (!aiResult?.aiMessage) {
            console.error(`[generateAISuggestedTasks] AI调用失败 (userId: ${userId}): 无有效响应`);
            return;
        }

        // 解析AI返回的任务数据
        const aiContent = aiResult.aiMessage.content;
        const tasks = parseAISuggestedTasks(aiContent);

        if (!tasks || tasks.length === 0) {
            console.log(`[generateAISuggestedTasks] AI判断用户 ${userId} 现有任务已足够，无需新增任务`);
            return;
        }

        // 将生成的任务插入数据库
        for (const task of tasks) {
            try {
                // 计算截止日期：如果是日常任务，截止日期为明天；否则为7天后
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (task.is_daily ? 1 : 7));
                const dueDateStr = dueDate.toISOString().split('T')[0];

                await pool.query(
                    `INSERT INTO tasks (
                        user_id, title, description, type, category, status, priority, 
                        due_date, is_daily, ai_suggestion_reason, date_type, category_icon
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        task.title,
                        task.description,
                        'ai_suggested', // type字段固定为ai_suggested
                        task.category,
                        'pending', // status固定为pending
                        task.priority,
                        dueDateStr,
                        task.is_daily ? 1 : 0,
                        task.ai_suggestion_reason,
                        task.is_daily ? 'everyday' : 'tomorrow', // date_type根据is_daily确定
                        getCategoryIcon(task.category) // 根据category获取emoji图标
                    ]
                );

                console.log(`[generateAISuggestedTasks] 已为用户 ${userId} 创建任务: ${task.title}`);
            } catch (insertError) {
                console.error(`[generateAISuggestedTasks] 插入任务失败:`, insertError);
            }
        }

        console.log(`[generateAISuggestedTasks] 成功为用户 ${userId} 生成 ${tasks.length} 条AI建议任务`);
    } catch (error) {
        console.error(`[generateAISuggestedTasks] 生成AI建议任务失败 (userId: ${userId}):`, error);
    }
}

/**
 * 解析AI返回的任务建议JSON数据
 */
function parseAISuggestedTasks(aiResponse: string): any[] {
    try {
        const tasks: any[] = [];
        const trimmed = aiResponse.trim();

        // 处理空数组的情况
        if (trimmed === '[]' || trimmed === '') {
            console.log('[parseAISuggestedTasks] AI返回空数组或空字符串，无需新增任务');
            return [];
        }

        // 按换行符分割每个JSON对象
        const lines = trimmed.split('\n').filter(line => line.trim());

        for (const line of lines) {
            try {
                const content = line.trim();
                // 跳过空行和非JSON行
                if (!content || !content.startsWith('{')) {
                    continue;
                }

                const task = JSON.parse(content);

                // 验证必需字段
                if (!task.title || !task.description || !task.category || !task.priority) {
                    console.warn('[parseAISuggestedTasks] 任务缺少必需字段:', task);
                    continue;
                }

                // 验证category字段值
                const validCategories = ['exercise', 'diet', 'sleep', 'custom'];
                if (!validCategories.includes(task.category)) {
                    console.warn('[parseAISuggestedTasks] 无效的category值:', task.category);
                    task.category = 'custom'; // 默认为custom
                }

                // 验证priority字段值
                const validPriorities = ['high', 'medium', 'low'];
                if (!validPriorities.includes(task.priority)) {
                    console.warn('[parseAISuggestedTasks] 无效的priority值:', task.priority);
                    task.priority = 'medium'; // 默认为medium
                }

                // 确保is_daily是数字
                task.is_daily = task.is_daily === 1 || task.is_daily === '1' ? 1 : 0;

                // 截断字段长度
                task.title = (task.title || '').substring(0, 100);
                task.description = (task.description || '').substring(0, 500);
                task.ai_suggestion_reason = (task.ai_suggestion_reason || '').substring(0, 255);

                tasks.push(task);
            } catch (parseError) {
                console.warn('[parseAISuggestedTasks] 解析单条任务JSON失败:', line);
                continue;
            }
        }

        return tasks;
    } catch (error) {
        console.error('[parseAISuggestedTasks] 解析AI建议任务失败:', error);
        return [];
    }
}

/**
 * 根据任务category获取对应的emoji图标
 */
function getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
        'exercise': '🏃',
        'diet': '🍎',
        'sleep': '😴',
        'custom': '✅'
    };
    return iconMap[category] || '✅';
}

export {
    CheckHealthInfo,
    InsertHealthInfo,
    UpdateHealthInfo,
    GetHealthInfo
}