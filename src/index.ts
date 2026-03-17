import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import sqlRouter from './routes/sql.js';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

const allowOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://cdw.zbyblq.xin'
];
dotenv.config();
const app = express();
const PORT = Number(env.port || 8080);
app.use(cors({
    origin: allowOrigins,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
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
    next();
});
app.use('/', (req, res) => { res.send('why are you here?'); });
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sql', sqlRouter);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`正在监听端口${PORT}`);
})