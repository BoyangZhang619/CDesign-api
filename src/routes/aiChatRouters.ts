/**
 * AI 聊天系统路由配置
 */

import { Router } from 'express';
import { AIChatController } from '../controllers/aiChatController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const aiChatRouters = Router();

// 所有路由都需要认证
aiChatRouters.use(authMiddleware);
    
/**
 * 会话管理路由
 */
// 创建新会话
aiChatRouters.post('/sessions', AIChatController.createSession);

// 获取用户的所有会话
aiChatRouters.get('/sessions', AIChatController.getUserSessions);

// 获取单个会话详情
aiChatRouters.get('/sessions/:id', AIChatController.getSession);

// 更新会话
aiChatRouters.put('/sessions/:id', AIChatController.updateSession);

// 删除会话
aiChatRouters.delete('/sessions/:id', AIChatController.deleteSession);

// 标记会话为星标
aiChatRouters.post('/sessions/:id/star', AIChatController.toggleSessionStar);

// 清空会话（删除所有消息）
aiChatRouters.delete('/sessions/:id/clear', AIChatController.clearSession);

/**
 * 消息管理路由
 */
// 发送消息
aiChatRouters.post('/sessions/:id/messages', AIChatController.sendMessage);

// 发送消息（流式）
aiChatRouters.post('/sessions/:id/messages/stream', AIChatController.sendMessageStream);

// 发送消息（流式 + 编辑）
aiChatRouters.post('/sessions/:id/messages/stream-edit', AIChatController.sendMessageStreamWithEdit);

// 获取聊天历史
aiChatRouters.get('/sessions/:id/messages', AIChatController.getChatHistory);

// 编辑消息
aiChatRouters.patch('/messages/:id', AIChatController.editMessage);

// 消息反馈
aiChatRouters.patch('/messages/:id/feedback', AIChatController.feedbackMessage);

// 删除消息
aiChatRouters.delete('/messages/:id', AIChatController.deleteMessage);

/**
 * 搜索和统计路由
 */
// 搜索消息
aiChatRouters.get('/search', AIChatController.searchMessages);

// 获取用户 Token 统计
aiChatRouters.get('/stats', AIChatController.getUserStats);

export { aiChatRouters };
