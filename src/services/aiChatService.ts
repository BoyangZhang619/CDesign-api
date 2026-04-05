/**
 * AI 聊天系统业务逻辑层（Service）
 */

import axios from 'axios';
import { AIChatDAL } from './aiChatDAL.js';
import type {
  AIChatSession,
  AIChatMessage,
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  SendMessageRequest,
  AIResponse,
  DashScopeRequest,
  DashScopeResponse,
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

    return {
      userMessage: savedUserMessage,
      aiMessage: savedAiMessage,
      responseTime
    };
  }

  /**
   * 调用 AI API（支持多个 AI 提供商）
   */
  private static async callAI(
    session: AIChatSession,
    userMessage: string,
    chatHistory: AIChatMessage[],
    modelType: string
  ): Promise<AIResponse> {
    switch (modelType.toLowerCase()) {
      case 'dashscope':
      case 'dashscope_ai_agent':
        return this.callDashScope(session, userMessage, chatHistory);
    //   case 'gpt-4':
    //   case 'gpt-3.5-turbo':
    //     return this.callOpenAI(session, userMessage, chatHistory);
      default:
        throw new Error(`不支持的 AI 模型类型: ${modelType}`);
    }
  }

  /**
   * 调用阿里云 DashScope API（AI Agent）
   */
  private static async callDashScope(
    session: AIChatSession,
    userMessage: string,
    chatHistory: AIChatMessage[]
  ): Promise<AIResponse> {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = session.ai_app_id || process.env.AI_AGENT_APP_ID;
    console.log(`调用 DashScope API，appId: ${appId}, model: ${session.ai_model}`);

    if (!apiKey || !appId) {
      throw new Error('缺少 DashScope API 配置');
    }

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    const requestBody: DashScopeRequest = {
      input: {
        prompt: userMessage
      },
      parameters: {
        temperature: session.temperature || 0.7,
        max_tokens: session.max_tokens || 2048
      }
    };

    try {
      const response = await axios.post<DashScopeResponse>(url, requestBody, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 秒超时
      });

      if (response.status === 200 && response.data.output?.text) {
        return {
          success: true,
          data: {
            text: response.data.output.text,
            finishReason: response.data.output.finishReason,
            modelName: 'dashscope-ai-agent',
            usage: {
              promptTokens: response.data.usage?.input_tokens || 0,
              completionTokens: response.data.usage?.output_tokens || 0,
              totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
            }
          }
        };
      } else {
        throw new Error(`DashScope 返回错误: ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`DashScope API 调用失败: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * 调用 OpenAI API（预留实现）
   */
  private static async callOpenAI(
    session: AIChatSession,
    userMessage: string,
    chatHistory: AIChatMessage[]
  ): Promise<AIResponse> {
    // TODO: 实现 OpenAI 调用
    throw new Error('暂不支持 OpenAI');
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
    console.log('[sendMessageStream] 用户消息已保存:', userMessage.id);

    // 4. 获取聊天历史
    const chatHistory = await AIChatDAL.getSessionAllMessages(sessionId);
    console.log('[sendMessageStream] 聊天历史:', chatHistory.length, '条消息');

    // 5. 调用 AI 流式方法
    let totalOutputTokens = 0;
    let aiContent = '';
    const startTime = Date.now();

    try {
      console.log('[sendMessageStream] 开始调用 AI 流式...');
      await this.callAIStream(session, content, chatHistory, onChunk, (tokens) => {
        totalOutputTokens = tokens;
      }, (chunk) => {
        aiContent += chunk;
      });
      console.log('[sendMessageStream] AI 流式完成，内容长度:', aiContent.length);

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
      console.log('[sendMessageStream] AI 消息已保存:', aiMessage.id);

      // 7. 更新会话统计
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
  private static async callAIStream(
    session: any,
    userMessage: string,
    chatHistory: any[],
    onChunk: (chunk: string) => void,
    onTokens: (tokens: number) => void,
    onContent: (content: string) => void
  ): Promise<void> {
    const model = session.ai_model || 'dashscope';

    if (model === 'dashscope') {
      return this.callDashScopeStream(session, userMessage, chatHistory, onChunk, onTokens, onContent);
    } else if (model === 'gpt-4' || model === 'gpt-3.5-turbo') {
      throw new Error('OpenAI 流式支持开发中');
    } else {
      throw new Error(`不支持的 AI 模型: ${model}`);
    }
  }

  /**
   * DashScope 流式调用
   */
  private static async callDashScopeStream(
    session: any,
    userMessage: string,
    chatHistory: any[],
    onChunk: (chunk: string) => void,
    onTokens: (tokens: number) => void,
    onContent: (content: string) => void
  ): Promise<void> {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    const appId = session.ai_app_id || process.env.AI_AGENT_APP_ID;
    console.log(`调用 DashScope 流式 API，appId: ${appId}, model: ${session.ai_model}`);
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    // 构建请求体（DashScope 的流式模式）
    // 根据官方文档，三种流式输出模式：
    // 1. message_format（推荐）- 在 message 字段结构化的流式返回，最后一块包含 text 字段
    // 2. full_thoughts - 在 thoughts 字段流式返回所有节点执行详情（用于调试）
    // 3. agent_format - 直接在 text 字段中流式返回节点输出
    // 
    // 我们使用 message_format，它能在最后返回完整的 text 内容
    const requestBody = {
      input: { prompt: userMessage },
      parameters: {
        flow_stream_mode: 'message_format', // 推荐使用，能获得结构化的流式返回
        temperature: session.temperature || 0.7,
        max_tokens: session.max_tokens || 2048
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable' // 启用 SSE 流式响应
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

      console.log('[DashScope SSE流式] 开始读取响应流');

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
              
              // 最后一块会包含完整的 text 字段
              if (json.output?.text) {
                chunkCount++;
                onChunk(json.output.text);
                onContent(json.output.text);
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
            const json = JSON.parse(data);
            
            if (json.output?.text) {
              chunkCount++;
              onChunk(json.output.text);
              onContent(json.output.text);
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
            // 忽略缓冲区解析错误
          }
        }
      }

      onTokens(totalTokens);
    } catch (error) {
      throw error;
    }
  }
}
