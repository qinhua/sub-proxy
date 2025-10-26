#!/bin/sh
cd /app

# 创建必要的目录结构
mkdir -p server/data
mkdir -p server/upload/avatar
mkdir -p logs

# 如果 db.json 不存在，复制默认数据
if [ ! -f server/data/db.json ]; then
    cp server/data/db_default.json server/data/db.json
    echo "初始化数据库文件"
fi

exec node server/dist/index.js
