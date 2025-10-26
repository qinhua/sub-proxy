import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import send from "koa-send";
import cors from "koa-cors";
import path from "path";
import { fileURLToPath } from "url";
import { createDb } from "./db";
import { createRouter } from "./routes";
import authRoutes from "./authRoutes";

// 在 ES 模块中，使用 import.meta.url 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const app = new Koa();
  const router = new Router();

  // app.use(
  //   cors({
  //     credentials: true,
  //     origin: "*" // 开发环境允许所有来源
  //   })
  // );

  app.use(bodyParser({ enableTypes: ["json"], jsonLimit: "5mb" }));

  // Debug middleware
  app.use(async (ctx, next) => {
    console.log(`Request: ${ctx.method} ${ctx.path}`);
    await next();
  });

  const db = await createDb();

  // 将数据库添加到上下文
  app.use(async (ctx, next) => {
    ctx.state.db = db;
    await next();
  });

  // 认证路由（无需认证）
  app.use(authRoutes.routes()).use(authRoutes.allowedMethods());

  // API 路由（需要认证）
  const apiRouter = createRouter(db);
  console.log("API routes initialized.");
  app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

  // Health check route (after API routes)
  router.get("/health", async ctx => {
    ctx.body = { ok: true };
  });
  app.use(router.routes()).use(router.allowedMethods());

  // Serve uploaded files (avatars)
  const uploadDir = path.resolve(__dirname, "../upload");
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith("/upload")) {
      const filePath = ctx.path.replace("/upload", "");
      ctx.path = filePath;
      return serve(uploadDir)(ctx, next);
    }
    return next();
  });

  // Serve frontend build if present
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(serve(webDist));

  // SPA fallback
  app.use(async (ctx, next) => {
    if (
      ctx.path.startsWith("/api") ||
      ctx.path.startsWith("/subscription") ||
      ctx.path === "/health"
    )
      return next();
    try {
      await send(ctx, "index.html", { root: webDist });
    } catch {
      return next();
    }
  });

  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
