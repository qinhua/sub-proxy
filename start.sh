#!/bin/bash

# 创建必要的目录
mkdir -p server/data server/upload/avatar logs

# 初始化数据库文件（如果不存在）
if [ ! -f server/data/db.json ] && [ -f server/data/db_default.json ]; then
    cp server/data/db_default.json server/data/db.json
    echo "初始化数据库文件"
fi

# 启动应用
exec node server/dist/index.js