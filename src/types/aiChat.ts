/**
 * AI Agent 聊天系统类型定义
 */

// =====================================================
// 枚举类型
// =====================================================

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  MIXED = 'mixed'
}

export enum FinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  ERROR = 'error',
  CONTENT_FILTER = 'content_filter',
  TOOL_CALLS = 'tool_calls'
}

export enum AIModelType {
  DASHSCOPE = 'dashscope',
  GPT_4 = 'gpt-4',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

// =====================================================
// 接口类型
// =====================================================

/**
 * AI 聊天会话信息
 */
export interface AIChatSession {
  id: number;
  uuid: string;
  user_id: number;
  session_name: string;
  description?: string;
  ai_model: AIModelType | string;
  ai_app_id?: string;
  system_prompt?: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  is_active: boolean;
  is_starred: boolean;
  tags?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * AI 聊天消息
 */
export interface AIChatMessage {
  id: number;
  session_id: number;
  user_id: number;
  message_index: number;
  role: MessageRole;
  content: string;
  content_type: ContentType;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  usage_tokens?: Record<string, any>;
  model_name?: string;
  finish_reason?: FinishReason;
  response_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
  is_edited: boolean;
  edited_at?: string;
  edited_content?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 创建聊天会话请求
 */
export interface CreateChatSessionRequest {
  session_name?: string;
  description?: string;
  ai_model?: AIModelType | string;
  ai_app_id?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  tags?: string;
}

/**
 * 更新聊天会话请求
 */
export interface UpdateChatSessionRequest {
  session_name?: string;
  description?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  is_starred?: boolean;
  tags?: string;
}

/**
 * 发送消息请求
 */
export interface SendMessageRequest {
  session_id: number;
  content: string;
  content_type?: ContentType;
}

/**
 * AI 响应数据
 */
export interface AIResponse {
  success: boolean;
  message?: string;
  data?: {
    text: string;
    finishReason?: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    modelName?: string;
    responseTime?: number;
  };
  error?: string;
}

/**
 * Token 使用统计
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 聊天会话统计
 */
export interface ChatSessionStats {
  total_sessions: number;
  total_messages: number;
  total_tokens: number;
  average_tokens_per_session: number;
  most_used_model: string;
  today_sessions: number;
  today_messages: number;
}

/**
 * 分页查询参数
 */
export interface ChatQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  ai_model?: string;
  is_starred?: boolean;
  start_date?: string;
  end_date?: string;
}

/**
 * DashScope API 请求数据格式
 */
export interface DashScopeRequest {
  input: {
    prompt: string;
    // 可以添加更多字段如 history, parameters 等
  };
  parameters?: Record<string, any>;
  debug?: Record<string, any>;
}

/**
 * DashScope API 响应数据格式
 */
export interface DashScopeResponse {
  output: {
    text: string;
    finishReason?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  requestId?: string;
}

/**
 * 聊天历史（用于 AI 上下文）
 */
export interface ChatHistory {
  role: MessageRole;
  content: string;
}
