/**
 * AI 聊天系统业务逻辑层（Service）
 *
 * ⚠️ 2026-07-11 重构: 所有 LLM 调用已迁移至 sanatura-fastapi (DeepSeek)。
 *    原有 callDashScope / callOpenAI 方法已雪藏为 _legacyCallDashScope / _legacyCallOpenAI。
 *    新增 fastapiCallLLM / fastapiCallLLMStream 方法。
 */
import { AIChatDAL } from './aiChatDAL.js';
import { fastapiChat, fastapiChatStream } from './fastapiClient.js';
import type {
  AIChatSession,
  AIChatMessage,
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  SendMessageRequest,
  AIResponse,
  MessageRole,
  ChatQueryParams,
  ChatHistory,
  ContentType,
  FinishReason
} from '../types/aiChat.js';
import { ContentType as ContentTypeEnum, FinishReason as FinishReasonEnum, MessageRole as MessageRoleEnum } from '../types/aiChat.js';

export class AIChatService {
  /**
   * 创建新的聊天会话
   */
  static async createSession(userId: number, sessionData: CreateChatSessionRequest): Promise<AIChatSession> {
    if (!sessionData.session_name || sessionData.session_name.trim().length === 0) {
      sessionData.session_name = '新聊天';
    }

    if (sessionData.session_name.length > 100) {
      throw new Error('会话名称长度不能超过 100 个字符');
    }

    return AIChatDAL.createSession(userId, sessionData);
  }

  /**
   * 获取会话信息
   */
  static async getSession(userId: number, sessionId: number): Promise<AIChatSession | null> {
    return AIChatDAL.getSessionById(userId, sessionId);
  }

  /**
   * 获取用户的所有会话
   */
  static async getUserSessions(userId: number, params: ChatQueryParams): Promise<any> {
    return AIChatDAL.getUserSessions(userId, params);
  }

  /**
   * 更新会话信息
   */
  static async updateSession(
    userId: number,
    sessionId: number,
    updateData: UpdateChatSessionRequest
  ): Promise<AIChatSession | null> {
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    return AIChatDAL.updateSession(userId, sessionId, updateData);
  }

  /**
   * 删除会话
   */
  static async deleteSession(userId: number, sessionId: number): Promise<boolean> {
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    return AIChatDAL.deleteSession(userId, sessionId);
  }

  /**
   * 发送消息并获取 AI 响应
   */
  static async sendMessage(
    userId: number,
    sessionId: number,
    userMessage: string
  ): Promise<{
    userMessage: AIChatMessage;
    aiMessage: AIChatMessage;
    responseTime: number;
  }> {
    if (!userMessage || userMessage.trim().length === 0) {
      throw new Error('消息内容不能为空');
    }

    if (userMessage.length > 10000) {
      throw new Error('消息内容长度不能超过 10000 个字符');
    }

    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    if (userMessage.startsWith('[有关健康问题的提问/web使用辅助]')) {
      userMessage = userMessage.replace('[有关健康问题的提问/web使用辅助]', '').trim();
    }
    // 记录用户消息
    const savedUserMessage = await AIChatDAL.addMessage(
      sessionId,
      userId,
      'user' as MessageRole,
      userMessage
    );

    // 获取聊天历史（用于构建上下文）
    const chatHistory = await AIChatDAL.getSessionAllMessages(sessionId);

    // 调用 AI API
    const startTime = Date.now();
    let aiResponse: AIResponse;

    try {
      aiResponse = await this.callAI(
        session,
        userMessage,
        chatHistory,
        session.ai_model
      );
    } catch (error) {
      // 记录错误消息
      const errorMessage = error instanceof Error ? error.message : String(error);
      await AIChatDAL.addMessage(
        sessionId,
        userId,
        'assistant' as MessageRole,
        '',
        {
          error_message: errorMessage,
          finish_reason: 'error' as any
        }
      );

      throw error;
    }

    const responseTime = Date.now() - startTime;

    // 记录 AI 响应
    const savedAiMessage = await AIChatDAL.addMessage(
      sessionId,
      userId,
      'assistant' as MessageRole,
      aiResponse.data?.text || '',
      {
        model_name: aiResponse.data?.modelName || session.ai_model,
        finish_reason: (aiResponse.data?.finishReason || 'stop') as any,
        response_time_ms: responseTime,
        input_tokens: aiResponse.data?.usage?.promptTokens || 0,
        output_tokens: aiResponse.data?.usage?.completionTokens || 0,
        total_tokens: aiResponse.data?.usage?.totalTokens || 0
      }
    );

    // 如果 AI 返回了 session_id，保存到数据库以支持多轮对话记忆
    if (aiResponse.data?.sessionId) {
      await AIChatDAL.updateSession(userId, sessionId, {
        dashscope_session_id: aiResponse.data.sessionId
      });
    }

    return {
      userMessage: savedUserMessage,
      aiMessage: savedAiMessage,
      responseTime
    };
  }

