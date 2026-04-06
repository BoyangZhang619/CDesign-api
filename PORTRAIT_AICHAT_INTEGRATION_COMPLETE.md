# Portrait API & Checkin 集成完整实现总结

## 🎯 目标完成情况

### ✅ 已完成的功能
1. **强制健康档案设置**
   - 用户进入 Portrait 页面时，如果未完成健康档案设置，强制显示设置模态框
   - 模态框不可关闭，必须完成设置才能继续
   - 完成设置后自动触发后端数据刷新

2. **后端 aiChat 集成**
   - 导入并使用 DashScope 的 `commonChat` 服务
   - 传递用户个人资料（年龄、性别、身高、体重、目标等）给 AI
   - 传递 7 天内的打卡数据统计给 AI
   - AI 返回综合健康评分结果

3. **前端轮询机制**
   - 健康档案完成后，立即触发后端刷新
   - 前端持续轮询获取数据（最多 30 次）
   - 使用指数退避策略，避免频繁请求
   - 检测到有效数据后停止轮询

4. **打卡数据集成**
   - 从 `checkin_exercise_record` 获取运动数据
   - 从 `checkin_meal_record` 获取饮食数据
   - 从 `checkin_sleep_record` 获取睡眠数据
   - 计算用户 BMI 并包含在分析中

---

## 📁 代码文件修改概览

### 后端文件

#### 1. `src/services/portraitService.ts`
**修改内容**:
- ✅ 导入 `commonChat` 从 aiController
- ✅ 实现 `analyzeCheckinDataWithAI()` 方法调用真实 AI 分析
- ✅ 改进 `calculateExerciseScoreFromCheckin()` 计分逻辑（频次 + 时长 + 强度）
- ✅ 改进 `calculateMealScoreFromCheckin()` 计分逻辑（频次 + 营养均衡 + 热量适度）
- ✅ 改进 `calculateSleepScoreFromCheckin()` 优先使用 AI 评分

**关键方法**:
```typescript
private static async analyzeCheckinDataWithAI(userId, checkinData)
  // 获取用户背景和个人资料
  // 构建详细的 AI 分析提示，包含用户信息和打卡数据统计
  // 调用 commonChat 进行分析
  // 解析 JSON 响应，处理错误时回退到本地计算
```

#### 2. `src/services/portraitDAL.ts`
**修改内容**:
- ✅ 修复 `getLatestCheckinData()` 使用正确的列名
  - `checkin_exercise_record`: activity_type, duration_min, intensity, calories_burned, suggestion, evaluation
  - `checkin_meal_record`: meal_type, food_name, calories, protein_g, fat_g, carbohydrate_g, fiber_g, sugar_g, meal_time
  - `checkin_sleep_record`: sleep_start_time, wake_up_time, sleep_duration_hours, sleep_quality_score, sleep_feeling, suggestion, evaluation

**关键方法**:
```typescript
static async getLatestCheckinData(userId, days = 7)
  // 查询最近 N 天的运动、饮食、睡眠数据
  // 计算用户 BMI（从 user_profile 获取身高体重）
  // 返回聚合后的 checkinData 对象
```

#### 3. `src/controllers/portraitController.ts`
**现状**:
- ✅ 已有 `refreshPortraitFromCheckin()` 方法
- ✅ 调用 `PortraitService.refreshPortraitFromCheckin(userId)`
- ✅ 返回更新后的健康画像数据

### 前端文件

#### 1. `src/views/PortraitView.vue`
**修改内容**:

**a) 类型修复**:
```typescript
// 为空数组添加明确的类型注解
recommendations: [] as Array<{icon: string; title: string; description: string; priority: string}>
timeline: [] as Array<{date: string; title: string; description: string; status: string}>
```

**b) 强制健康档案设置**:
```typescript
function handleHealthSetupClose() {
  // 不允许关闭，强制用户完成设置
  // 无任何操作，用户必须完成
}

async function handleHealthSetupSuccess() {
  // 1. 关闭模态框
  // 2. 立即调用 POST /api/health/refresh-from-checkin 触发后端分析
  // 3. 开始轮询获取数据
  showHealthSetupModal.value = false
  
  // 触发后端刷新
  await fetchWithRefresh('/api/health/refresh-from-checkin', { method: 'POST' })
  
  // 开始轮询
  await pollForPortraitData()
}
```

