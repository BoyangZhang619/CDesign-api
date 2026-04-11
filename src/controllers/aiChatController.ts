/**
 * AI 聊天系统控制器
 */

import { Request, Response } from 'express';
import { AIChatService } from '../services/aiChatService.js';
import { sendResult, sendError } from '../util/response.js';
import type {
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  SendMessageRequest,
  ChatQueryParams
} from '../types/aiChat.js';

// 获取用户 ID（从认证中间件获取）
function getUserIdFromReq(req: Request): number {
  const userId = (req as any).user.userId;
  if (!userId) {
    throw new Error('未授权：缺少用户信息');
  }
  return Number(userId);
}

export class AIChatController {
  /**
   * 创建新的聊天会话
   * POST /api/ai-chat/sessions
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionData: CreateChatSessionRequest = req.body;

      const session = await AIChatService.createSession(userId, sessionData);

      sendResult(res, { data: session }, '聊天会话创建成功', 201);
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 获取用户的所有会话
   * GET /api/ai-chat/sessions
   */
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      
      const params: ChatQueryParams = {
        page: parseInt((req.query.page as string) || '1', 10),
        limit: parseInt((req.query.limit as string) || '20', 10),
        search: (req.query.search as string) || undefined,
        ai_model: (req.query.ai_model as string) || undefined,
        is_starred: req.query.is_starred === 'true' ? true : undefined,
        start_date: (req.query.start_date as string) || undefined,
        end_date: (req.query.end_date as string) || undefined
      };

      const { sessions, total } = await AIChatService.getUserSessions(userId, params);

