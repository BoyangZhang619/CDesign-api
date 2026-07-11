/**
 * FastAPI AI 网关客户端
 *
 * 所有 LLM 模型调用统一通过此模块转发到 sanatura-fastapi 服务。
 * Zeabur 同项目内通过服务名互访（如 http://sanatura-fastapi:8000）。
 */
import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// ── 非流式对话 ─────────────────────────────────────────────

export interface FastAPIChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'text' | 'json_object' };
  user_id: number;
}

export interface FastAPIChatResponse {
  success: boolean;
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function fastapiChat(req: FastAPIChatRequest): Promise<FastAPIChatResponse> {
  const { data } = await axios.post<FastAPIChatResponse>(
    `${FASTAPI_URL}/v1/chat/completions`,
    req,
    { timeout: 120000 },
  );
  return data;
}

// ── 流式对话 ───────────────────────────────────────────────

export async function fastapiChatStream(req: FastAPIChatRequest): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const resp = await fetch(`${FASTAPI_URL}/v1/chat/completions/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`FastAPI stream ${resp.status}: ${text || resp.statusText}`);
    }
    return resp;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('AI 服务响应超时（3分钟），请重试');
    }
    throw new Error(`${FASTAPI_URL}/stream 连接失败: ${err.message || err}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── 健康检查 ───────────────────────────────────────────────

export async function fastapiHealth(): Promise<boolean> {
  try {
    const { data } = await axios.get(`${FASTAPI_URL}/health`, { timeout: 5000 });
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