**c) 前端轮询机制**:
```typescript
async function pollForPortraitData() {
  let attempts = 0
  const maxAttempts = 30
  const baseDelay = 500 // 初始 500ms
  
  while (attempts < maxAttempts) {
    const response = await fetchWithRefresh('/api/health/portrait', { method: 'GET' })
    const data = response.json()
    
    // 检查是否有有效数据（至少一项分数 > 0）
    if (data?.data?.exerciseScore > 0 || data?.data?.mealScore > 0 || data?.data?.sleepScore > 0) {
      // 获得有效数据，停止轮询
      await loadPortraitData()
      return
    }
    
    // 指数退避
    const delayMs = baseDelay * (attempts > 5 ? 2 : 1.2 ** attempts)
    await sleep(delayMs)
    attempts++
  }
}
```

**d) 修改 onMounted**:
```typescript
onMounted(async () => {
  // 1. 检查健康档案设置
  const needsHealthInfo = await checkHealthInfoNeeded()
  if (needsHealthInfo) {
    showHealthSetupModal.value = true
    return  // 强制停止，用户必须完成设置
  }
  
  // 2. 已完成设置，立即调用后端刷新
  await fetchWithRefresh('/api/health/refresh-from-checkin', { method: 'POST' })
  
  // 3. 轮询获取数据
  await pollForPortraitData()
  
  // 4. 初始化图表
  initRadarChart()
})
```

---

## 🔄 完整工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 用户进入 Portrait 页面                                           │
└──────────────────────────┬──────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 检查健康档案设置状态 (checkHealthInfoNeeded)                    │
│ - 调用 GET /api/health/setup-status                             │
│ - 查询 health_profile_setup 表                                   │
└──────────────────────────┬──────────────────────────────────────┘
                          ↓
        ┌─────────────────┴──────────────────┐
        │                                    │
    未完成                              已完成
        ↓                                    ↓
┌────────────────────┐          ┌──────────────────────┐
│ 显示强制设置模态框  │          │ 检查是否需要更新数据  │
│ (不可关闭)          │          │                      │
└────────────────────┘          └──────────────────────┘
        ↓                                    ↓
    用户填写信息                   ┌─────────────────┐
        ↓                          │ 触发后端刷新    │
    完成设置                       │ (POST /api...   │
        ↓                          │  /refresh-..    │
┌────────────────────────────┐    │  from-checkin)  │
│ 调用成功处理函数            │    └────────┬─────────┘
│ handleHealthSetupSuccess() │             ↓
└────────┬───────────────────┘    ┌─────────────────────┐
         ↓                        │ 后端处理流程:       │
    关闭模态框                     │ 1. 获取 checkin 数据│
         ↓                        │ 2. 调用 aiChat      │
┌────────────────────────────┐    │ 3. 更新数据库      │
│ 触发后端刷新               │    │ 4. 返回结果        │
│ /api/health/...            │    └────────┬──────────┘
│ refresh-from-checkin       │             ↓
└────────┬───────────────────┘    ┌─────────────────────┐
         ↓                        │ 前端轮询:           │
┌────────────────────────────┐    │ 1. GET /api/health/ │
│ 前端开始轮询               │    │    portrait         │
│ pollForPortraitData()      │    │ 2. 检查是否有数据   │
└────────┬───────────────────┘    │ 3. 指数退避         │
         ↓                        │ 4. 最多 30 次       │
   检查数据有效性                  └────────┬──────────┘
    (分数 > 0)                             ↓
    ↓        ↓                      数据有效?
   无      有                         ✓
    ↓        ↓                         ↓
 继续轮询  停止轮询                 停止轮询
    ↓        ↓
 等待500ms   ↓
  重试    加载数据
         ↓
    初始化图表
    显示健康画像
    ✓ 完成
