// 统一的 API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export type Subscription = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  totalTrafficBytes: number | null;
  usedTrafficBytes?: number;
  startAt: string;
  expireAt: string;
  createAt: string;
  lastUpdatedAt: string;
  yamlConfig: string;
  pinnedOrder?: number; // 置顶顺序，越小越靠前，undefined 表示未置顶
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
    }[];
    ruleProviders?: {
      id?: string;
      name: string;
      type: 'http';
      url: string;
      behavior: 'domain' | 'classical' | 'ipcidr';
      interval?: number;
      path?: string;
    }[];
    chainProxies?: {
      id: string;
      name: string; // The proxy group name
      secondHopConfig?: string;
    }[];
    rules?: string;
  };
};

export type Settings = { baseUrl: string };

export type User = {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
};
