# CDesign API

后端API服务，提供AI对话、SQL执行等功能。基于Express框架，集成OpenAI接口和MySQL数据库。

## 功能特性

- **AI对话服务**：支持纯文本输入输出（普通模式和流式模式）
- **SQL执行**：动态执行SQL查询，支持参数化查询
- **JWT认证**：基于JSON Web Token的用户认证机制
- **加密安全**：集成bcrypt密码加密和数据安全保护
- **CORS支持**：跨域资源共享配置
- **环境隔离**：完整的环境变量管理

## 技术栈

- **运行时**：Node.js
- **框架**：Express 5.x
- **语言**：TypeScript 5.x
- **数据库**：MySQL 2.x
- **AI服务**：OpenAI（通过阿里云DashScope）
- **认证**：jsonwebtoken
- **加密**：bcrypt
- **开发工具**：tsx, ts-node

## 项目结构

```
src/
├── index.ts              # 应用入口，Express服务器配置
├── config/
│   ├── env.ts           # 环境变量配置
│   └── security.ts      # 安全配置
├── routes/
│   ├── chat.ts          # AI对话路由
│   └── sql.ts           # SQL执行路由
├── services/
│   ├── openai.ts        # OpenAI客户端配置
│   └── tokenService.ts  # JWT令牌生成与验证
└── util/
    ├── db.ts            # 数据库连接与查询
    ├── hash.ts          # 密码加密工具
    └── response.ts      # 响应格式处理
```

## API路由

### 聊天路由 (`/api/chat`)

- `POST /api/chat/ptio/common` - 普通文本对话（一次性响应）
- `POST /api/chat/ptio/stream` - 流式文本对话（实时响应流）

请求体示例：
```json
{
  "model": "qwen3.5-flash",
  "language": "Chinese",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ]
}
```

### SQL路由 (`/api/sql`)

- `POST /api/sql` - 执行SQL查询

请求体示例：
```json
{
  "sql": "SELECT * FROM users WHERE id = ?",
  "params": [1]
}
```

## 环境变量配置

创建`.env`文件并配置以下变量：

```env
# 服务器
PORT=8080
NODE_ENV=development

# MySQL数据库
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=cdesign

# JWT令牌
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# AI服务
DASHSCOPE_API_KEY=your_dashscope_api_key

# 跨域
CLIENT_ORIGIN=http://localhost:3000
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

服务器将在端口 8080 启动，监听所有网络接口 (0.0.0.0)

### 构建

```bash
npm run build
```

### 生产运行

```bash
npm start
```

## 核心模块说明

### 数据库模块 (`src/util/db.ts`)

- 使用MySQL2连接池管理数据库连接
- 支持参数化查询防止SQL注入
- 错误处理和连接管理

### 认证模块 (`src/services/tokenService.ts`)

- 生成和验证JWT令牌
- 支持访问令牌和刷新令牌
- 可配置过期时间

### AI服务模块 (`src/services/openai.ts`)

- 集成阿里云DashScope作为OpenAI兼容API
- 支持文本模型交互

## 开发说明

- 使用TypeScript编写，启用严格模式
- 遵循ES模块系统
- 所有API响应通过统一的响应处理工具格式化
- 支持流式响应用于实时数据传输

## 依赖许可

- ISC License

## 作者

zyx, zby, zzl, wyh 等
