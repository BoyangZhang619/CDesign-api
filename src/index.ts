import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
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
import characterAvatarRouters from './routes/characterAvatarRouters.js';
import todolistRouters from './routes/todoListRouters.js';
import taskCompletionHistoryRouters from './routes/taskCompletionHistoryRouters.js';

import { getCurrentDateTimeString } from './util/dateTime.js';

const fixedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://cdw.zbyblq.xin',
    'https://localhost'
];
// 匹配规则：以 https:// 开头，以 .cdesign-web.pages.dev 结尾
const cfPattern = /^https:\/\/.*\.cdesign-web\.pages\.dev$/;

const app = express();
const PORT = Number(env.port || 8080);
app.set('trust proxy', 1);
app.use(cors({
    origin: (origin, callback) => {
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
    console.log('\n🚀 [/api/tasks 中间件] 请求进入');
    console.log('METHOD:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Query:', req.query);
    console.log('Headers:', {
        authorization: req.headers.authorization ? '✅ 存在' : '❌ 缺失',
        'content-type': req.headers['content-type']
    });
    next();
});

// app.use('/', rateLimit({ windowMs: 60000, max: 60 })); // 全局速率限制，每分钟每个IP最多60次请求
// app.use('/api', rateLimit({ windowMs: 60000, max: 20 })); // /api路径下的速率限制，每分钟每个IP最多20次请求
app.use('/api/auth', authRoutes);
app.use('/api/character-avatar', characterAvatarRouters);
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
// app.use('/api/agg',(req,res) =>{next();});

app.get('/', (_, res) => { res.send('why are you here?'); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================正在监听端口${PORT}========================================================`);
})

function consoleLog(req: express.Request) {
    console.log('=============================== NEW REQUEST ===============================');
    console.log('TIME:', getCurrentDateTimeString());
    console.log('METHOD:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('ORIGIN:', req.headers.origin);
    console.log('REFERER:', req.headers.referer);
    console.log('HOST:', req.headers.host);
    console.log('IP:', req.ip);
    console.log('HEADERS:', req.headers);
    console.log('QUERY:', req.query);
    console.log('BODY:', req.body);
    console.log('COOKIES:', req.cookies);
    console.log('===========================================================================');
}