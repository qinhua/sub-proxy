#!/bin/sh

# 密码重置脚本
# 用于在忘记密码后恢复默认用户名和密码

echo "正在重置密码..."

# 检查容器是否运行
if [ -z "$1" ]; then
    echo "用法: $0 <容器名称或ID>"
    echo "示例: $0 sub-proxy"
    exit 1
fi

CONTAINER_NAME=$1

# 检查容器是否存在且正在运行
if ! docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "错误: 容器 '$CONTAINER_NAME' 未运行或不存在"
    echo "请先启动容器: docker start $CONTAINER_NAME"
    exit 1
fi

echo "找到容器: $CONTAINER_NAME"

# 备份当前数据库
echo "备份当前数据库..."
docker exec $CONTAINER_NAME cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json

# 只重置用户数据，保留订阅和设置
echo "重置用户数据（保留订阅和设置）..."
docker exec $CONTAINER_NAME node -e "
const fs = require('fs');
try {
  // 读取当前数据库
  const db = JSON.parse(fs.readFileSync('/app/server/data/db.json', 'utf8'));
  
  // 只重置用户数据，保留订阅和设置
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
  
  // 写回数据库文件
  fs.writeFileSync('/app/server/data/db.json', JSON.stringify(db, null, 2));
  console.log('用户数据重置成功');
} catch (error) {
  console.error('重置失败:', error.message);
  process.exit(1);
}
"

echo "密码重置完成！"
echo ""
echo "✅ 已重置用户数据（保留所有订阅和设置）"
echo "默认登录信息："
echo "用户名: admin"
echo "密码: admin123456"
echo ""
echo "请立即登录并修改密码以确保安全。"
echo "备份文件已保存，如需恢复原数据请联系管理员。"
