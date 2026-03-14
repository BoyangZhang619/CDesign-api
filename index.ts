import express from 'express';
// @ts-ignore
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.PORT;
const app = express();

app.use(express.json());

app.get('/',(req,res) => {
    res.json({"zby":"kind"});
})

app.listen(PORT,() => {
    console.log(`正在监听端口${PORT}`);
})