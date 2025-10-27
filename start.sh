#!/bin/bash

# 创建必要的目录
mkdir -p server/data server/upload/avatar logs

# 初始化数据库文件（如果不存在）
if [ ! -f server/data/db.json ] && [ -f server/data/db_default.json ]; then
    cp server/data/db_default.json server/data/db.json
    echo "初始化数据库文件"
fi

# 复制默认头像文件（如果不存在）
DEFAULT_AVATAR_SOURCE="server/upload/avatar/default_avatar.png"
if [ ! -f "$DEFAULT_AVATAR_SOURCE" ]; then
    echo "复制默认头像文件"
    # 从镜像根目录复制默认头像文件（不会被卷映射覆盖）
    if [ -f "/app/server/default_avatar.png" ]; then
        cp /app/server/default_avatar.png "$DEFAULT_AVATAR_SOURCE"
        echo "默认头像文件已从镜像复制"
    else
        # 如果在容器中也找不到默认头像，则创建一个简单的默认头像
        echo "创建默认头像文件"
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" | base64 -d > "$DEFAULT_AVATAR_SOURCE"
    fi
fi

# 启动应用
exec node server/dist/index.js