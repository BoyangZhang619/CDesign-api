# Portrait API 与 Checkin 集成 - 快速参考

## 📋 改动汇总

### 后端改动

#### portraitService.ts
```
第 7 行: 添加导入 commonChat
第 520-655 行: 完整重写 analyzeCheckinDataWithAI() 方法
  - 获取用户个人资料和打卡数据
  - 构建详细的 AI 分析提示
  - 调用 commonChat 进行分析
  - 处理 JSON 解析和错误回退

第 652-668 行: 改进 calculateExerciseScoreFromCheckin()
  - 新增频次评分 (40分) + 时长评分 (40分) + 强度评分 (20分)
  - 更科学的计分权重

第 671-705 行: 改进 calculateMealScoreFromCheckin()
  - 新增频次评分 (40分) + 营养均衡评分 (40分) + 热量适度评分 (20分)
  - 检查蛋白质、脂肪、碳水的均衡性

第 708-738 行: 改进 calculateSleepScoreFromCheckin()
  - 优先使用 AI 给出的 sleep_quality_score
  - 备选方案：基于睡眠时长推算
```

#### portraitDAL.ts
```
第 478-502 行: 修复 getLatestCheckinData() 方法
  - 修正 checkin_exercise_record 查询列名
  - 修正 checkin_meal_record 查询列名
  - 修正 checkin_sleep_record 查询列名
  - 使用正确的时间范围查询
```

### 前端改动

#### PortraitView.vue
```
第 227-229 行: 为空数组添加类型注解
  - recommendations: [] as Array<{...}>
  - timeline: [] as Array<{...}>

第 249-329 行: 新增 pollForPortraitData() 函数
  - 轮询 GET /api/health/portrait
  - 最多 30 次，指数退避策略
  - 检测有效数据后停止

第 245-278 行: 修改健康档案处理函数
  - handleHealthSetupClose(): 不允许关闭
  - handleHealthSetupSuccess(): 触发后端刷新并开始轮询

第 393-440 行: 修改 onMounted() 钩子
  - 强制检查健康档案设置
  - 调用后端 /refresh-from-checkin
  - 调用轮询函数
```

---

## 🔌 API 端点

### POST /api/health/refresh-from-checkin
**触发后端数据刷新和 AI 分析**

Request:
```
POST /api/health/refresh-from-checkin
Authorization: Bearer {token}
Content-Type: application/json
```

Response:
```json
{
  "code": 200,
  "success": true,
  "msg": "健康画像已更新",
  "data": {
    "exerciseScore": 0-100,
    "mealScore": 0-100,
    "sleepScore": 0-100,
    "metabolism": 0-100,
    "bmi": 22.5,
    "bmiStatus": "normal|underweight|overweight|obese",
    "cardioLevel": "良好",
    "cardioStatus": "excellent|good|normal|poor",
    "sleepQuality": "优质",
    "sleepQualityStatus": "excellent|good|normal|poor",
    "radarData": {...},
    "recommendations": [...],
    "timeline": [...]
  }
}
```

---

## ⚙️ 技术细节

### 数据流
1. 用户完成健康档案设置 → 
2. 前端调用 POST /api/health/refresh-from-checkin →
3. 后端查询最近 7 天的 checkin 数据 →
4. 后端调用 DashScope aiChat 进行分析 →
5. 后端更新 health_portrait 表 →
6. 前端轮询 GET /api/health/portrait 直到获得数据 →
7. 前端显示更新后的健康画像

### 计分算法

**运动评分** (100分制):
- 频次评分 (0-40分): 每天 15 分
- 时长评分 (0-40分): 基于 150 分钟/周为满分
- 强度评分 (0-20分): 高强度运动的比例

**饮食评分** (100分制):
- 频次评分 (0-40分): 每顿 20 分
- 营养均衡评分 (0-40分): 包含蛋白质、脂肪、碳水
- 热量适度评分 (0-20分): 每餐 400-800 卡路里为最优

**睡眠评分** (100分制):
- 优先使用 AI 评分 (sleep_quality_score)
- 备选: 基于睡眠时长 (7-8 小时最优为 90 分)

### 轮询策略
- 初始延迟: 500ms
- 增长因子: 指数增长 (1.2^n)
- 最大次数: 30 次
- 有效数据判断: 至少一项分数 > 0

---

## 🐛 故障排查

### 问题: "Unknown column 'xxx' in 'field list'"
**原因**: SQL 查询使用了不存在的列名
**解决**: 已修复，确保使用正确的列名
- exercise_record: activity_type, duration_min, intensity, calories_burned, suggestion, evaluation
- meal_record: meal_type, food_name, calories, protein_g, fat_g, carbohydrate_g, fiber_g, sugar_g
- sleep_record: sleep_start_time, wake_up_time, sleep_duration_hours, sleep_quality_score, sleep_feeling

### 问题: 后端无数据返回
**原因**: 可能是打卡表中没有数据
**解决**: 
1. 检查用户是否有打卡数据
2. 检查日期范围是否正确
3. 查看后端日志中的 SQL 执行结果

### 问题: 前端轮询一直不停止
**原因**: 后端返回的数据中分数都是 0
**解决**:
1. 检查后端 AI 分析是否成功
2. 检查打卡数据统计是否正确
3. 检查本地计算的回退逻辑

### 问题: AI 分析失败
**原因**: DashScope 调用出错或响应格式不正确
**解决**:
1. 检查 API key 是否正确
2. 检查网络连接
3. 查看后端日志中的 AI 响应
4. 系统会自动回退到本地计算

---

## ✅ 测试清单

- [ ] 后端编译成功 (`npm run build`)
- [ ] 后端启动成功
- [ ] 打卡数据表中有测试数据
- [ ] 用户完成了健康档案设置
- [ ] 前端能进入 Portrait 页面
- [ ] 健康档案设置模态框正常显示/隐藏
- [ ] 后端能成功调用 aiChat
- [ ] 前端轮询能检测到数据
- [ ] 健康画像数据正常显示

---

## 📚 相关文件

- 后端: `src/services/portraitService.ts`, `src/services/portraitDAL.ts`, `src/controllers/portraitController.ts`
- 前端: `src/views/PortraitView.vue`
- 工具: `src/controllers/aiController.ts` (commonChat)
- 类型定义: `src/types/portrait.ts`