  /**
   * 调用 AI API — 统一入口，通过 FastAPI 网关调用 DeepSeek
   */
  private static async callAI(
    session: AIChatSession,
    _userMessage: string,
    chatHistory: AIChatMessage[],
    _modelType: string
  ): Promise<AIResponse> {
    // 构建标准 messages 数组（从历史消息中提取）
    const messages = chatHistory
      .filter(m => m.role !== 'system' || chatHistory.indexOf(m) === 0)
      .map(m => ({ role: m.role, content: m.content }));

    // 如果有 system prompt，确保放在第一条
    if (session.system_prompt && messages.length > 0 && messages[0].role !== 'system') {
      messages.unshift({ role: 'system' as any, content: session.system_prompt });
    }

    const result = await fastapiChat({
      messages,
      model: session.ai_model === 'deepseek-chat' ? 'deepseek-chat' : undefined,
      temperature: Number(session.temperature) || 0.7,
      max_tokens: session.max_tokens || 2048,
      user_id: session.user_id,
    });

    return {
      success: true,
      data: {
        text: result.content,
        finishReason: 'stop',
        modelName: result.model,
        sessionId: undefined,  // DeepSeek 无 session_id 概念，多轮通过 messages 维护
        usage: {
          promptTokens: result.usage.prompt_tokens,
          completionTokens: result.usage.completion_tokens,
          totalTokens: result.usage.total_tokens,
        },
      },
    };
  }

  /**
   * 获取聊天历史
   */
  static async getChatHistory(userId: number, sessionId: number, limit: number = 50): Promise<AIChatMessage[]> {
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    return AIChatDAL.getSessionMessages(sessionId, limit);
  }

  /**
   * 编辑消息
   */
  static async editMessage(userId: number, messageId: number, newContent: string): Promise<AIChatMessage | null> {
    // 验证消息所有权（可以通过 user_id 验证）
    const message = await AIChatDAL.getMessageById(messageId);
    if (!message || message.user_id !== userId) {
      throw new Error('消息不存在或无权限');
    }

    await AIChatDAL.editMessage(messageId, newContent);
    return AIChatDAL.getMessageById(messageId);
  }

  /**
   * 删除消息
   */
  static async deleteMessage(userId: number, messageId: number): Promise<boolean> {
    const message = await AIChatDAL.getMessageById(messageId);
    if (!message || message.user_id !== userId) {
      throw new Error('消息不存在或无权限');
    }

    return AIChatDAL.deleteMessage(messageId);
  }

  /**
   * 获取用户的 Token 统计
   */
  static async getUserStats(userId: number): Promise<any> {
    return AIChatDAL.getUserTokenStats(userId);
  }

  /**
   * 清空会话
   */
  static async clearSession(userId: number, sessionId: number): Promise<boolean> {
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    return AIChatDAL.clearSessionMessages(sessionId);
  }

  /**
   * 搜索消息
   */
  static async searchMessages(userId: number, keyword: string, sessionId?: number): Promise<AIChatMessage[]> {
    if (!keyword || keyword.trim().length === 0) {
      throw new Error('搜索关键词不能为空');
    }

    if (keyword.length > 100) {
      throw new Error('搜索关键词长度不能超过 100 个字符');
    }

    return AIChatDAL.searchMessages(userId, keyword, sessionId);
  }

  /**
   * 标记会话为星标
   */
  static async toggleSessionStar(userId: number, sessionId: number): Promise<AIChatSession | null> {
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    return AIChatDAL.updateSession(userId, sessionId, {
      is_starred: !session.is_starred
    });
  }

