# SubProxy 密码重置指南

## 🚀 一键重置密码（推荐）

**复制以下命令，替换 `<容器名称>` 为你的实际容器名称：**

```bash
docker exec <容器名称> sh -c "cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功！保留所有订阅和设置。默认用户名: admin, 密码: admin123456'"
```

## 📋 使用步骤

1. **查找容器名称**：

   ```bash
   docker ps --format "table {{.Names}}\t{{.Status}}"
   ```

2. **执行重置命令**（替换 `your-container-name`）：

   ```bash
   docker exec your-container-name sh -c "cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功！保留所有订阅和设置。默认用户名: admin, 密码: admin123456'"
   ```

3. **立即登录并修改密码**：
   - 访问你的SubProxy管理界面
   - 用户名：`admin`
   - 密码：`admin123456`
   - 登录后立即修改密码

## 🔧 方法二：使用重置脚本（推荐）

如果你更喜欢使用脚本：

```bash
./reset-password.sh <容器名称>
```

示例：

```bash
./reset-password.sh sub-proxy
```

## 🔧 方法三：分步执行

如果需要分步执行：

```bash
# 1. 备份当前数据库
docker exec <容器名称> cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json

# 2. 只重置用户数据（保留订阅和设置）
docker exec <容器名称> node -e "
const fs = require('fs');
const db = JSON.parse(fs.readFileSync('/app/server/data/db.json', 'utf8'));
db.users = [{
  id: 'admin-001',
  username: 'admin',
  password: '\$2b\$10\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',
  createdAt: '2025-10-24T16:35:18.920Z',
  lastLoginAt: null,
  avatar: '/upload/avatar/default_avatar.png',
  email: '',
  phone: '',
  lastUpdatedAt: new Date().toISOString()
}];
fs.writeFileSync('/app/server/data/db.json', JSON.stringify(db, null, 2));
console.log('用户数据已重置');
"

# 3. 确认重置成功
docker exec <容器名称> echo "密码重置完成！保留所有订阅和设置。默认用户名: admin, 密码: admin123456"
```

## 🔧 常见容器名称

- `sub-proxy`
- `sub-proxy-app`

## ⚠️ 重要提醒

- ✅ 原数据库已自动备份
- ✅ **保留所有订阅和设置数据**
- 🔒 重置后请立即修改密码
- 📱 确保容器正在运行
- 🔄 可选：重启容器 `docker restart <容器名称>`

## 🆘 故障排除

**容器未运行**：

```bash
docker start <容器名称>
```

**找不到容器**：

```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

**权限问题**：

```bash
sudo docker exec <容器名称> ...
```

**使用sudo运行脚本**：

```bash
sudo ./reset-password.sh <容器名称>
```

## 📝 默认登录信息

重置后的默认登录信息：

- **用户名**: `admin`
- **密码**: `admin123456`

## 🔒 安全注意事项

1. **立即修改密码**: 重置后请立即登录并修改密码以确保安全
2. **备份已保存**: 原数据库会自动备份，如需恢复请联系管理员
3. **容器必须运行**: 确保容器正在运行才能执行重置操作
4. **权限要求**: 需要Docker执行权限
5. **数据保护**: 只重置用户数据，保留所有订阅和设置
