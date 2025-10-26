# 🚀 SubProxy 快速部署指南

## 📦 镜像信息

- **镜像文件**: `sub-proxy.tar` (92MB)
- **镜像标签**: `sub-proxy:latest`
- **基础镜像**: `alpine:latest` (简化版，兼容iStoreOS)

## 🔧 iStoreOS 部署命令

### 1. 加载镜像

```bash
docker load -i sub-proxy.tar
```

### 2. 创建数据目录

```bash
mkdir -p /opt/sub-proxy/data
mkdir -p /opt/sub-proxy/uploads
mkdir -p /opt/sub-proxy/logs
```

### 3. 启动容器

```bash
docker run -d \
  --name sub-proxy-app \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/sub-proxy/data:/app/server/data \
  -v /opt/sub-proxy/uploads:/app/upload \
  -v /opt/sub-proxy/logs:/app/logs \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e BASE_URL="http://你的iStoreOS IP:3001" \
  sub-proxy:latest
```

### 4. 访问应用

- **管理界面**: `http://你的iStoreOS IP:3001`
- **默认账号**: `admin` / `admin123456`

## 🔄 密码重置

```bash
docker exec sub-proxy-app sh -c "cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功！默认用户名: admin, 密码: admin123456'"
```

## 📊 构建脚本说明

### 可用的npm脚本：

- `pnpm run docker:build` - 构建镜像
- `pnpm run docker:build:tag` - 构建带时间戳的镜像
- `pnpm run docker:save` - 导出镜像为tar文件
- `pnpm run docker:load` - 从tar文件加载镜像

## ✅ 关键改进

- ✅ 使用 `alpine:latest` 基础镜像（更小更兼容）
- ✅ 移除了复杂的启动脚本依赖
- ✅ 移除了用户权限设置
- ✅ 使用内联CMD命令启动
- ✅ 完全兼容iStoreOS/OpenWrt系统
