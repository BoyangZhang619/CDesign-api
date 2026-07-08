import { dbQuery } from '../config/db.js'
// import type { Request, Response } from 'express';
// import { sendError, sendResult } from '../util/response.js';
// import { openai_app } from "../services/openai.js";
import axios from 'axios';
// import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
// import { getUserIdFromReq, getUserById } from './sharedMethods.js';

async function callDashScope() {
    // 若没有配置环境变量，可用百炼API Key将下行替换为：apiKey='sk-xxx'。但不建议在生产环境中直接将API Key硬编码到代码中，以减少API Key泄露风险。
    const apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.OPENAI_API_KEY ;
    const appId = process.env.AI_AGENT_APP_ID;

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    const data = {
        input: {
            prompt: "你是谁？"
        },
        parameters: {},
        debug: {}
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            console.log(`${response.data.output.text}`);
        } else {
            console.log(`request_id=${response.headers['request_id']}`);
            console.log(`code=${response.status}`);
            console.log(`message=${response.data.message}`);
        }
    } catch (err: unknown) {
        const error = err as any;
        console.error(`Error calling DashScope: ${error.message}`);
        if (error.response) {
            console.error(`Response status: ${error.response.status}`);
            console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

callDashScope();