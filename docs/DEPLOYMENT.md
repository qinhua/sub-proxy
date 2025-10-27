# 🚀 SubProxy 完整部署指南

## 📋 目录

- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [数据持久化](#数据持久化)
- [密码重置](#密码重置)
- [DockerHub 推送](#dockerhub-推送)
- [故障排除](#故障排除)

## 🚀 快速开始

### 镜像信息

- **镜像文件**: `sub-proxy.tar` (约 90MB)
- **镜像标签**: `sub-proxy:latest`
- **基础镜像**: `alpine:latest` (兼容 iStoreOS)
- **默认端口**: `3001`
- **默认账号**: `admin` / `admin123456`

### 一键部署

```bash
# 1. 导入镜像
docker load -i sub-proxy.tar

# 2. 创建数据目录
mkdir -p /opt/sub-proxy/{data,upload,logs}

# 3. 启动容器（本地）
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/upload:/app/server/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  sub-proxy:latest

# 4. 验证部署
curl http://localhost:3001/health
```

## 🐳 Docker 部署

### 普通部署

```bash
# 创建数据目录
mkdir -p /opt/sub-proxy/{data,upload,logs}

# 启动容器，（数据卷根据情况自己修改）
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/upload:/app/server/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  marekqin/sub-proxy:latest
/bin/sh -c ./start.sh
```

### Docker Compose 部署

```bash
# 使用 docker-compose.yml
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 💾 数据持久化

### 数据目录说明

| 目录      | 用途       | 挂载路径             |
| --------- | ---------- | -------------------- |
| `data/`   | 数据库文件 | `/app/server/data`   |
| `upload/` | 上传文件   | `/app/server/upload` |
| `logs/`   | 日志文件   | `/app/logs`          |

### 数据备份

```bash
# 备份数据
tar -czf subproxy_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  /opt/sub-proxy/data \
  /opt/sub-proxy/upload \
  /opt/sub-proxy/logs

# 恢复数据
tar -xzf subproxy_backup_20241201_120000.tar.gz
```

### 数据重置

```bash
# 停止服务
docker stop sub-proxy-app

# 备份当前数据
cp -r /opt/sub-proxy/data /opt/sub-proxy/data.backup

# 删除数据目录
rm -rf /opt/sub-proxy/data/*

# 重启服务（将自动加载默认数据）
docker start sub-proxy-app
```

## 🔐 密码重置

### 一键重置密码

```bash
# 替换 <容器名称> 为你的实际容器名称
docker exec <容器名称> sh -c "cp /app/server/data/db.json /app/server/data/db_backup_\$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功！默认用户名: admin, 密码: admin123456'"
```

### 使用重置脚本

```bash
# 使用项目提供的重置脚本
./reset-password.sh <容器名称>
```

## 🐳 DockerHub 推送

### 推送步骤

```bash
# 1. 登录 DockerHub
docker login

# 2. 给镜像打标签
docker tag sub-proxy:latest YOUR_USERNAME/sub-proxy:latest
docker tag sub-proxy:latest YOUR_USERNAME/sub-proxy:1.0.0

# 3. 推送镜像
docker push YOUR_USERNAME/sub-proxy:latest
docker push YOUR_USERNAME/sub-proxy:1.0.0
```

### 使用推送脚本

```bash
# 使用项目提供的推送脚本
./push-to-dockerhub.sh YOUR_USERNAME
```

## 🔍 故障排除

### 常见问题

#### 1. 容器启动失败

```bash
# 查看详细日志
docker logs sub-proxy-app

# 检查端口占用
netstat -tlnp | grep 3001
```

#### 2. 无法访问服务

```bash
# 检查防火墙
iptables -L | grep 3001

# 检查端口映射
docker port sub-proxy-app
```

#### 3. 数据丢失

```bash
# 检查数据卷挂载
docker inspect sub-proxy-app | grep Mounts

# 恢复数据
cp -r /opt/sub-proxy/data.backup/* /opt/sub-proxy/data/
```

### 管理命令

```bash
# 停止服务
docker stop sub-proxy-app

# 重启服务
docker restart sub-proxy-app

# 删除容器
docker stop sub-proxy-app && docker rm sub-proxy-app

# 更新服务
docker stop sub-proxy-app
docker rm sub-proxy-app
docker load -i sub-proxy-new.tar
docker run -d [参数...] sub-proxy:latest
```

## 📱 访问地址

部署成功后，可以通过以下地址访问，默认端口 3001：

- **管理界面**: `http://你的IP:3001`
- **健康检查**: `http://你的IP:3001/health`
- **API 接口**: `http://你的IP:3001/api/settings`
- **订阅接口**: `http://你的IP:3001/subscribe?id=订阅ID`

## 🎯 最佳实践

1. **使用固定端口**: 避免端口冲突
2. **数据备份**: 定期备份数据目录
3. **监控日志**: 定期检查容器日志
4. **资源限制**: 设置内存限制防止资源耗尽
5. **健康检查**: 启用健康检查确保服务稳定
