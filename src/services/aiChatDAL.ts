/**
 * AI 聊天系统数据访问层（DAL）
 */

import { dbQuery } from '../config/db.js'
import type {
  AIChatSession,
  AIChatMessage,
  MessageRole,
  ContentType,
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  ChatQueryParams
} from '../types/aiChat.js';

export class AIChatDAL {
  /**
   * 创建聊天会话
   */
  static async createSession(userId: number, sessionData: CreateChatSessionRequest): Promise<AIChatSession> {
    const uuid = generateUUID();
    
    const query = `
      INSERT INTO ai_chat_sessions (
        uuid, user_id, session_name, description, ai_model, ai_app_id,
        system_prompt, temperature, max_tokens, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      uuid,
      userId,
      sessionData.session_name || '新聊天',
      sessionData.description || null,
      sessionData.ai_model || 'dashscope',
      sessionData.ai_app_id || null,
      sessionData.system_prompt || null,
      sessionData.temperature ?? 0.7,
      sessionData.max_tokens ?? 2048,
      sessionData.tags || null,
    ];

    const [result] = await dbQuery(query, values) as any;
    return this.getSessionById(userId, result.insertId) as Promise<AIChatSession>;
  }

  /**
   * 获取会话详情
   */
  static async getSessionById(userId: number, sessionId: number): Promise<AIChatSession | null> {
    const query = 'SELECT * FROM ai_chat_sessions WHERE id = ? AND user_id = ?';
    const [rows] = await dbQuery(query, [sessionId, userId]) as any;
    return rows[0] || null;
  }

  /**
   * 通过 UUID 获取会话
   */
  static async getSessionByUuid(userId: number, uuid: string): Promise<AIChatSession | null> {
    const query = 'SELECT * FROM ai_chat_sessions WHERE uuid = ? AND user_id = ?';
    const [rows] = await dbQuery(query, [uuid, userId]) as any;
    return rows[0] || null;
  }

  /**
   * 获取用户的所有会话
   */
  static async getUserSessions(userId: number, params: ChatQueryParams): Promise<{ sessions: AIChatSession[]; total: number }> {
    const { page = 1, limit = 20, search, ai_model, is_starred, start_date, end_date } = params;
    const offset = (page - 1) * limit;

    // 构建 WHERE 子句和参数的函数
    const buildWhereParams = () => {
      const queryParams: any[] = [userId];
      let where = 'WHERE user_id = ? AND is_active = TRUE';

      if (search) {
        where += ' AND (session_name LIKE ? OR description LIKE ?)';
        const pattern = `%${search}%`;
        queryParams.push(pattern, pattern);
      }

      if (ai_model) {
        where += ' AND ai_model = ?';
        queryParams.push(ai_model);
      }

      if (is_starred !== undefined) {
        where += ' AND is_starred = ?';
        // 确保转换为整数
        queryParams.push(is_starred ? 1 : 0);
      }

      if (start_date) {
        where += ' AND created_at >= ?';
        queryParams.push(start_date);
      }

      if (end_date) {
        where += ' AND created_at <= ?';
        queryParams.push(end_date);
      }

      return { where, queryParams };
    };

    try {
      const { where, queryParams: countParams } = buildWhereParams();

      // 获取总数
      const [countResult] = await dbQuery(`SELECT COUNT(*) as total FROM ai_chat_sessions ${where}`, countParams) as any;
      const total = countResult[0]?.total || 0;

      // 获取会话列表
      const { where: whereClause, queryParams: dataParams } = buildWhereParams();
      dataParams.push(limit, offset);

      const dataQuery = `
        SELECT * FROM ai_chat_sessions ${whereClause}
        ORDER BY last_message_at DESC, created_at DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await dbQuery(dataQuery, dataParams) as any;

      return { sessions: rows, total };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新会话
   */
  static async updateSession(userId: number, sessionId: number, updateData: UpdateChatSessionRequest): Promise<AIChatSession | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.session_name !== undefined) {
      fields.push('session_name = ?');
      values.push(updateData.session_name);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.system_prompt !== undefined) {
      fields.push('system_prompt = ?');
      values.push(updateData.system_prompt);
    }
    if (updateData.temperature !== undefined) {
      fields.push('temperature = ?');
      values.push(updateData.temperature);
    }
    if (updateData.max_tokens !== undefined) {
      fields.push('max_tokens = ?');
      values.push(updateData.max_tokens);
    }
    if (updateData.is_starred !== undefined) {
      fields.push('is_starred = ?');
      values.push(updateData.is_starred);
    }
    if (updateData.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updateData.tags);
    }
    if (updateData.dashscope_session_id !== undefined) {
      fields.push('dashscope_session_id = ?');
      values.push(updateData.dashscope_session_id);
    }

    if (fields.length === 0) {
      return this.getSessionById(userId, sessionId);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const query = `UPDATE ai_chat_sessions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    values.push(sessionId, userId);

    await dbQuery(query, values);
    return this.getSessionById(userId, sessionId);
  }

  /**
   * 删除会话（软删除）
   */
  static async deleteSession(userId: number, sessionId: number): Promise<boolean> {
    const query = 'UPDATE ai_chat_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?';
    const [result] = await dbQuery(query, [sessionId, userId]) as any;
    return result.affectedRows > 0;
  }

  /**
   * 添加聊天消息
   */
  static async addMessage(
    sessionId: number,
    userId: number,
    role: MessageRole,
    content: string,
    messageData?: Partial<AIChatMessage>
  ): Promise<AIChatMessage> {
    try {
      // 获取会话中的消息计数
      const countQuery = 'SELECT COUNT(*) as count FROM ai_chat_messages WHERE session_id = ?';
      const [countResult] = await dbQuery(countQuery, [sessionId]) as any;
      const messageIndex = (countResult[0].count || 0) + 1;

      const query = `
        INSERT INTO ai_chat_messages (
          session_id, user_id, message_index, role, content, content_type,
          input_tokens, output_tokens, total_tokens, usage_tokens, model_name,
          finish_reason, response_time_ms, error_message, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        sessionId,
        userId,
        messageIndex,
        role,
        content,
        messageData?.content_type || 'text',
        messageData?.input_tokens ?? 0,
        messageData?.output_tokens ?? 0,
        messageData?.total_tokens ?? 0,
        messageData?.usage_tokens ? JSON.stringify(messageData.usage_tokens) : null,
        messageData?.model_name ?? null,
        messageData?.finish_reason ?? null,
        messageData?.response_time_ms ?? null,
        messageData?.error_message ?? null,
        messageData?.metadata ? JSON.stringify(messageData.metadata) : null
      ];

      const [result] = await dbQuery(query, values) as any;

      // 更新会话的消息计数和最后消息时间
      await this.updateSessionStats(sessionId, messageData);

      return this.getMessageById(result.insertId) as Promise<AIChatMessage>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取消息
   */
  static async getMessageById(messageId: number): Promise<AIChatMessage | null> {
    const query = 'SELECT * FROM ai_chat_messages WHERE id = ? AND is_deleted = FALSE';
    const [rows] = await dbQuery(query, [messageId]) as any;
    return rows[0] || null;
  }

  /**
   * 获取会话的消息历史
   */
  static async getSessionMessages(
    sessionId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<AIChatMessage[]> {
    const query = `
      SELECT * FROM ai_chat_messages 
      WHERE session_id = ? AND is_deleted = FALSE
      ORDER BY message_index ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await dbQuery(query, [sessionId, limit, offset]) as any;
    return rows;
  }

  /**
   * 获取会话的所有消息（用于上下文）
   */
  static async getSessionAllMessages(sessionId: number): Promise<AIChatMessage[]> {
    const query = `
      SELECT * FROM ai_chat_messages 
      WHERE session_id = ? AND is_deleted = FALSE
      ORDER BY message_index ASC
    `;
    const [rows] = await dbQuery(query, [sessionId]) as any;
    return rows;
  }

  /**
   * 编辑消息
   */
  static async editMessage(messageId: number, newContent: string): Promise<boolean> {
    const query = `
      UPDATE ai_chat_messages 
      SET content = ?, is_edited = TRUE, edited_at = NOW(), edited_content = ?
      WHERE id = ?
    `;
    const [result] = await dbQuery(query, [newContent, newContent, messageId]) as any;
    return result.affectedRows > 0;
  }

  /**
   * 删除消息（软删除）
   */
  static async deleteMessage(messageId: number): Promise<boolean> {
    const query = 'UPDATE ai_chat_messages SET is_deleted = TRUE WHERE id = ?';
    const [result] = await dbQuery(query, [messageId]) as any;
    return result.affectedRows > 0;
  }

  /**
   * 更新会话统计信息
   */
  static async updateSessionStats(sessionId: number, messageData?: Partial<AIChatMessage>): Promise<void> {
    const inputTokens = messageData?.input_tokens || 0;
    const outputTokens = messageData?.output_tokens || 0;
    const totalTokens = messageData?.total_tokens || (inputTokens + outputTokens);

    const query = `
      UPDATE ai_chat_sessions 
      SET 
        message_count = message_count + 1,
        total_input_tokens = total_input_tokens + ?,
        total_output_tokens = total_output_tokens + ?,
        total_tokens = total_tokens + ?,
        last_message_at = NOW()
      WHERE id = ?
    `;

    await dbQuery(query, [inputTokens, outputTokens, totalTokens, sessionId]);
  }

  /**
   * 获取用户的 token 统计
   */
  static async getUserTokenStats(userId: number): Promise<{
    total_tokens: number;
    total_sessions: number;
    total_messages: number;
    average_tokens: number;
  }> {
    const query = `
      SELECT 
        SUM(total_tokens) as total_tokens,
        COUNT(DISTINCT id) as total_sessions,
        SUM(message_count) as total_messages
      FROM ai_chat_sessions
      WHERE user_id = ? AND is_active = TRUE
    `;

    const [rows] = await dbQuery(query, [userId]) as any;
    const stats = rows[0] || {};

    return {
      total_tokens: stats.total_tokens || 0,
      total_sessions: stats.total_sessions || 0,
      total_messages: stats.total_messages || 0,
      average_tokens: stats.total_sessions ? Math.round((stats.total_tokens || 0) / stats.total_sessions) : 0
    };
  }

  /**
   * 清空会话的所有消息
   */
  static async clearSessionMessages(sessionId: number): Promise<boolean> {
    const query = 'UPDATE ai_chat_messages SET is_deleted = TRUE WHERE session_id = ?';
    const [result] = await dbQuery(query, [sessionId]) as any;

    // 重置会话计数
    const updateQuery = `
      UPDATE ai_chat_sessions 
      SET message_count = 0, total_input_tokens = 0, total_output_tokens = 0, total_tokens = 0
      WHERE id = ?
    `;
    await dbQuery(updateQuery, [sessionId]);

    return result.affectedRows > 0;
  }

  /**
   * 搜索消息内容
   */
  static async searchMessages(
    userId: number,
    keyword: string,
    sessionId?: number
  ): Promise<AIChatMessage[]> {
    let query = `
      SELECT m.* FROM ai_chat_messages m
      JOIN ai_chat_sessions s ON m.session_id = s.id
      WHERE s.user_id = ? AND m.is_deleted = FALSE AND (m.content LIKE ? OR m.error_message LIKE ?)
    `;
    const params: any[] = [userId, `%${keyword}%`, `%${keyword}%`];

    if (sessionId) {
      query += ' AND m.session_id = ?';
      params.push(sessionId);
    }

    query += ' ORDER BY m.created_at DESC LIMIT 100';

    const [rows] = await dbQuery(query, params) as any;
    return rows;
  }
}

// =====================================================
// 辅助函数
// =====================================================

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
