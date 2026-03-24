// 统一的 API 响应结构
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// 分页响应结构
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 用户认证相关类型
export interface User {
  id: string;
  username: string;
  password: string; // 加密后的密码
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  lastUpdatedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    lastLoginAt: string;
  };
}

// JWT 载荷类型
export interface JwtPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

// 数据库模式更新
export interface DbSchema {
  subscriptions: Subscription[];
  settings: {
    baseUrl?: string;
  };
  users: User[];
}

// 订阅类型（保持原有）
export interface Subscription {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  totalTrafficBytes: number | null;
  startAt: string;
  expireAt: string;
  createAt: string;
  lastUpdatedAt: string;
  yamlConfig: string;
  pinnedOrder?: number;
  configMode?: 'yaml' | 'visual';
  visualConfig?: {
    baseConfig?: string;
    proxyProviders?: {
      id: string;
      name: string;
      type: 'url' | 'content';
      url?: string;
      content?: string;
      updateInterval?: number;
      fetchedNodes?: any[];
      lastFetchTime?: string;
    }[];
    chainProxies?: {
      id: string;
      name: string; // The proxy group name
      secondHopConfig?: string;
    }[];
    rules?: string;
  };
}
