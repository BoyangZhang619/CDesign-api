import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import process from 'process';
import chatRouter from './routes/chat.js';
import sqlRouter from './routes/sql.js';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

dotenv.config();
const app = express();
const PORT = Number(env.port || 8080);
app.use(cors({
    origin: env.clientOrigin,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/', (req, res) => { res.send('why are you here?'); });
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sql', sqlRouter);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`正在监听端口${PORT}`);
})