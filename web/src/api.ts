import { ApiResponse, Settings, Subscription, User } from "./types";
import {
  SubscriptionStatus,
  SubscriptionTraffic,
  SubscriptionValidity
} from "./enum";
import { LogoutSystem } from "./utils";

// 获取 API 基础 URL
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  // 如果是相对路径，添加 API 基础 URL
  // const fullUrl = url.startsWith("/") ? `${API_BASE_URL}${url}` : url;
  const token = localStorage.getItem("token");

  // 检查是否是文件上传请求
  const isFileUpload = options?.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFileUpload ? {} : { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    if (res.status === 401) {
      setTimeout(() => {
        LogoutSystem();
      }, 500);
      throw new Error("认证已过期，请重新登录");
    }
    const error = await res.json();
    throw new Error(error.message || "请求失败");
  }

  return res.json();
}

export const api = {
  // 认证相关
  login: (username: string, password: string) =>
    request<ApiResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  logout: () =>
    request<ApiResponse>("/api/auth/logout", {
      method: "POST"
    }),
  verifyToken: () => request<ApiResponse>("/api/auth/verify"),

  // 用户信息相关
  getProfile: () => request<ApiResponse<User>>("/api/user/profile"),
  updateProfile: (payload: Partial<User>) =>
    request<ApiResponse<User>>("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<ApiResponse>("/api/user/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return request<ApiResponse<{ avatarUrl: string }>>("/api/user/avatar", {
      method: "POST",
      body: formData
    });
  },

  // 设置相关
  getSettings: () => request<ApiResponse<Settings>>("/api/settings"),
  updateSettings: (payload: Settings) =>
    request<ApiResponse<Settings>>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  // 获取订阅基础 URL
  getSubscriptionBaseUrl: () =>
    request<ApiResponse<{ subscriptionBaseUrl: string }>>(
      "/api/subscription-base-url"
    ),

  // 订阅相关
  listSubs: () => request<ApiResponse<Subscription[]>>("/api/subscriptions"),
  getSubsStats: () => request<ApiResponse<any>>("/api/subscriptions/stats"),
  getSub: (id: string) =>
    request<ApiResponse<Subscription>>(`/api/subscription/${id}`),
  createSub: (
    payload: Omit<Subscription, "id" | "createAt" | "lastUpdatedAt">
  ) =>
    request<ApiResponse<Subscription>>("/api/subscription", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateSub: (id: string, payload: Partial<Subscription>) =>
    request<ApiResponse<Subscription>>(`/api/subscription/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteSub: (id: string) =>
    request<ApiResponse>(`/api/subscription/${id}`, { method: "DELETE" }),
  toggleSub: (id: string) =>
    request<ApiResponse<Subscription>>(`/api/subscription/${id}/toggle`, {
      method: "POST"
    }),
  updatePinnedOrder: (pinnedIds: string[]) =>
    request<ApiResponse>("/api/subscription/pinned", {
      method: "PUT",
      body: JSON.stringify({ pinnedIds })
    }),
  searchSubs: (params: {
    keyword?: string;
    status?: SubscriptionStatus | "";
    traffic?: SubscriptionTraffic | "";
    validity?: SubscriptionValidity | "";
  }) => {
    const searchParams = new URLSearchParams();
    if (params.keyword?.trim())
      searchParams.append("keyword", params.keyword.trim());
    if (params.status) searchParams.append("status", params.status);
    if (params.traffic) searchParams.append("traffic", params.traffic);
    if (params.validity) searchParams.append("validity", params.validity);
    return request<ApiResponse<Subscription[]>>(
      `/api/subscriptions${searchParams.toString() ? `?${searchParams}` : ""}`
    );
  },
  exportBackup: async () => {
    const res = await fetch("/api/export", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    });
    if (!res.ok) throw new Error("export failed");
    return res.json();
  },
  importBackup: (data: unknown) =>
    request<ApiResponse>("/api/import", {
      method: "POST",
      body: JSON.stringify(data)
    })
};

export function buildSubscriptionUrl(
  baseUrl: string,
  subId: string,
  withTs = true
) {
  const url = `${baseUrl.replace(/\/$/, "")}/subscribe?id=${subId}`;
  return withTs ? `${url}?t=${Date.now()}` : url;
}
