# 🚀 软路由/NAS 部署指南

## 📦 准备工作

1. **导入镜像**

   ```bash
   # 将 sub-proxy.tar 复制到软路由后，导入镜像
   docker load -i sub-proxy.tar
   ```

2. **创建数据目录**
   ```bash
   mkdir -p ./server/data
   mkdir -p ./logs
   ```

## 🐳 Docker Run 命令

### 基础命令

```bash
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v $(pwd)/server/data:/app/server/data \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e BASE_URL="http://你的软路由IP:3001" \
  sub-proxy:latest
```

### 完整命令（推荐）

```bash
# 创建数据目录
mkdir -p /opt/sub-proxy/data
mkdir -p /opt/sub-proxy/uploads
mkdir -p /opt/sub-proxy/logs

# 启动容器（使用内部启动脚本）
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/uploads:/app/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e BASE_URL="http://你的软路由IP:3001" \
  --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:3001/health" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --memory=512m \
  --memory-reservation=256m \
  --entrypoint="/app/start.sh" \
  sub-proxy:latest
```

## ⚠️ 重要说明

### 关于 `$(pwd)` 变量

- `$(pwd)` 是 shell 变量，表示当前工作目录
- 在软路由环境中可能不适用，建议使用绝对路径
- 推荐使用 `/opt/sub-proxy/` 作为数据目录

### 关于启动脚本

- 容器内部包含 `start.sh` 启动脚本
- 使用 `--entrypoint="/app/start.sh"` 可以确保正确启动
- 启动脚本会处理 Node.js 路径和权限问题

## 🔧 参数说明

| 参数           | 说明         | 示例                                         |
| -------------- | ------------ | -------------------------------------------- |
| `--name`       | 容器名称     | `sub-proxy-app`                              |
| `--restart`    | 重启策略     | `unless-stopped`                             |
| `-p`           | 端口映射     | `3001:3001` 或 `8080:3001`                   |
| `-v`           | 数据卷挂载   | 数据持久化                                   |
| `-e BASE_URL`  | 外部访问地址 | `http://192.168.0.1:3001`                    |
| `--entrypoint` | 启动脚本     | `/app/start.sh`                              |
| `--health-cmd` | 健康检查     | `wget --spider http://localhost:3001/health` |

## 📋 部署步骤

### 1. 快速部署

```bash
# 使用数据持久化部署脚本（推荐）
./deploy-with-persistence.sh "http://192.168.0.1:3001"
```

### 2. 手动部署

```bash
# 1. 导入镜像
docker load -i sub-proxy.tar

# 2. 创建目录
mkdir -p ./server/data ./logs

# 3. 运行容器
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v $(pwd)/server/data:/app/server/data \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e BASE_URL="http://192.168.0.1:3001" \
  sub-proxy:latest

# 4. 检查状态
docker ps
curl http://192.168.0.1:3001/health
```

## 🧪 验证部署

### 检查服务状态

```bash
# 检查容器状态
docker ps | grep sub-proxy

# 检查健康状态
curl http://你的IP:3001/health

# 检查配置
curl http://你的IP:3001/api/settings
```

### 查看日志

```bash
# 查看容器日志
docker logs sub-proxy-app

# 实时查看日志
docker logs -f sub-proxy-app
```

## 🛠️ 管理命令

### 停止服务

```bash
docker stop sub-proxy-app
```

### 重启服务

```bash
docker restart sub-proxy-app
```

### 删除容器

```bash
docker stop sub-proxy-app
docker rm sub-proxy-app
```

### 更新服务

```bash
# 停止并删除旧容器
docker stop sub-proxy-app
docker rm sub-proxy-app

# 重新导入新镜像
docker load -i sub-proxy-new.tar

# 重新运行容器
docker run -d [参数...] sub-proxy:latest
```

## 🔍 故障排除

### 1. 容器启动失败

```bash
# 查看详细日志
docker logs sub-proxy-app

# 检查端口占用
netstat -tlnp | grep 3001
```

### 2. 无法访问服务

```bash
# 检查防火墙
iptables -L | grep 3001

# 检查端口映射
docker port sub-proxy-app
```

### 3. 数据丢失

```bash
# 检查数据卷挂载
docker inspect sub-proxy-app | grep Mounts

# 恢复数据
cp -r ./server/data.backup/* ./server/data/
```

## 📱 访问地址

部署成功后，可以通过以下地址访问：

- **管理界面**: `http://你的软路由IP:3001`
- **健康检查**: `http://你的软路由IP:3001/health`
- **API 接口**: `http://你的软路由IP:3001/api/settings`
- **订阅接口**: `http://你的软路由IP:3001/subscribe?id=订阅ID`

## 🎯 最佳实践

1. **使用固定端口**: 避免端口冲突
2. **数据备份**: 定期备份 `./server/data` 目录
3. **监控日志**: 定期检查容器日志
4. **资源限制**: 设置内存限制防止资源耗尽
5. **健康检查**: 启用健康检查确保服务稳定

---

**SubProxy** - 让订阅管理更简单 🚀
