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
  ChatHistory
} from '../types/aiChat.js';

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
      case 'gpt-4':
      case 'gpt-3.5-turbo':
        return this.callOpenAI(session, userMessage, chatHistory);
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
}
