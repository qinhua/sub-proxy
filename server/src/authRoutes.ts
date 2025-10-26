import Router from "@koa/router";
import { Context } from "koa";
import {
  handleLogin,
  createSuccessResponse,
  createErrorResponse
} from "./auth";
import { LoginRequest } from "./types";

const router = new Router();

// 登录接口
router.post("/api/auth/login", async (ctx: Context) => {
  try {
    const loginData = ctx.request.body as LoginRequest;

    if (!loginData.username || !loginData.password) {
      ctx.status = 400;
      ctx.body = createErrorResponse("用户名和密码不能为空");
      return;
    }

    const result = await handleLogin(loginData, ctx.state.db.data.users || []);

    if (result.success) {
      ctx.status = 200;
      ctx.body = result;
    } else {
      ctx.status = 200;
      ctx.body = createErrorResponse("用户名或密码错误");
    }
  } catch (error) {
    console.error("登录错误:", error);
    ctx.status = 500;
    ctx.body = createErrorResponse("服务器内部错误");
  }
});

// 验证 token 接口
router.get("/api/auth/verify", async (ctx: Context) => {
  try {
    const token = ctx.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      ctx.status = 400;
      ctx.body = createErrorResponse("未提供认证令牌");
      return;
    }

    const { verifyToken } = await import("./auth.js");
    const payload = verifyToken(token);

    if (!payload) {
      ctx.status = 401;
      ctx.body = createErrorResponse("认证令牌无效或已过期");
      return;
    }

    ctx.status = 200;
    ctx.body = createSuccessResponse(
      {
        valid: true,
        user: {
          id: payload.userId,
          username: payload.username
        }
      },
      "Token 有效"
    );
  } catch (error) {
    console.error("Token 验证错误:", error);
    ctx.status = 500;
    ctx.body = createErrorResponse("服务器内部错误");
  }
});

// 登出接口（前端处理，这里只是返回成功）
router.post("/api/auth/logout", async (ctx: Context) => {
  ctx.status = 200;
  ctx.body = createSuccessResponse(null, "登出成功");
});

export default router;
