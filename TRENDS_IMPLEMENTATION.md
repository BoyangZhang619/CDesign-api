# 📊 趋势分析 (Trends Analysis) - 实现完成

## 功能概述

趋势分析页面（`/analysis/trends`）提供用户健康数据的长期跟踪和统计分析，支持多个时间维度的数据对比。

### 核心特性
- ✅ 多时间范围选择（周/月/季度/年）
- ✅ 三大健康维度趋势图（运动/饮食/睡眠）
- ✅ 关键指标统计和趋势百分比
- ✅ 习惯养成进度跟踪
- ✅ 周期对比分析
- ✅ 实时数据聚合（不需要 AI）

---

## 后端实现

### 1. **trendsService.ts** - 业务逻辑层

**路径**: `src/services/trendsService.ts`

**核心方法**:

```typescript
getTrendsData(userId: number, range: string): Promise<TrendsData>
```

**功能**:
- 根据时间范围（week/month/quarter/year）聚合打卡数据
- 计算统计指标：平均值、最大值、总计
- 对比上一个周期数据，生成趋势百分比
- 生成每日详细数据用于图表展示

**数据聚合逻辑**:
- **运动数据**: 聚合 `duration_min`、`calories_burned`
- **饮食数据**: 聚合 `calories`、营养信息
- **睡眠数据**: 聚合 `sleep_duration_hours`、`sleep_quality_score`

**关键计算**:
```
健康评分 = 基础分(50) 
         + 运动加分(0-20) 
         + 睡眠加分(0-20) 
         + 饮食加分(0-10)
```

**趋势百分比**:
```
运动趋势 = ((本周运动天数 - 上周运动天数) / 上周运动天数) * 100%
睡眠趋势 = ((本周平均睡眠 - 上周平均睡眠) / 上周平均睡眠) * 100%
卡路里趋势 = ((本周总卡路里 - 上周总卡路里) / 上周总卡路里) * 100%
```

### 2. **trendsController.ts** - 控制器层

**路径**: `src/controllers/trendsController.ts`

**暴露的端点**:

#### 获取总体趋势数据
```
GET /api/analysis/trends?range=month
```

**参数**:
- `range`: week | month | quarter | year (默认: month)

**响应**:
```json
{
  "success": true,
  "message": "获取趋势数据成功",
  "data": {
    "avgExercise": 35,           // 平均运动时长(分钟)
    "maxExercise": 60,           // 最大运动时长
    "totalExerciseTime": 5.5,    // 总运动时长(小时)
    
    "avgMealCalories": 2000,     // 平均每餐卡路里
    "maxMealCalories": 2800,     // 最高单餐卡路里
    "totalCalories": 12500,      // 周期总卡路里消耗
    
    "avgSleep": 7.2,             // 平均睡眠时长(小时)
    "maxSleep": 8.5,             // 最长睡眠时长
    "totalSleepTime": 50.4,      // 周期总睡眠时长
    
    "healthScore": 78,           // 综合健康评分
    
    "caloriesTrend": 12,         // 卡路里变化趋势(%)
    "exerciseTrend": 8,          // 运动变化趋势(%)
    "sleepTrend": 5,             // 睡眠变化趋势(%)
    "scoreTrend": 6,             // 评分变化趋势(%)
    
    "weekComparison": {
      "exerciseFrequency": 5,    // 本周运动天数
      "exerciseFrequencyTrend": 8,
      "avgSleepCurrent": 7.2,    // 本周平均睡眠
      "avgSleepPrev": 6.8,       // 上周平均睡眠
      "sleepTrend": 5,
      "mealBalance": 78,         // 饮食均衡度
      "mealBalanceTrend": 0
    },
    
    "dailyData": [               // 每日详细数据
      {
        "date": "06-01",
        "exercise": 30,          // 当日运动时长(分钟)
        "meal": 2000,            // 当日卡路里
        "sleep": 7               // 当日睡眠(小时)
      },
      ...
    ]
  }
}
```

#### 获取特定维度详情
```
GET /api/analysis/trends/detail/:dimension?range=month
```

**参数**:
- `dimension`: exercise | meal | sleep
- `range`: week | month | quarter | year

**响应示例**:
```json
{
  "success": true,
  "data": {
    "dimension": "exercise",
    "avgDuration": 35,
    "maxDuration": 60,
    "totalTime": 5.5,
    "trend": 8,
    "dailyData": [...]
  }
}
```

### 3. **trendsRouters.ts** - 路由定义

**路径**: `src/routes/trendsRouters.ts`

```typescript
router.get('/trends', TrendsController.getTrendsData);
router.get('/trends/detail/:dimension', TrendsController.getTrendDetail);
```

### 4. **index.ts** - 主文件注册

```typescript
import trendsRouters from './routes/trendsRouters.js';
app.use('/api/analysis', trendsRouters);
```

---

## 前端实现

### **TrendsView.vue** 主要改动

**路径**: `src/views/TrendsView.vue`

#### 数据结构

```typescript
// 统计数据
const stats = ref({
  avgExercise: 35,
  maxExercise: 60,
  avgMealCalories: 2000,
  // ... 完整的统计字段
});

// 每日数据用于图表展示
const chartData = ref<Array<{
  date: string;      // 日期 (MM-DD)
  exercise: number;  // 运动时长(分钟)
  meal: number;      // 卡路里(kcal)
  sleep: number;     // 睡眠时长(小时)
}>>([...]);

// 时间范围
const selectedRange = ref('month');
const dateRanges = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' }
];
```

