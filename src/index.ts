import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import healthInfoRouters from './routes/healthInfoRouters.js';
import dailyCheckinRouters from './routes/dailyCheckinRouters.js';
import mealCheckinRouters from './routes/mealCheckinRouters.js';
import sleepCheckinRouters from './routes/sleepCheckinRouters.js';

const allowOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://cdw.zbyblq.xin'
];
const app = express();
const PORT = Number(env.port || 8080);
app.set('trust proxy', 1);
app.use(cors({
    origin: allowOrigins,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
// app.use((req, res, next) => { consoleLog(req); next(); });

app.use('/', rateLimit({ windowMs: 60000, max: 60 })); // 全局速率限制，每分钟每个IP最多60次请求
app.use('/api', rateLimit({ windowMs: 60000, max: 20 })); // /api路径下的速率限制，每分钟每个IP最多20次请求
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health-info', healthInfoRouters);
app.use('/api/daily-checkin', dailyCheckinRouters);
app.use('/api/meal-checkin', mealCheckinRouters);
app.use('/api/sleep-checkin', sleepCheckinRouters);

app.get('/', (_, res) => { res.send('why are you here?'); });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================正在监听端口${PORT}========================================================`);
})

function consoleLog(req: express.Request) {
    console.log('=============================== NEW REQUEST ===============================');
    console.log('TIME:', new Date().toISOString());
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