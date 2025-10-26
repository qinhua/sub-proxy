import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Context, Next } from "koa";
import {
  JwtPayload,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse
} from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "sub-proxy-secret-key-2025";
const JWT_EXPIRES_IN = "7d"; // 7天过期

// 生成 JWT token
export function generateToken(user: User): string {
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    userId: user.id,
    username: user.username
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 验证 JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// 加密密码
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// 验证密码
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// 认证中间件
export async function authMiddleware(ctx: Context, next: Next) {
  const token = ctx.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    ctx.status = 401;
    ctx.body = createErrorResponse("未提供认证令牌", 401);
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    ctx.status = 401;
    ctx.body = createErrorResponse("认证令牌无效或已过期", 401);
    return;
  }

  // 将用户信息添加到上下文
  ctx.state.user = {
    id: payload.userId,
    username: payload.username
  };

  await next();
}

// 创建成功响应
export function createSuccessResponse<T>(
  data: T,
  message: string = "操作成功"
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// 创建错误响应
export function createErrorResponse(
  message: string,
  status: number = 400
): ApiResponse {
  return {
    success: false,
    message,
    error: message,
    timestamp: new Date().toISOString()
  };
}

// 处理登录
export async function handleLogin(
  loginData: LoginRequest,
  users: User[]
): Promise<ApiResponse<LoginResponse> | ApiResponse> {
  const { username, password } = loginData;

  // 查找用户
  const user = users.find(u => u.username === username);
  if (!user) {
    return createErrorResponse("用户名或密码错误", 401);
  }

  // 验证密码
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return createErrorResponse("用户名或密码错误", 401);
  }

  // 更新最后登录时间
  user.lastLoginAt = new Date().toISOString();

  // 生成 token
  const token = generateToken(user);

  const response: LoginResponse = {
    token,
    user: {
      ...user,
      lastLoginAt: user.lastLoginAt
    }
  };

  return createSuccessResponse(response, "登录成功");
}
