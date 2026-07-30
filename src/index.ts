import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import pool, { dbQuery } from './config/db.js';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { aiChatRouters } from './routes/aiChatRouters.js';
import healthInfoRouters from './routes/healthInfoRouters.js';
import portraitRouters from './routes/portraitRouters.js';
import trendsRouters from './routes/trendsRouters.js';
import dailyCheckinRouters from './routes/checkin/dailyCheckinRouters.js';
import mealCheckinRouters from './routes/checkin/mealCheckinRouters.js';
import sleepCheckinRouters from './routes/checkin/sleepCheckinRouters.js';
import exerciseCheckinRouters from './routes/checkin/exerciseCheckinRouters.js';
import historyRouters from './routes/historyRouters.js';
import characterAvatarRouters from './routes/avatarRouters.js';
import pixelAvatarRouters from './routes/pixelAvatarRouters.js';
import todolistRouters from './routes/todoListRouters.js';
import taskCompletionHistoryRouters from './routes/taskCompletionHistoryRouters.js';
import sleepQualityRouters from './routes/sleepQualityRouters.js';
// [DEPRECATED] avatarRouters 已替换为 pixelAvatarRouters（用户头像功能合并到 user_avatar 表）
import { initializeSleepQualityModel } from './services/sleepQualityPredictService.js';

import { getCurrentDateTimeString } from './util/dateTime.js';

const fixedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.1.4:5173',
    'http://192.168.1.4:5174',
    'http://192.168.1.8:5173',
    'http://172.27.51.67:5173',
    'http://192.168.2.119:5173',
    'https://cdesign-web.pages.dev',
    'https://cdw.zbyblq.xin',
    'https://localhost',
    'http://localhost',
    'https://sanatura.pages.dev',
    'https://sanatura.zbyblq.xin',
];
// 匹配规则：以 https:// 开头，以 .sanatura.pages.dev 结尾，以便于不同版本cf部署的哈希子域名不被cors墙
const cfPattern = /^https:\/\/.*\.sanatura\.pages\.dev$/;

const app = express();
const PORT = Number(env.port || 8080);
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false, // CSP 由前端构建时处理
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || fixedOrigins.includes(origin) || cfPattern.test(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => { consoleLog(req); next(); });

// 为 /api/tasks 添加专门的日志中间件
app.use('/api/tasks', (req, res, next) => {
    console.log('\n[/api/tasks 中间件] 请求进入');
    console.log('METHOD:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Query:', req.query);
    console.log('Headers:', {
        authorization: req.headers.authorization ? '存在' : '缺失',
        'content-type': req.headers['content-type']
    });
    next();
});

// 全局速率限制：每分钟每个IP最多60次请求
app.use('/', rateLimit({ windowMs: 60000, max: 60, standardHeaders: true, legacyHeaders: false }));
// 认证接口更严格的速率限制：每分钟每个IP最多10次请求（防暴力破解）
app.use('/api/auth', rateLimit({ windowMs: 60000, max: 10, standardHeaders: true, legacyHeaders: false, message: { success: false, message: '请求过于频繁，请稍后再试', data: null } }));
app.use('/api/auth', authRoutes);
app.use('/api/avatars/user', characterAvatarRouters);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-chat', aiChatRouters);
app.use('/api/health-info', healthInfoRouters);
app.use('/api/health', portraitRouters);
app.use('/api/analysis', trendsRouters);
app.use('/api/daily-checkin', dailyCheckinRouters);
app.use('/api/meal-checkin', mealCheckinRouters);
app.use('/api/sleep-checkin', sleepCheckinRouters);
app.use('/api/exercise-checkin', exerciseCheckinRouters);
app.use('/api/history', historyRouters);
app.use('/api/tasks', todolistRouters);
app.use('/api/task-completion-history', taskCompletionHistoryRouters);
app.use('/api/sleep-quality', sleepQualityRouters);
app.use('/api/avatars', pixelAvatarRouters);

// 健康检查端点
app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_, res) => { res.send('why are you here?'); });

// 全局错误处理中间件（必须在所有路由之后注册）
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
    res.status(err.status || 500).json({
        success: false,
        message: env.nodeEnv === 'production' ? '服务器内部错误' : err.message,
        data: null
    });
});

// 初始化 ONNX 睡眠质量模型（异步，不阻塞服务器启动）
initializeSleepQualityModel().catch(err => {
    console.warn('睡眠质量模型初始化失败，相关 API 不可用:', err.message);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================正在监听端口${PORT}========================================================`);
});

// 优雅关闭
function gracefulShutdown(signal: string) {
    console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
    server.close(() => {
        console.log('HTTP 服务器已关闭');
        pool.end().then(() => {
            console.log('数据库连接池已关闭');
            process.exit(0);
        }).catch(() => {
            process.exit(0);
        });
    });
    // 超时强制退出
    setTimeout(() => {
        console.error('优雅关闭超时，强制退出');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

function consoleLog(req: express.Request) {
    if (env.nodeEnv === 'production') {
        // 生产环境仅记录基本请求信息，不记录敏感数据
        console.log(`[${getCurrentDateTimeString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);
        return;
    }
    // 开发环境记录完整请求信息
    console.log('=============================== NEW REQUEST ===============================');
    console.log('   TIME:', getCurrentDateTimeString());
    console.log(' METHOD:', req.method);
    console.log('    URL:', req.originalUrl);
    console.log(' ORIGIN:', req.headers.origin);
    console.log('REFERER:', req.headers.referer);
    console.log('   HOST:', req.headers.host);
    console.log('     IP:', req.ip);
    console.log('  QUERY:', req.query);
    console.log('   BODY:', req.body);
    console.log('===========================================================================');
}