#### 关键函数

**loadTrendsData()** - 加载数据
```typescript
async function loadTrendsData() {
  const response = await fetchWithRefresh(
    `/api/analysis/trends?range=${selectedRange.value}`
  );
  // 解析数据并更新本地状态
}
```

**initCharts()** - 初始化图表
```typescript
function initCharts() {
  const dates = chartData.value.map(d => d.date);
  const exerciseData = chartData.value.map(d => d.exercise);
  const mealData = chartData.value.map(d => d.meal);
  const sleepData = chartData.value.map(d => d.sleep);
  // 绘制三个图表
}
```

**drawChart()** - Canvas 绘制
- 绘制网格背景
- 绘制数据填充区域
- 绘制数据折线
- 绘制数据点
- 绘制 X 轴标签

#### 时间范围响应

```typescript
// 监听时间范围变化
watch(selectedRange, async () => {
  await loadTrendsData();
  await nextTick();
  initCharts();
});
```

---

## 页面UI结构

### 1. **页面标题** 
- 标题: "趋势分析"
- 副标题: "了解您的健康数据变化演进"

### 2. **时间范围选择**
- 4 个按钮：本周、本月、本季度、本年
- 点击自动加载对应时间段数据

### 3. **三大趋势图**
- 运动趋势 (红棕色)
- 饮食趋势 (褐色)
- 睡眠趋势 (深棕色)
- 每个图表显示平均值、最大值等统计

### 4. **关键指标卡片**
- 卡路里消耗 (kcal/周)
- 运动时长 (小时/周)
- 睡眠时长 (小时/周)
- 综合评分 (分)
- 每个卡片显示趋势百分比

### 5. **习惯养成进度**
- 4 个习惯：坚持运动、规律作息、均衡饮食、补充水分
- 显示已坚持天数、进度条、完成百分比

### 6. **本周 vs 上周对比**
- 运动频率对比
- 平均睡眠对比
- 饮食均衡度对比
- 显示增长或下降百分比

---

## 数据流程

### 用户进入趋势分析页面

```
1. 检查健康档案设置是否完成
2. ✅ 完成 → 加载默认时间范围(月)的趋势数据
3. ❌ 未完成 → 显示设置模态框
4. 用户选择时间范围 → 自动加载新数据
5. 前端更新图表 → 展示结果
```

### 后端数据处理

```
请求 → 验证用户 & 时间范围
      ↓
聚合打卡数据 (7-365天) 
      ↓
- 计算统计指标 (平均、最大、总计)
- 生成每日数据
- 对比上一周期
- 计算趋势百分比
- 计算健康评分
      ↓
返回 TrendsData
      ↓
前端更新状态 & 渲染
```

---

## 技术细节

### 数据库查询优化
- 使用 `DATE(created_at)` 日期范围过滤
- 按 `created_at DESC` 排序，降序返回最新数据
- 单次查询获取三个维度的数据

### 统计算法
```typescript
// 平均值计算
avgValue = totalValue / recordCount

// 趋势百分比
trend = ((current - previous) / previous) * 100

// 健康评分(权重加分制)
score = baseLine + exerciseScore + sleepScore + mealScore
```

### Canvas 绘图
- 支持响应式宽度 (600px)
- 固定高度 (300px)
- 动态缩放 Y 轴 (maxValue * 1.2)
- 均匀分布 X 轴标签

---

## API 端点总结

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/analysis/trends` | 获取综合趋势数据 |
| GET | `/api/analysis/trends/detail/:dimension` | 获取特定维度详情 |

---

## 编译状态

✅ **后端** (5 文件):
- trendsService.ts - 无错误
- trendsController.ts - 无错误
- trendsRouters.ts - 无错误
- index.ts - 无错误

✅ **前端** (1 文件):
- TrendsView.vue - 无错误

---

## 区别于 Portrait 页面

| 特性 | Portrait | Trends |
|------|----------|--------|
| 数据来源 | AI 分析 | 打卡数据聚合 |
| 更新方式 | 用户触发刷新 | 自动实时计算 |
| 展示内容 | 整体健康评估 | 历史数据变化 |
| 时间维度 | 当前状态 | 多周期对比 |
| 用户交互 | 一次刷新全部 | 灵活选择时间范围 |

---

## 后续优化方向

1. **高级图表库**
   - 考虑使用 Chart.js 或 ECharts 替代原生 Canvas
   - 支持更多交互 (缩放、拖拽、数据提示)

2. **导出功能**
   - 支持导出为 PDF 或 Excel
   - 生成周期报告

3. **个性化阈值**
   - 用户可设置运动、睡眠、饮食的目标值
   - 自动提醒不达标的维度

4. **预测分析**
   - 基于趋势预测未来健康状态
   - 提供改进建议

---

## 部署

所有代码已编译通过，可直接部署：

```bash
# 后端
cd CDesign-api
npm run build && npm run start

# 前端
cd CDesign-web
npm run dev
```

所有改动已验证，可投入使用。✅