```

---

## 🗄️ 数据库表结构参考

### `checkin_exercise_record`
```sql
- id, daily_checkin_id, user_id
- activity_type (varchar): 运动类型
- duration_min (int): 运动时长
- intensity (varchar): low/medium/high
- calories_burned (decimal): 消耗热量
- start_time, end_time: 时间戳
- suggestion, evaluation: AI 建议和评价
```

### `checkin_meal_record`
```sql
- id, daily_checkin_id, user_id
- meal_type: breakfast/lunch/dinner/snack
- food_name (varchar): 食物名称
- calories (decimal): 热量
- protein_g, fat_g, carbohydrate_g: 营养成分
- fiber_g, sugar_g: 可选营养
- meal_time: 用餐时间
```

### `checkin_sleep_record`
```sql
- id, daily_checkin_id, user_id
- sleep_start_time, wake_up_time: 睡眠时间
- sleep_duration_hours (decimal): 睡眠时长
- sleep_quality_score (int): AI 评分 0-100
- sleep_feeling (varchar): 个人感觉
- suggestion, evaluation: AI 建议和评价
```

### `user_profile`
```sql
- age, gender, heightCm, currentWeightKg, targetWeightKg
- activityLevel, healthGoals, dietaryPreferences, allergies
- workRestHabit: 作息习惯
```

---

## 🧪 测试步骤

### 1. 确保后端编译成功
```bash
cd CDesign-api
npm run build
```

### 2. 启动后端服务器
```bash
npm run start
```

### 3. 测试 API 端点

**a) 检查健康档案设置状态**:
```bash
curl -X GET http://localhost:3000/api/health/setup-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**b) 触发数据刷新**:
```bash
curl -X POST http://localhost:3000/api/health/refresh-from-checkin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**c) 获取更新后的健康画像**:
```bash
curl -X GET http://localhost:3000/api/health/portrait \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. 前端测试
- 进入 Portrait 页面
- 如果未完成健康档案设置，应显示强制设置模态框
- 完成设置后，应自动触发后端分析
- 观察轮询过程（可在浏览器控制台看到日志）
- 数据应在轮询期间逐步填充

---

## ⚠️ 重要注意事项

### 1. AI 调用失败回退
- 如果 DashScope aiChat 调用失败，系统会自动回退到本地计算
- 本地计算基于基本的数据统计，准确性较低
- 建议监控 AI 调用的成功率

### 2. 轮询超时
- 最多轮询 30 次，约 2-3 分钟
- 如果超时仍未获得数据，说明后端处理出现问题
- 检查后端日志查看 AI 分析是否成功

### 3. 前端初始化
- 画像数据初始化为全 0 或空值
- 不使用任何假数据或默认值
- 必须从后端获取真实数据

### 4. 错误处理
- 所有 API 调用都包含错误处理
- 网络错误时轮询会重试
- 用户错误（如未授权）会立即返回错误

---

## 📊 API 响应格式

### POST /api/health/refresh-from-checkin
```json
{
  "code": 200,
  "success": true,
  "msg": "健康画像已更新",
  "data": {
    "exerciseScore": 75,
    "mealScore": 68,
    "sleepScore": 82,
    "bmi": 22.5,
    "bmiStatus": "normal",
    "cardioLevel": "良好",
    "cardioStatus": "good",
    "metabolism": 88,
    "metabolismStatus": "normal",
    "sleepQuality": "优质",
    "sleepQualityStatus": "excellent",
    "radarData": {...},
    "recommendations": [...],
    "timeline": [...]
  }
}
```

---

## ✅ 验证清单

- [x] 后端代码编译通过（无 TypeScript 错误）
- [x] 前端代码编译通过（无类型错误）
- [x] 强制健康档案设置逻辑完整
- [x] 后端数据刷新端点可用
- [x] aiChat 集成完成
- [x] 前端轮询机制完成
- [x] 错误处理和回退机制完整
- [x] 数据库列名与查询匹配
- [x] 画像数据初始为空

---

## 🚀 下一步建议

1. **监控和日志**
   - 添加详细的日志记录用于调试
   - 监控 AI 调用的成功率和耗时

2. **性能优化**
   - 缓存用户个人资料数据
   - 减少数据库查询次数
   - 考虑异步处理 AI 分析

3. **用户体验**
   - 在轮询期间显示加载动画
   - 提示用户"数据正在分析中，请稍候"
   - 轮询超时时显示友好的错误提示

4. **数据准确性**
   - 定期审查 AI 评分的准确性
   - 收集用户反馈，调整计分权重
   - 增加更多维度的评分因素

