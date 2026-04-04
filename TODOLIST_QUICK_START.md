# TodoList 快速集成指南

## 🚀 快速开始

### 第 1 步：创建数据库表

```bash
# 方法 1：使用 MySQL 命令行
mysql -u root -p your_database < sql/create_todolist_tables.sql

# 方法 2：在 MySQL 客户端中执行 SQL 脚本
# 复制 sql/create_todolist_tables.sql 的所有内容到 MySQL 客户端并执行
```

### 第 2 步：在主应用中注册路由

编辑 `src/index.ts`：

```typescript
// 导入 todolist 路由
import todoListRouters from './routes/todoListRouters.js';

// 在其他路由定义之后添加
app.use('/api/tasks', todoListRouters);

// 注意：务必在其他更具体的路由之前定义
```

### 第 3 步：测试 API

```bash
# 获取任务列表
curl -X GET "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json"

# 创建任务
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试任务",
    "type": "custom",
    "priority": "high",
    "due_date": "2024-01-20"
  }'
```

---

## 📋 文件清单

已创建的文件：

| 文件 | 说明 |
|------|------|
| `src/types/todolist.ts` | 类型定义（枚举、接口） |
| `src/services/todoListDAL.ts` | 数据访问层（数据库操作） |
| `src/services/todoListService.ts` | 业务逻辑层（业务规则） |
| `src/controllers/todoListController.ts` | 控制器层（API 处理） |
| `src/routes/todoListRouters.ts` | 路由定义 |
| `sql/create_todolist_tables.sql` | 数据库表创建脚本 |
| `md/TODOLIST_IMPLEMENTATION.md` | 实现文档（详细说明） |

---

## 🗄️ 数据库表

已创建 4 张表：

1. **tasks** - 主任务表
   - 存储所有任务信息
   - 支持 5 种任务类型
   - 3 种任务状态

2. **task_completion_records** - 完成记录表
   - 存储任务完成历史
   - 与主表分离（不删除历史数据）
   - 支持提前/准时/迟到统计

3. **checkin_records** - 打卡记录表
   - 同步打卡状态
   - 每用户每类型每天一条记录

4. **task_statistics** - 统计表（可选）
   - 快速查询统计数据
   - 缓存统计结果

---

## 🔌 API 端点概览

### 任务管理

```
GET    /api/tasks              # 获取列表（支持筛选、分页）
GET    /api/tasks/stats        # 获取统计信息
GET    /api/tasks/:id          # 获取详情
POST   /api/tasks              # 创建任务
PUT    /api/tasks/:id          # 更新任务
DELETE /api/tasks/:id          # 删除任务
PATCH  /api/tasks/:id/complete # 标记完成
PATCH  /api/tasks/:id/uncomplete # 标记未完成
```

### 打卡和 AI

```
POST   /api/tasks/sync-checkin        # 同步打卡
POST   /api/tasks/ai-suggestions      # 生成 AI 建议
POST   /api/tasks/:id/accept-suggestion  # 接受建议
POST   /api/tasks/:id/reject-suggestion  # 驳回建议
```

---

## 📊 查询参数示例

### 获取任务列表

```bash
# 基础查询
GET /api/tasks

# 按状态筛选
GET /api/tasks?status=pending

# 按日期筛选
GET /api/tasks?date=2024-01-20

# 按优先级筛选
GET /api/tasks?priority=high

# 搜索
GET /api/tasks?search=文档

# 分页
GET /api/tasks?page=2&limit=10

# 组合查询
GET /api/tasks?status=pending&type=custom&priority=high&page=1&limit=20
```

### 获取统计信息

```bash
# 全部统计
GET /api/tasks/stats

# 按日期统计
GET /api/tasks/stats?date=2024-01-20
```

---

## 📝 请求示例

### 创建任务