  /**
   * 流式发送消息（Server-Sent Events）
   * 用于实时流式响应
   */
  static async sendMessageStream(
    userId: number,
    sessionId: number,
    content: string,
    req: any, // 传递 req 对象以获取请求相关信息（如 headers）
    onChunk: (chunk: string) => void
  ): Promise<{ userMessageId: number; aiMessageId: number; totalTokens: number }> {
    // 1. 验证内容
    if (!content || content.trim().length === 0) {
      throw new Error('消息内容不能为空');
    }
    if (content.length > 10000) {
      throw new Error('消息内容过长（最多 10000 字符）');
    }

    // 2. 获取并验证会话
    const session = await AIChatDAL.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error('会话不存在或无权限');
    }

    // 3. 保存用户消息
    const userMessage = await AIChatDAL.addMessage(
      sessionId,
      userId,
      'user' as any,
      content,
      { content_type: ContentTypeEnum.TEXT }
    );

    // 4. 获取聊天历史
    const chatHistory = await AIChatDAL.getSessionAllMessages(sessionId);

    // 5. 调用 AI 流式方法
    let totalOutputTokens = 0;
    let aiContent = '';
    let returnedSessionId: string | undefined; // 用于保存返回的 session_id
    const startTime = Date.now();

    try {
      await this.callAIStream(
        session,
        content,
        chatHistory,
        req,
        onChunk,
        (tokens) => {
          totalOutputTokens = tokens;
        },
        (chunk) => {
          aiContent += chunk;
        },
        (sessionId) => {
          returnedSessionId = sessionId; // 捕获返回的 session_id
        }
      );

      const responseTime = Date.now() - startTime;

      // 6. 保存 AI 响应消息
      const aiMessage = await AIChatDAL.addMessage(
        sessionId,
        userId,
        'assistant' as any,
        aiContent,
        {
          content_type: ContentTypeEnum.TEXT,
          input_tokens: 0,
          output_tokens: totalOutputTokens,
          total_tokens: totalOutputTokens,
          model_name: session.ai_model,
          finish_reason: FinishReasonEnum.STOP as any,
          response_time_ms: responseTime
        }
      );

      // 7. 如果返回了 session_id，保存到数据库以支持多轮对话记忆
      if (returnedSessionId) {
        await AIChatDAL.updateSession(userId, sessionId, {
          dashscope_session_id: returnedSessionId
        });
      }

      // 8. 更新会话统计
      await AIChatDAL.updateSessionStats(sessionId, {
        output_tokens: totalOutputTokens,
        total_tokens: totalOutputTokens
      } as any);

      return {
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id,
        totalTokens: totalOutputTokens
      };
    } catch (error) {
      throw new Error(`AI 流式调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 调用 AI 流式接口
   */
  /**
   * 调用 AI 流式接口 — 通过 FastAPI 网关调用 DeepSeek
   */
  private static async callAIStream(
    session: any,
    _userMessage: string,
    chatHistory: any[],
    _req: any,
    onChunk: (chunk: string) => void,
    onTokens: (tokens: number) => void,
    onContent: (content: string) => void,
    onSessionId?: (sessionId: string) => void
  ): Promise<void> {
    const messages = chatHistory
      .filter((m: any) => m.role !== 'system' || chatHistory.indexOf(m) === 0)
      .map((m: any) => ({ role: m.role, content: m.content }));

    if (session.system_prompt && messages.length > 0 && messages[0].role !== 'system') {
      messages.unshift({ role: 'system' as any, content: session.system_prompt });
    }

    const fastStream = await fastapiChatStream({
      messages,
      temperature: Number(session.temperature) || 0.7,
      max_tokens: session.max_tokens || 2048,
      user_id: session.user_id,
    });

    const reader = fastStream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let totalTokens = 0;
    let accumulatedContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'content') {
              onChunk(event.content);
              accumulatedContent += event.content;
              onContent(event.content);
            } else if (event.type === 'done' && event.usage) {
              totalTokens = event.usage.total_tokens || 0;
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Stream error');
            }
          } catch (e: any) {
            if (e.message?.includes('Stream error')) throw e;
          }
        }
      }
    } finally {
      reader.releaseLock();
      onTokens(totalTokens);
    }
  }

  /**
   * ⚠️ 已雪藏 — 原 DashScope 流式调用。
   * 所有流式 LLM 调用已迁移至 callAIStream → fastapiChatStream → FastAPI → DeepSeek。
   */
  /* SNOW-COVERED: 原 callDashScopeStream 方法体已移除，见 git history
  private static async _legacyCallDashScopeStream(
    session: any,
    userMessage: string,
    chatHistory: any[],
    req: any, // 传递 req 对象以获取请求相关信息（如 headers）
    onChunk: (chunk: string) => void,
    onTokens: (tokens: number) => void,
    onContent: (content: string) => void,
    onSessionId?: (sessionId: string) => void // 新增：回调函数处理返回的 session_id
  ): Promise<void> {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = session.ai_app_id || process.env.AI_AGENT_APP_ID;
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
    const authInfo = req.headers.authorization.split(' ')[1]; // 提取 Bearer token 作为访问令牌

    // 构建请求体（DashScope 的流式模式）
    // 根据官方文档，三种流式输出模式：
    // 1. message_format（推荐）- 在 message 字段结构化的流式返回，最后一块包含 text 字段
    // 2. full_thoughts - 在 thoughts 字段流式返回所有节点执行详情（用于调试）
    // 3. agent_format - 直接在 text 字段中流式返回节点输出
    // 
    // 我们使用 message_format，它能在最后返回完整的 text 内容
    console.log('[callDashScopeStream] auth:', authInfo);
    const requestBody = {
      input: {
        prompt: userMessage,
        // 如果已有 session_id，传递用于维持对话上下文（多轮对话记忆）
        ...(session.dashscope_session_id && { session_id: session.dashscope_session_id }),
        biz_params: {
          access_token: authInfo
        }
      },
      parameters: {
        flow_stream_mode: 'message_format', // 推荐使用，能获得结构化的流式返回
        temperature: session.temperature || 0.7,
        max_tokens: session.max_tokens || 2048,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable', // 启用 SSE 流式响应
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DashScope API 错误: ${error.message || response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalTokens = 0;
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE 格式：data: {json}\n\n
        // 按换行符分割，逐行处理
        const lines = buffer.split('\n');

        // 保留最后一个不完整的行
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          // SSE 流式格式检查：data: {json}
          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim();

            // 跳过空行和心跳
            if (!data || data === ':') {
              continue;
            }

            try {
              const json = JSON.parse(data);
              console.log('[callDashScopeStream] 收到 DashScope 响应:', JSON.stringify(json).substring(0, 100));

              // 最后一块会包含完整的 text 字段
              if (json.output?.text) {
                chunkCount++;
                console.log('[callDashScopeStream] 调用 onChunk，内容长度:', json.output.text.length);
                onChunk(json.output.text);
                onContent(json.output.text);
              } else {
                console.log('[callDashScopeStream] 没有 text 字段在响应中');
              }

              // 处理返回的 session_id（用于多轮对话记忆）
              if (json.output?.session_id && onSessionId) {
                console.log('[callDashScopeStream] 保存 session_id:', json.output.session_id);
                onSessionId(json.output.session_id);
              }

              // 提取 Token 信息
              if (json.usage?.output_tokens) {
                totalTokens = json.usage.output_tokens;
              }
              // Token 信息可能在数组中（多模型情况）
              else if (Array.isArray(json.usage?.models)) {
                for (const model of json.usage.models) {
                  if (model.output_tokens) {
                    totalTokens += model.output_tokens;
                  }
                }
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }

      // 处理缓冲区中可能剩余的最后一块数据
      if (buffer.trim() && buffer.startsWith('data:')) {
        const data = buffer.slice(5).trim();
        if (data) {
          try {
            console.log('[callDashScopeStream] 处理缓冲区剩余数据');
            const json = JSON.parse(data);

            if (json.output?.text) {
              chunkCount++;
              console.log('[callDashScopeStream] 从缓冲区调用 onChunk，内容长度:', json.output.text.length);
              onChunk(json.output.text);
              onContent(json.output.text);
            }

            // 处理返回的 session_id
            if (json.output?.session_id && onSessionId) {
              console.log('[callDashScopeStream] 从缓冲区保存 session_id:', json.output.session_id);
              onSessionId(json.output.session_id);
            }

            if (json.usage?.output_tokens) {
              totalTokens = json.usage.output_tokens;
            } else if (Array.isArray(json.usage?.models)) {
              for (const model of json.usage.models) {
                if (model.output_tokens) {
                  totalTokens += model.output_tokens;
                }
              }
            }
          } catch (e) {
            console.error('[callDashScopeStream] 缓冲区解析错误:', e);
          }
        }
      }

      console.log('[callDashScopeStream] 流式完成，chunkCount:', chunkCount, 'totalTokens:', totalTokens);
      onTokens(totalTokens);
    } catch (error) {
      throw error;
    }
  }
  */
}
