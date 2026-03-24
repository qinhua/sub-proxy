import path from "path";
import fs from "fs";
import os from "os";
import Router from "@koa/router";
import * as uuid from "uuid";
import multer from "multer";
import dayjs from "dayjs";
import { z } from "zod";
import { generateAvatarUrl, fetchProxyNodesFromUrl } from "./utils";
import { generateVisualYaml } from "./yamlGenerator";
import { Subscription, DbSchema } from "./types";
import { fileURLToPath } from "url";
import {
  authMiddleware,
  createSuccessResponse,
  createErrorResponse
} from "./auth";
import {
  SubscriptionStatus,
  SubscriptionTraffic,
  SubscriptionValidity
  // @ts-ignore
} from "@sub-proxy/types";

// 在 ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const subInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  totalTrafficBytes: z.union([z.number().int().positive(), z.null()]),
  startAt: z.union([z.string().datetime(), z.string()]),
  expireAt: z.union([z.string().datetime(), z.string()]),
  yamlConfig: z.string().optional().default(""),
  configMode: z.enum(["yaml", "visual"]).optional(),
  visualConfig: z.any().optional()
});

export function createRouter(db: {
  data: DbSchema;
  write: () => Promise<void>;
}) {
  const router = new Router();

  // 配置 multer 用于文件上传
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // 使用 __dirname 获取当前文件所在目录，然后构建相对路径
      const uploadDir = path.join(__dirname, "..", "upload", "avatar");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuid.v4().replace(/-/g, "").substring(0, 12)}${ext}`);
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB 限制
    },
    fileFilter: (req, file, cb) => {
      // 只允许图片文件
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("只允许上传图片文件"));
      }
    }
  });

  // 健康检查
  router.get("/health", async ctx => {
    ctx.body = { ok: true };
  });

  // 应用版本信息
  router.get("/api/version", async ctx => {
    // 从 package.json 读取版本号
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../..", "package.json"), "utf-8")
    );
    const version = packageJson.version || "1.0.0";

    ctx.body = {
      success: true,
      data: {
        version,
        timestamp: new Date().toISOString()
      },
      message: "获取版本信息成功"
    };
  });

  // 订阅统计
  router.get("/api/subscriptions/stats", authMiddleware, async ctx => {
    try {
      const subscriptions = db.data.subscriptions;

      const stats = {
        total: subscriptions.length,
        enabled: subscriptions.filter(s => s.enabled).length,
        disabled: subscriptions.filter(s => !s.enabled).length,
        unlimitedTraffic: subscriptions.filter(
          s => s.totalTrafficBytes === null
        ).length,
        limitedTraffic: subscriptions.filter(s => s.totalTrafficBytes !== null)
          .length,
        permanent: subscriptions.filter(s => {
          const expireTime = dayjs(s.expireAt);
          return expireTime.diff(dayjs(s.startAt), "year") > 50;
        }).length,
        temporary: subscriptions.filter(s => {
          const expireTime = dayjs(s.expireAt);
          return expireTime.diff(dayjs(s.startAt), "year") <= 50;
        }).length,
        pinned: subscriptions.filter(
          s => s.pinnedOrder !== undefined && s.pinnedOrder !== null
        ).length
      };

      ctx.body = createSuccessResponse(stats);
    } catch (error) {
      console.error("获取订阅统计错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 订阅列表
  router.get("/api/subscriptions", authMiddleware, async ctx => {
    try {
      const { keyword, status, traffic, validity } = ctx.query;

      let filteredSubs = [...db.data.subscriptions];

      // 关键词搜索
      if (keyword) {
        const keywordStr = String(keyword).toLowerCase();
        filteredSubs = filteredSubs.filter(sub =>
          sub.name.toLowerCase().includes(keywordStr)
        );
      }

      // 状态筛选
      if (status) {
        const statusBool = status === SubscriptionStatus.Enabled;
        filteredSubs = filteredSubs.filter(sub => sub.enabled === statusBool);
      }

      // 无限流量筛选
      if (traffic) {
        const trafficBool = traffic === SubscriptionTraffic.Unlimited;
        filteredSubs = filteredSubs.filter(sub =>
          trafficBool
            ? sub.totalTrafficBytes === null
            : sub.totalTrafficBytes !== null
        );
      }

      // 永久有效筛选
      if (validity) {
        const validityBool = validity === SubscriptionValidity.Permanent;
        filteredSubs = filteredSubs.filter(sub => {
          const expireAt = sub.expireAt;
          return validityBool ? expireAt === "" : expireAt !== "";
        });
      }

      // 排序：置顶的在前，然后按创建时间倒序
      filteredSubs.sort((a, b) => {
        // 置顶的优先
        if (a.pinnedOrder !== undefined && b.pinnedOrder === undefined)
          return -1;
        if (a.pinnedOrder === undefined && b.pinnedOrder !== undefined)
          return 1;
        if (a.pinnedOrder !== undefined && b.pinnedOrder !== undefined) {
          return a.pinnedOrder - b.pinnedOrder;
        }
        // 非置顶的按创建时间倒序
        return dayjs(b.createAt).valueOf() - dayjs(a.createAt).valueOf();
      });

      ctx.body = createSuccessResponse(filteredSubs);
    } catch (error) {
      console.error("获取订阅列表错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 创建订阅
  router.post("/api/subscription", authMiddleware, async ctx => {
    try {
      const parsed = subInputSchema.safeParse(ctx.request.body);
      if (!parsed.success) {
        ctx.status = 400;
        ctx.body = createErrorResponse("参数验证失败", 400);
        return;
      }

      const now = dayjs().toISOString();
      const newSub: Subscription = {
        id: uuid.v4(),
        name: parsed.data.name,
        description: parsed.data.description,
        enabled: parsed.data.enabled,
        totalTrafficBytes: parsed.data.totalTrafficBytes,
        startAt: parsed.data.startAt,
        expireAt: parsed.data.expireAt,
        yamlConfig: parsed.data.yamlConfig,
        configMode: parsed.data.configMode || 'yaml',
        visualConfig: parsed.data.visualConfig,
        createAt: now,
        lastUpdatedAt: now
      };

      db.data.subscriptions.push(newSub);
      await db.write();

      ctx.status = 201;
      ctx.body = createSuccessResponse(newSub, "订阅创建成功");
    } catch (error) {
      console.error("创建订阅错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 置顶订阅
  router.put("/api/subscription/pinned", authMiddleware, async ctx => {
    try {
      const { pinnedIds } = ctx.request.body as { pinnedIds: string[] };
      console.log(pinnedIds);
      if (!Array.isArray(pinnedIds)) {
        ctx.status = 400;
        ctx.body = createErrorResponse("参数格式错误");
        return;
      }

      if (pinnedIds.length > 3) {
        ctx.status = 400;
        ctx.body = createErrorResponse("最多只能置顶3个订阅");
        return;
      }

      // 清除所有现有的置顶状态
      db.data.subscriptions.forEach(sub => {
        delete sub.pinnedOrder;
      });

      // 设置新的置顶状态
      pinnedIds.forEach((id: string, index: number) => {
        const sub = db.data.subscriptions.find(s => s.id === id);
        if (sub) {
          sub.pinnedOrder = index;
          sub.lastUpdatedAt = dayjs().toISOString();
        }
      });

      await db.write();
      ctx.body = createSuccessResponse(null, "置顶状态更新成功");
    } catch (error) {
      console.error("更新置顶状态错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 更新订阅
  router.put("/api/subscription/:id", authMiddleware, async ctx => {
    try {
      const { id } = ctx.params;
      const subIndex = db.data.subscriptions.findIndex(s => s.id === id);

      if (subIndex === -1) {
        ctx.status = 404;
        ctx.body = createErrorResponse("订阅不存在");
        return;
      }

      const parsed = subInputSchema.safeParse(ctx.request.body);
      if (!parsed.success) {
        ctx.status = 400;
        ctx.body = createErrorResponse("参数验证失败", 400);
        return;
      }

      const now = dayjs().toISOString();
      const updatedSub: Subscription = {
        ...db.data.subscriptions[subIndex],
        ...parsed.data,
        configMode: parsed.data.configMode || db.data.subscriptions[subIndex].configMode || 'yaml',
        visualConfig: parsed.data.visualConfig,
        lastUpdatedAt: now
      };

      db.data.subscriptions[subIndex] = updatedSub;
      await db.write();

      ctx.body = createSuccessResponse(updatedSub, "订阅更新成功");
    } catch (error) {
      console.error("更新订阅错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 删除订阅
  router.delete("/api/subscription/:id", authMiddleware, async ctx => {
    try {
      const { id } = ctx.params;
      const subIndex = db.data.subscriptions.findIndex(s => s.id === id);

      if (subIndex === -1) {
        ctx.status = 404;
        ctx.body = createErrorResponse("订阅不存在");
        return;
      }

      db.data.subscriptions.splice(subIndex, 1);
      await db.write();

      ctx.body = createSuccessResponse(null, "订阅删除成功");
    } catch (error) {
      console.error("删除订阅错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 启用/禁用订阅
  router.post("/api/subscription/:id/toggle", async ctx => {
    const { id } = ctx.params as { id: string };
    const sub = db.data.subscriptions.find(s => s.id === id);
    if (!sub) {
      ctx.status = 404;
      ctx.body = createErrorResponse("订阅不存在");
    }
    sub.enabled = !sub.enabled;
    sub.lastUpdatedAt = dayjs().toISOString();
    await db.write();

    ctx.body = createSuccessResponse(
      sub,
      `订阅${sub.enabled ? "启用" : "禁用"}成功`
    );
  });

  // 手动拉取节点
  router.post("/api/subscription/:id/fetch-nodes", authMiddleware, async ctx => {
    try {
      const { id } = ctx.params;
      const sub = db.data.subscriptions.find(s => s.id === id);
      if (!sub) {
        ctx.status = 404;
        ctx.body = createErrorResponse("订阅不存在");
        return;
      }

      if (sub.configMode !== 'visual' || !sub.visualConfig?.proxyProviders) {
        ctx.status = 400;
        ctx.body = createErrorResponse("该订阅不是可视化配置模式或没有配置节点来源");
        return;
      }

      let fetchCount = 0;
      for (const provider of sub.visualConfig.proxyProviders) {
        if (provider.type === 'url' && provider.url) {
          try {
            const nodes = await fetchProxyNodesFromUrl(provider.url);
            provider.fetchedNodes = nodes;
            provider.lastFetchTime = dayjs().toISOString();
            fetchCount++;
          } catch (error: any) {
            console.error(`Fetch failed for provider ${provider.name}: ${error.message}`);
            // Keep existing nodes if fetch fails
          }
        }
      }

      if (fetchCount > 0) {
        sub.lastUpdatedAt = dayjs().toISOString();
        await db.write();
        ctx.body = createSuccessResponse(sub, `成功更新了 ${fetchCount} 个订阅源的节点`);
      } else {
        ctx.body = createSuccessResponse(sub, "没有需要更新的订阅源或更新失败");
      }
    } catch (error) {
      console.error("拉取节点错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 订阅接口（公开访问）
  // 订阅url格式：http://192.168.0.1:3001/subscribe?id=c730fb28-3ec0-4196-be40-d667a3e18464&t=176104878698
  router.get("/subscribe", async ctx => {
    try {
      const { id, yaml } = ctx.query as { id: string; yaml: string };
      const sub = db.data.subscriptions.find(s => s.id === id);
      if (!sub) {
        ctx.status = 404;
        ctx.body = createErrorResponse("订阅不存在");
        return;
      }

      if (!sub.enabled) {
        ctx.status = 403;
        ctx.body = createErrorResponse("订阅已禁用");
        return;
      }

      const isForeverValid = !sub.expireAt;
      const isUnlimitTraffic = sub.totalTrafficBytes === null;

      // 检查是否过期
      const now = dayjs();
      let remainingDays = "永久有效";
      let expireTime = "永久有效";
      let totalTraffic: number | string = `"${"无限制"}"`;

      if (!isForeverValid) {
        const startAt = dayjs(sub.startAt);
        const expireAt = dayjs(sub.expireAt);
        if (now.isBefore(startAt) || now.isAfter(expireAt)) {
          ctx.status = 403;
          ctx.body = createErrorResponse("订阅已过期");
          return;
        }
        remainingDays = String(Math.max(0, expireAt.diff(now, "day")));
        expireTime = expireAt.format("YYYY-MM-DD HH:mm:ss");
      }

      if (!isUnlimitTraffic) {
        totalTraffic = sub.totalTrafficBytes || 0;
      }

      const filename = sub.name;
      const updatedAt = dayjs().format("YYYY-MM-DD HH:mm:ss");
      const webPageUrl = process.env.WEB_PAGE_URL;

      const headerComment = [
        `# Subscription Info Header`,
        `info:`,
        ` id: "${id}"  # 订阅ID`,
        ` title: "${filename}"  # 标题`,
        ` website: "${webPageUrl}"  # 网站`,
        ` source: "${ctx.request.protocol}://${ctx.request.host}${ctx.request.url}"  # 来源`,
        ` description: "${sub.description || '由 Sub-Proxy 生成的订阅配置'}"  # 描述`,
        ` upload: 0 # 已上传流量（字节）`,
        ` download: 0 # 已下载流量（字节）`,
        ` total: ${totalTraffic} # 总流量（字节）`,
        ` support: ["clash", "openclash", "clash verge", "shadowrockets"]  # 支持软件`,
        ` remain_days: "${remainingDays}"  # 剩余天数`,
        ` expire_time: "${expireTime}"  # 到期时间`,
        ` last_update: "${updatedAt}"  # 上次更新时间`,
        ``
      ].join("\n");

      const content = `${headerComment}\n\n${
        sub.configMode === 'visual' ? generateVisualYaml(sub) : sub.yamlConfig
      }`;

      // 设置响应头 - 根据环境变量设置不同的缓存策略
      const isDev = process.env.NODE_ENV === "development";
      if (isDev) {
        // 开发环境：不使用任何缓存
        ctx.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
        ctx.set("Pragma", "no-cache");
        ctx.set("Expires", "0");
      } else {
        // 生产环境：1分钟缓存
        ctx.set("Cache-Control", "public, max-age=60");
      }

      // 设置响应头 - 根据yaml参数设置不同的响应头
      if (yaml === "1") {
        ctx.set("Content-Type", "text/yaml; charset=utf-8");
        ctx.set(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(filename)}.yaml"`
        );
      } else {
        ctx.set("Content-Type", "application/octet-stream; charset=utf-8");
        ctx.set(
          "Content-Disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
      }

      // 设置订阅头部信息，TODO: 流量统计功能待实现
      if (!isForeverValid || !isUnlimitTraffic) {
        const expireAt = dayjs(sub.expireAt);
        const expireUnix = !isForeverValid ? expireAt.unix() : 0;
        const totalTraffic = !isUnlimitTraffic ? sub.totalTrafficBytes : 0;
        const uploadBytes = 0;
        const downloadBytes = 4815000000;
        ctx.set(
          "Subscription-Userinfo",
          `upload=${uploadBytes}; download=${downloadBytes}; total=${totalTraffic}; expire=${expireUnix}`
        );
      }
      ctx.set("Profile-Web-Page-Url", webPageUrl); // 订阅页面
      ctx.set("Profile-Update-Interval", "24"); // 更新间隔（小时）
      ctx.set("Profile-Http-Request-Timeout", "24"); // 更新间隔（小时）

      ctx.body = content;
    } catch (error) {
      console.error("订阅获取错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 获取本机局域网 IP 地址
  function getLocalNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // 跳过内部地址和非 IPv4 地址
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "localhost";
  }

  // 获取订阅基础 URL（用于生成订阅链接）
  router.get("/api/subscription-base-url", authMiddleware, async ctx => {
    try {
      let subscriptionBaseUrl: string;

      // 检查是否为开发环境（通过 host 判断）
      const host = ctx.request.host;
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        // 开发环境：使用本机局域网 IP + 端口
        const localIP = getLocalNetworkIP();
        subscriptionBaseUrl = `http://${localIP}:3001`;
      } else {
        // 生产环境：使用当前请求的 host
        const protocol = ctx.request.protocol;
        subscriptionBaseUrl = `${protocol}://${host}`;
      }

      ctx.body = createSuccessResponse({ subscriptionBaseUrl });
    } catch (error) {
      console.error("获取订阅基础 URL 错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 获取设置（暂时没用到，先保留）
  router.get("/api/settings", authMiddleware, async ctx => {
    try {
      const settings = {};

      ctx.body = createSuccessResponse(settings);
    } catch (error) {
      console.error("获取设置错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 更新设置
  router.put("/api/settings", authMiddleware, async ctx => {
    try {
      ctx.body = createSuccessResponse(null, "设置更新成功");
    } catch (error) {
      console.error("更新设置错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 获取用户信息
  router.get("/api/user/profile", authMiddleware, async ctx => {
    try {
      const userId = ctx.state.user.id;
      const user = db.data.users.find(u => u.id === userId);

      if (!user) {
        ctx.status = 404;
        ctx.body = createErrorResponse("用户不存在");
        return;
      }

      // 返回用户信息（不包含密码）
      const userProfile = {
        id: user.id,
        username: user.username,
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      };

      ctx.body = createSuccessResponse(userProfile);
    } catch (error) {
      console.error("获取用户信息错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 更新用户信息
  router.put("/api/user/profile", authMiddleware, async ctx => {
    try {
      const userId = ctx.state.user.id;
      const { username, email, phone } = ctx.request.body as {
        username?: string;
        email?: string;
        phone?: string;
      };

      const userIndex = db.data.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        ctx.status = 404;
        ctx.body = createErrorResponse("用户不存在");
        return;
      }

      // 更新用户信息
      db.data.users[userIndex] = {
        ...db.data.users[userIndex],
        username: username || db.data.users[userIndex].username,
        email: email || "",
        phone: phone || "",
        lastUpdatedAt: new Date().toISOString()
      };

      await db.write();

      // 返回更新后的用户信息
      const updatedUser = db.data.users[userIndex];
      const userProfile = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        avatar: updatedUser.avatar || "",
        createdAt: updatedUser.createdAt,
        lastLoginAt: updatedUser.lastLoginAt
      };

      ctx.body = createSuccessResponse(userProfile, "用户信息更新成功");
    } catch (error) {
      console.error("更新用户信息错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 修改密码
  router.post("/api/user/change-password", authMiddleware, async ctx => {
    try {
      const userId = ctx.state.user.id;
      const { currentPassword, newPassword } = ctx.request.body as {
        currentPassword: string;
        newPassword: string;
      };

      const user = db.data.users.find(u => u.id === userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = createErrorResponse("用户不存在");
        return;
      }

      // 验证当前密码
      const { comparePassword } = await import("./auth.js");
      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        ctx.status = 400;
        ctx.body = createErrorResponse("当前密码不正确");
        return;
      }

      // 加密新密码
      const { hashPassword } = await import("./auth.js");
      const hashedNewPassword = await hashPassword(newPassword);

      // 更新密码
      user.password = hashedNewPassword;
      user.lastUpdatedAt = new Date().toISOString();

      await db.write();

      ctx.body = createSuccessResponse(null, "密码修改成功");
    } catch (error) {
      console.error("修改密码错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 上传头像
  router.post("/api/user/avatar", authMiddleware, async ctx => {
    try {
      const userId = ctx.state.user.id;

      // 检查请求类型
      const contentType = ctx.request.headers["content-type"];
      if (!contentType || !contentType.includes("multipart/form-data")) {
        ctx.status = 400;
        ctx.body = createErrorResponse(
          "请求类型错误，请使用multipart/form-data"
        );
        return;
      }

      // 使用 multer 处理文件上传
      await new Promise<void>((resolve, reject) => {
        upload.single("avatar")(ctx.req as any, ctx.res as any, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // 获取上传的文件
      const file = (ctx.req as any).file;
      if (!file) {
        ctx.status = 400;
        ctx.body = createErrorResponse("请选择要上传的头像文件");
        return;
      }

      const avatarUrl = generateAvatarUrl(`${file.filename}`);

      // 更新用户头像
      const userIndex = db.data.users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        // 删除旧头像文件（如果存在且不是默认头像）
        const oldAvatar = db.data.users[userIndex].avatar;
        if (oldAvatar && oldAvatar.includes("/upload/avatar/")) {
          const oldFilename = oldAvatar.split("/").pop();
          // 保护默认头像文件，不删除 default_avatar.png
          if (oldFilename && oldFilename !== "default_avatar.png") {
            const oldFilePath = path.join(
              __dirname,
              "..",
              "upload",
              "avatar",
              oldFilename
            );
            if (fs.existsSync(oldFilePath)) {
              try {
                fs.unlinkSync(oldFilePath);
                console.log(`已删除旧头像文件: ${oldFilename}`);
              } catch (err) {
                console.warn(`删除旧头像文件失败: ${err}`);
              }
            }
          } else {
            console.log(`保护默认头像文件: ${oldFilename}`);
          }
        }

        db.data.users[userIndex].avatar = avatarUrl;
        db.data.users[userIndex].lastUpdatedAt = new Date().toISOString();
        await db.write();
      }

      ctx.body = createSuccessResponse({ avatarUrl }, "头像上传成功");
    } catch (error) {
      console.error("上传头像错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 备份
  router.get("/api/export", async ctx => {
    try {
      // 只导出订阅和设置，不包含用户数据
      const exportData = {
        subscriptions: db.data.subscriptions,
        settings: db.data.settings
        // 不包含 users 字段
      };

      ctx.set("Content-Type", "application/json");
      ctx.set(
        "Content-Disposition",
        `attachment; filename=sub-proxy-backup-${new Date().toISOString().split("T")[0]}.json`
      );
      ctx.body = createSuccessResponse(exportData);
    } catch (error) {
      console.error("备份导出错误:", error);
      ctx.status = 500;
      ctx.body = createErrorResponse("服务器内部错误");
    }
  });

  // 恢复
  router.post("/api/import", async ctx => {
    const incoming = ctx.request.body as any;

    let importData: Partial<DbSchema>;

    // 检查是否是API响应格式
    if (incoming.success && incoming.data) {
      importData = incoming.data;
    } else if (incoming.subscriptions && incoming.settings) {
      importData = incoming;
    } else {
      ctx.status = 400;
      ctx.body = createErrorResponse("不支持的备份格式");
      return;
    }

    if (
      !importData ||
      !Array.isArray(importData.subscriptions) ||
      !importData.settings
    ) {
      ctx.status = 400;
      ctx.body = createErrorResponse("不支持的备份格式");
      return;
    }

    // 只导入订阅和设置，保留现有用户数据
    db.data.subscriptions = importData.subscriptions;
    db.data.settings = importData.settings;

    await db.write();
    ctx.body = createSuccessResponse(null, "备份导入成功");
  });

  return router;
}