```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完成项目文档",
    "description": "编写 API 使用文档",
    "type": "custom",
    "priority": "high",
    "due_date": "2024-01-20",
    "due_time": "18:00",
    "category_icon": "✏️"
  }'
```

### 创建打卡任务

```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "运动打卡",
    "type": "checkin_exercise",
    "priority": "medium",
    "due_date": "2024-01-20",
    "category_icon": "🏃",
    "checkin_type": "exercise",
    "checkin_recurrence": "everyday",
    "checkin_preset": "running"
  }'
```

### 同步打卡

```bash
curl -X POST "http://localhost:3000/api/tasks/sync-checkin" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "exercise",
    "completed": true,
    "checkin_date": "2024-01-20"
  }'
```

### 标记任务完成

```bash
curl -X PATCH "http://localhost:3000/api/tasks/123/complete" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "completed_date": "2024-01-20"
  }'
```

---

## 🔑 认证

所有 API 端点都需要 `Authorization` Header：

```
Authorization: Bearer {JWT_TOKEN}
```

用户 ID 从 JWT Token 中提取（假设在 `req.userId` 或 `req.user.id`）。

如果需要修改获取用户 ID 的方式，编辑 `src/controllers/todoListController.ts` 中的 `getUserIdFromReq` 函数。

---

## ✨ 主要特性

- ✅ **完整的任务管理** - 创建、更新、删除、查询
- ✅ **多种任务类型** - 打卡任务、自定义任务、AI 建议
- ✅ **灵活筛选** - 按状态、日期、优先级、类型搜索
- ✅ **统计分析** - 任务完成率、按类型分类等
- ✅ **打卡同步** - 自动创建/删除打卡对应任务
- ✅ **完成历史** - 记录所有任务完成情况
- ✅ **AI 建议** - 生成个性化建议（模拟实现）
- ✅ **错误处理** - 统一的错误响应格式

---

## 🔧 开发建议

### 本地测试

使用 Postman 或 Thunder Client 导入以下请求进行测试：

```bash
# 基础测试流程
1. POST /api/tasks              # 创建任务
2. GET /api/tasks               # 获取列表
3. GET /api/tasks/:id           # 获取详情
4. PUT /api/tasks/:id           # 更新任务
5. PATCH /api/tasks/:id/complete # 标记完成
6. GET /api/tasks/stats         # 获取统计
```

### 性能考虑

- 大量查询时使用分页（`limit` 不超过 100）
- 统计信息可考虑缓存 5 分钟
- 建议在高峰期使用数据库连接池

### 生产部署

1. 确保数据库表已创建
2. 配置正确的用户认证中间件
3. 添加定时任务检测逾期任务
4. 启用错误日志记录
5. 配置 CORS（如有跨域需求）

---

## 🐛 常见问题

### Q: 如何修改用户 ID 获取方式？

A: 编辑 `src/controllers/todoListController.ts` 中的 `getUserIdFromReq` 函数。

### Q: 如何集成真实的 AI 建议？

A: 编辑 `src/services/todoListService.ts` 中的 `generateAISuggestions` 方法，调用 OpenAI API。

### Q: 如何添加定时任务检测逾期？

A: 安装 `npm install node-cron`，在 `src/index.ts` 中添加定时任务。

### Q: 分页如何实现？

A: 通过 `page` 和 `limit` 查询参数实现，默认 `page=1, limit=20`。

---

## 📚 更多资源

- 完整实现文档: `md/TODOLIST_IMPLEMENTATION.md`
- API 文档: `md/TODOLIST_API_DOCUMENTATION.md`
- 数据库脚本: `sql/create_todolist_tables.sql`

---

## 💡 后续优化

- [ ] 添加缓存层 (Redis)
- [ ] 集成真实 OpenAI API
- [ ] 添加任务重复功能
- [ ] 实现任务提醒
- [ ] 添加协作功能
- [ ] 性能监控

---

祝您使用愉快！如有问题，请参考详细实现文档。
