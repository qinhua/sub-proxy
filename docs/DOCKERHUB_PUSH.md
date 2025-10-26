# 🐳 DockerHub 推送指南

## 📋 推送步骤

### 1. 登录DockerHub

```bash
docker login
# 输入你的DockerHub用户名和密码
```

### 2. 给镜像打标签

```bash
# 替换 YOUR_USERNAME 为你的DockerHub用户名
docker tag sub-proxy:latest YOUR_USERNAME/sub-proxy:latest
docker tag sub-proxy:latest YOUR_USERNAME/sub-proxy:1.0.0
```

### 3. 推送镜像

```bash
# 推送latest版本
docker push YOUR_USERNAME/sub-proxy:latest

# 推送版本标签
docker push YOUR_USERNAME/sub-proxy:1.0.0
```

## 🚀 一键推送脚本

创建推送脚本：

```bash
#!/bin/bash
# 替换 YOUR_USERNAME 为你的DockerHub用户名
USERNAME="YOUR_USERNAME"
VERSION="1.0.0"

echo "🐳 开始推送到DockerHub..."

# 登录DockerHub
docker login

# 打标签
docker tag sub-proxy:latest $USERNAME/sub-proxy:latest
docker tag sub-proxy:latest $USERNAME/sub-proxy:$VERSION

# 推送
docker push $USERNAME/sub-proxy:latest
docker push $USERNAME/sub-proxy:$VERSION

echo "✅ 推送完成！"
echo "📦 镜像地址: https://hub.docker.com/r/$USERNAME/sub-proxy"
```

## 📦 使用推送的镜像

其他人可以使用你的镜像：

```bash
# 拉取镜像
docker pull YOUR_USERNAME/sub-proxy:latest

# 运行容器
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/upload:/app/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  YOUR_USERNAME/sub-proxy:latest
```

## 🔧 npm脚本使用

```bash
# 构建镜像
pnpm run docker:build

# 打标签（需要手动指定用户名）
docker tag sub-proxy:latest YOUR_USERNAME/sub-proxy:latest

# 推送（需要手动指定完整标签）
docker push YOUR_USERNAME/sub-proxy:latest
```
