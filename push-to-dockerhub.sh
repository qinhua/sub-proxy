#!/bin/bash

# DockerHub推送脚本
# 使用方法: ./push-to-dockerhub.sh YOUR_USERNAME

set -e

if [ $# -eq 0 ]; then
    echo "❌ 请提供DockerHub用户名"
    echo "使用方法: ./push-to-dockerhub.sh YOUR_USERNAME"
    echo "例如: ./push-to-dockerhub.sh qinhua"
    exit 1
fi

USERNAME=$1
VERSION="1.0.0"
IMAGE_NAME="sub-proxy"

echo "🐳 开始推送到DockerHub..."
echo "用户名: $USERNAME"
echo "镜像: $IMAGE_NAME"
echo "版本: $VERSION"
echo "========================="

# 检查镜像是否存在
if ! docker images | grep -q "$IMAGE_NAME.*latest"; then
    echo "❌ 镜像 $IMAGE_NAME:latest 不存在"
    echo "请先运行: pnpm run docker:build"
    exit 1
fi

# 登录DockerHub
echo "🔐 登录DockerHub..."
docker login

# 打标签
echo "🏷️  给镜像打标签..."
docker tag $IMAGE_NAME:latest $USERNAME/$IMAGE_NAME:latest
docker tag $IMAGE_NAME:latest $USERNAME/$IMAGE_NAME:$VERSION

# 推送
echo "📤 推送镜像到DockerHub..."
docker push $USERNAME/$IMAGE_NAME:latest
docker push $USERNAME/$IMAGE_NAME:$VERSION

echo ""
echo "✅ 推送完成！"
echo "📦 镜像地址: https://hub.docker.com/r/$USERNAME/$IMAGE_NAME"
echo ""
echo "其他人可以使用以下命令拉取镜像："
echo "docker pull $USERNAME/$IMAGE_NAME:latest"
echo ""
echo "运行容器："
echo "docker run -d --name sub-proxy-app --restart unless-stopped -p 3001:3001 -v /opt/sub-proxy/data:/app/server/data -v /opt/sub-proxy/uploads:/app/upload -v /opt/sub-proxy/logs:/app/logs -e NODE_ENV=production -e PORT=3001 $USERNAME/$IMAGE_NAME:latest"
