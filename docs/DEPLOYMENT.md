# 🚀 SubProxy 部署指南

本指南整合了部署、数据持久化、密码重置、DockerHub 推送与常见排障流程。  
目标：步骤清晰、命令可直接执行、关键信息不遗漏。

## 1. 部署前准备

- Docker / Docker Compose 已安装
- 服务器放行端口 `3001`
- 建议预先创建数据目录（便于持久化和备份）

```bash
# 创建数据目录
mkdir -p /opt/sub-proxy/{data,upload,logs}
```

默认信息：

- 管理地址：`http://你的IP:5173`
- 默认账号：`admin`
- 默认密码：`admin123456`

---

## 2. 三种部署方式（按场景选一种）

### 方式 A：DockerHub 镜像部署（推荐）

```bash
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/upload:/app/server/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  -e NODE_ENV=production \
  -e WEB_PAGE_URL=https://sub-proxy.bbchin.com:50000 \
  marekqin/sub-proxy:latest
```

### 方式 B：本地 tar 镜像部署（离线场景）

```bash
# 1) 导入镜像
docker load -i sub-proxy.tar

# 2) 启动容器
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/upload:/app/server/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  -e NODE_ENV=production \
  -e WEB_PAGE_URL=https://sub-proxy.bbchin.com:50000 \
  sub-proxy:latest
```

### 方式 C：Docker Compose 项目目录下直接部署

```bash
docker-compose up -d
docker-compose ps
```

---

## 3. 部署后验证（必须做）

```bash
# 健康检查
curl http://localhost:3001/health

# 查看容器状态
docker ps | grep sub-proxy

# 查看日志
docker logs -f sub-proxy-app
```

---

## 4. 数据持久化与备份

挂载目录建议固定如下：

- `/opt/sub-proxy/data` → `/app/server/data`（数据库）
- `/opt/sub-proxy/upload` → `/app/server/upload`（上传文件）
- `/opt/sub-proxy/logs` → `/app/logs`（日志）

### 备份

```bash
tar -czf subproxy_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  /opt/sub-proxy/data \
  /opt/sub-proxy/upload \
  /opt/sub-proxy/logs
```

### 恢复

```bash
tar -xzf subproxy_backup_20241201_120000.tar.gz
```

### 重置数据（谨慎）

```bash
docker stop sub-proxy-app
cp -r /opt/sub-proxy/data /opt/sub-proxy/data.backup
rm -rf /opt/sub-proxy/data/*
docker start sub-proxy-app
```

---

## 5. 密码重置（保留订阅和设置）

### 脚本方式（推荐）

```bash
./reset-password.sh <容器名称>
```

### 直接命令方式

```bash
docker exec <容器名称> sh -c "cp /app/server/data/db.json /app/server/data/db_backup_\$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功：admin / admin123456'"
```

---

## 6. 镜像推送到 DockerHub

### 手动推送

```bash
# 1) 登录
docker login

# 2) 打标签
docker tag sub-proxy:latest YOUR_DOCKERHUB_USERNAME/sub-proxy:latest
docker tag sub-proxy:latest YOUR_DOCKERHUB_USERNAME/sub-proxy:1.0.0

# 3) 推送
docker push YOUR_DOCKERHUB_USERNAME/sub-proxy:latest
docker push YOUR_DOCKERHUB_USERNAME/sub-proxy:1.0.0
```

### 脚本一键推送

> 使用 push-to-dockerhub.sh 脚本一键推送镜像到 DockerHub。

```bash
# A.直接运行脚本
./push-to-dockerhub.sh YOUR_DOCKERHUB_USERNAME
```

```bash
# B.通过 pnpm 命令执行

# 1.构建镜像
pnpm run docker:build

# 2.推送镜像
pnpm run docker:publish
```

推送后可用：

```bash
docker pull YOUR_DOCKERHUB_USERNAME/sub-proxy:latest
```

---

## 7. 常用运维命令

```bash
# 停止
docker stop sub-proxy-app

# 启动
docker start sub-proxy-app

# 重启
docker restart sub-proxy-app

# 删除容器（不删宿主机挂载数据）
docker stop sub-proxy-app && docker rm sub-proxy-app

# 更新服务
docker stop sub-proxy-app
docker rm sub-proxy-app
docker load -i sub-proxy-new.tar
docker run -d [参数...] sub-proxy:latest
```

---

## 8. 常见问题排查

### 容器启动失败

```bash
docker logs sub-proxy-app
```

### 端口无法访问

```bash
docker port sub-proxy-app
netstat -tlnp | grep 3001
iptables -L | grep 3001
```

### 怀疑数据未挂载

```bash
docker inspect sub-proxy-app | grep Mounts
```

---

## 9. 访问入口

- 管理界面：`http://你的IP:5173`
- 健康检查：`http://你的IP:3001/health`
- 设置接口：`http://你的IP:3001/api/settings`
- 订阅接口：`http://你的IP:3001/subscribe?id=订阅ID`

## 🎯 最佳实践

1. **使用固定端口**: 避免端口冲突
2. **数据备份**: 定期备份数据目录
3. **监控日志**: 定期检查容器日志
4. **资源限制**: 设置内存限制防止资源耗尽
5. **健康检查**: 启用健康检查确保服务稳定

