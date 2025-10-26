# 使用 pnpm 作为包管理器
FROM node:18-alpine AS base
RUN npm install -g pnpm

# 构建前端阶段
FROM base AS web-builder
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile

COPY web/ ./web/
RUN pnpm --filter web run build

# 构建后端阶段
FROM base AS server-builder
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile

COPY server/ ./server/
RUN pnpm --filter server run build

# 生产镜像阶段
FROM node:18-alpine
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 只安装生产依赖
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN pnpm install --frozen-lockfile --prod

# 拷贝后端构建产物
COPY --from=server-builder /app/server/dist ./server/dist
# 只复制默认数据文件
COPY --from=server-builder /app/server/data/db_default.json ./server/data/
# 只复制默认头像文件
COPY --from=server-builder /app/server/upload/avatar/default_avatar.png ./server/upload/avatar/

# 拷贝前端构建产物
COPY --from=web-builder /app/web/dist ./web/dist

# 拷贝启动脚本
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 启动应用
WORKDIR /app
CMD ["/app/start.sh"]