      sendResult(res, {
        data: sessions,
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total,
          totalPages: Math.ceil(total / (params.limit || 20))
        }
      });
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 获取会话详情
   * GET /api/ai-chat/sessions/:id
   */
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);

      const session = await AIChatService.getSession(userId, sessionId);

      if (!session) {
        sendError(res, '会话不存在', 404);
        return;
      }

      sendResult(res, { data: session });
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 更新会话信息
   * PUT /api/ai-chat/sessions/:id
   */
  static async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);
      const updateData: UpdateChatSessionRequest = req.body;

      const session = await AIChatService.updateSession(userId, sessionId, updateData);

      if (!session) {
        sendError(res, '会话不存在', 404);
        return;
      }

      sendResult(res, { data: session }, '会话更新成功');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 删除会话
   * DELETE /api/ai-chat/sessions/:id
   */
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);

      const success = await AIChatService.deleteSession(userId, sessionId);

      if (!success) {
        sendError(res, '会话不存在', 404);
        return;
      }

      sendResult(res, { message: 'Session deleted successfully' }, '会话删除成功');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 发送消息并获取 AI 响应
   * POST /api/ai-chat/sessions/:id/messages
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);
      const { content } = req.body;

      if (!content) {
        sendError(res, '消息内容不能为空', 400);
        return;
      }

      const result = await AIChatService.sendMessage(userId, sessionId, content);

      sendResult(res, {
        data: {
          userMessage: result.userMessage,
          aiMessage: result.aiMessage,
          responseTime: result.responseTime
        }
      }, '消息发送成功');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 获取聊天历史
   * GET /api/ai-chat/sessions/:id/messages
   */
  static async getChatHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const messages = await AIChatService.getChatHistory(userId, sessionId, limit);

      sendResult(res, { data: messages });
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 编辑消息
   * PATCH /api/ai-chat/messages/:id
   */
  static async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const messageId = parseInt(String(req.params.id), 10);
      const { content } = req.body;

      if (!content) {
        sendError(res, '消息内容不能为空', 400);
        return;
      }

      const message = await AIChatService.editMessage(userId, messageId, content);

      if (!message) {
        sendError(res, '消息不存在', 404);
        return;
      }

      sendResult(res, { data: message }, '消息更新成功');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 删除消息
   * DELETE /api/ai-chat/messages/:id
   */
  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const messageId = parseInt(String(req.params.id), 10);

      const success = await AIChatService.deleteMessage(userId, messageId);

      if (!success) {
        sendError(res, '消息不存在', 404);
        return;
      }

      sendResult(res, { message: 'Message deleted successfully' }, '消息删除成功');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 获取用户的 Token 统计
   * GET /api/ai-chat/stats
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);

      const stats = await AIChatService.getUserStats(userId);

      sendResult(res, { data: stats });
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 清空会话
   * DELETE /api/ai-chat/sessions/:id/clear
   */
  static async clearSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);

      const success = await AIChatService.clearSession(userId, sessionId);

      if (!success) {
        sendError(res, '会话不存在', 404);
        return;
      }

      sendResult(res, { message: 'Session cleared successfully' }, '会话已清空');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 搜索消息
   * GET /api/ai-chat/search
   */
  static async searchMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const keyword = req.query.keyword as string;
      const sessionId = req.query.session_id ? parseInt(String(req.query.session_id), 10) : undefined;

      if (!keyword) {
        sendError(res, '搜索关键词不能为空', 400);
        return;
      }

      const messages = await AIChatService.searchMessages(userId, keyword, sessionId);

      sendResult(res, { data: messages });
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 标记会话为星标
   * POST /api/ai-chat/sessions/:id/star
   */
  static async toggleSessionStar(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);

      const session = await AIChatService.toggleSessionStar(userId, sessionId);

      if (!session) {
        sendError(res, '会话不存在', 404);
        return;
      }

      sendResult(res, { data: session }, session.is_starred ? '已标星' : '已取消标星');
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error));
    }
  }

  /**
   * 流式发送消息（Server-Sent Events）
   * POST /api/ai-chat/sessions/:id/messages/stream
   */
  static async sendMessageStream(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);
      const { content } = req.body;

      if (!content) {
        sendError(res, '消息内容不能为空', 400);
        return;
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      // 从请求头获取 Origin，而不是使用通配符
      const origin = req.get('Origin') || req.get('Referer')?.split('/').slice(0, 3).join('/');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // 发送初始连接事件
      res.write('data: {"type":"connected"}\n\n');
      console.log('[sendMessageStream] 已发送 connected 事件');

      // 流式处理消息
      try {
        const result = await AIChatService.sendMessageStream(
          userId,
          sessionId,
          content,
          (chunk: string) => {
            // 每接收到数据块就发送给客户端
            console.log('[sendMessageStream] 发送 chunk 事件，内容长度:', chunk.length);
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        );

        // 发送完成事件
        console.log('[sendMessageStream] 发送 done 事件');
        res.write(`data: ${JSON.stringify({
          type: 'done',
          userMessageId: result.userMessageId,
          aiMessageId: result.aiMessageId,
          totalTokens: result.totalTokens
        })}\n\n`);

        res.end();
      } catch (streamError) {
        console.error('[sendMessageStream] 流式错误:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: streamError instanceof Error ? streamError.message : String(streamError)
        })}\n\n`);
        res.end();
      }
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }

  /**
   * 流式编辑并发送消息
   * 用于实时编辑后立即发送
   * POST /api/ai-chat/sessions/:id/messages/stream-edit
   */
  static async sendMessageStreamWithEdit(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserIdFromReq(req);
      const sessionId = parseInt(String(req.params.id), 10);
      const { messageId, content } = req.body;

      if (!content) {
        sendError(res, '消息内容不能为空', 400);
        return;
      }

      // 编辑原消息
      if (messageId) {
        await AIChatService.editMessage(userId, messageId, content);
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      // 从请求头获取 Origin，而不是使用通配符
      const origin = req.get('Origin') || req.get('Referer')?.split('/').slice(0, 3).join('/');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      res.write('data: {"type":"connected"}\n\n');

      try {
        const result = await AIChatService.sendMessageStream(
          userId,
          sessionId,
          content,
          (chunk: string) => {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        );

        res.write(`data: ${JSON.stringify({
          type: 'done',
          userMessageId: result.userMessageId,
          aiMessageId: result.aiMessageId,
          totalTokens: result.totalTokens
        })}\n\n`);

        res.end();
      } catch (streamError) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: streamError instanceof Error ? streamError.message : String(streamError)
        })}\n\n`);
        res.end();
      }
    } catch (error) {
      sendError(res, String(error instanceof Error ? error.message : error), 400);
    }
  }
}
