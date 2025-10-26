# SubProxy 数据持久化配置

## 概述

SubProxy 现在支持完整的数据持久化功能，确保在 Docker 容器重启、升级或重装时不会丢失数据。

## 功能特性

### ✅ 默认数据管理

- 使用 `db_default.json` 作为默认数据源
- 首次启动时自动加载默认数据
- 支持预设订阅配置和管理员账户

### ✅ 数据持久化

- 数据库文件映射到外部目录
- 上传文件（头像等）持久化存储
- 日志文件独立存储

### ✅ 头像保护

- 默认头像文件 `default_avatar.png` 受保护
- 上传新头像时不会删除默认头像
- 支持头像文件的安全管理

## 目录结构

```
sub-proxy/
├── data/                    # 数据库文件（Docker 外部）
│   └── db.json             # 运行时数据库（持久化）
├── uploads/                 # 上传文件（Docker 外部）
│   └── avatar/             # 头像文件（持久化）
│       └── default_avatar.png
├── logs/                   # 日志文件（Docker 外部）
├── backups/              # 数据备份
└── server/data/           # 默认数据（Docker 内部）
    └── db_default.json    # 默认数据模板（不持久化）
```

## 部署方式

### 1. 使用数据持久化部署脚本

```bash
# 基本部署
./deploy-with-persistence.sh

# 自定义 BASE_URL
./deploy-with-persistence.sh "http://192.168.0.1:3001"
```

### 2. 手动部署

```bash
# 创建数据目录
mkdir -p data uploads/avatar logs

# 复制默认数据
cp server/data/db_default.json data/db.json

# 启动服务
docker-compose up -d
```

## 数据管理

### 备份数据

```bash
# 备份所有数据
./manage-data.sh backup
```

备份文件将保存在 `backups/` 目录中，文件名格式为 `subproxy_backup_YYYYMMDD_HHMMSS.tar.gz`

### 恢复数据

```bash
# 恢复最新备份
./manage-data.sh restore
```

### 重置数据

```bash
# 重置为默认数据（会备份当前数据）
./manage-data.sh reset
```

### 查看状态

```bash
# 查看数据状态
./manage-data.sh status
```

## Docker Compose 配置

```yaml
version: "3.8"
services:
  sub-proxy:
    build: .
    container_name: sub-proxy-app
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      # 数据持久化映射（只映射运行时数据）
      - sub-proxy-data:/app/server/data # 运行时数据库
      - sub-proxy-uploads:/app/upload # 用户上传文件
      - sub-proxy-logs:/app/logs # 日志文件
      # 注意：db_default.json 不映射，作为系统默认数据
    environment:
      - NODE_ENV=production
      - PORT=3001
      - BASE_URL=${BASE_URL:-http://localhost:3001}

# 数据卷定义（映射到宿主机目录）
volumes:
  sub-proxy-data: # 映射到 ./data/（运行时数据库）
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./data
  sub-proxy-uploads: # 映射到 ./uploads/（用户上传文件）
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./uploads
  sub-proxy-logs: # 映射到 ./logs/（日志文件）
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./logs
```

## 数据映射说明

### 映射关系

| Docker 内部路径                    | 宿主机路径   | 说明         | 持久化 |
| ---------------------------------- | ------------ | ------------ | ------ |
| `/app/server/data/`                | `./data/`    | 运行时数据库 | ✅     |
| `/app/upload/`                     | `./uploads/` | 用户上传文件 | ✅     |
| `/app/logs/`                       | `./logs/`    | 日志文件     | ✅     |
| `/app/server/data/db_default.json` | 不映射       | 默认数据模板 | ❌     |

### 数据流向

1. **首次启动**：
   - 从容器内的 `db_default.json` 加载默认数据
   - 创建 `./data/db.json`（宿主机）
   - 后续操作都使用 `./data/db.json`

2. **运行时**：
   - 数据库读写：`./data/db.json`（宿主机）
   - 文件上传：`./uploads/`（宿主机）
   - 日志记录：`./logs/`（宿主机）

3. **容器重启**：
   - 直接使用 `./data/db.json`（宿主机）
   - 不重新加载 `db_default.json`

### 为什么 db_default.json 不映射？

- **系统默认数据**：作为应用的一部分，随代码更新
- **避免冲突**：防止用户修改默认数据影响系统
- **版本控制**：默认数据随代码版本变化
- **安全性**：确保系统始终有可用的默认配置

## 数据保护机制

### 默认头像保护

- 系统会保护 `default_avatar.png` 文件
- 上传新头像时不会删除默认头像
- 确保系统始终有可用的默认头像

### 数据备份策略

- 每次重置前自动备份当前数据
- 支持手动备份和恢复
- 备份文件包含所有数据：数据库、上传文件、日志

### 容器重启保护

- 数据目录映射到宿主机
- 容器重启不会影响数据
- 支持容器升级和重装

## 升级流程

### 1. 备份当前数据

```bash
./manage-data.sh backup
```

### 2. 停止服务

```bash
docker-compose down
```

### 3. 更新代码

```bash
git pull
```

### 4. 重新构建和启动

```bash
./deploy-with-persistence.sh
```

### 5. 验证数据

```bash
./manage-data.sh status
```

## 故障排除

### 数据目录权限问题

```bash
# 修复权限
chmod -R 755 data uploads logs
```

### 容器无法启动

```bash
# 查看日志
docker-compose logs

# 检查数据目录
ls -la data/ uploads/ logs/
```

### 数据恢复

```bash
# 从备份恢复
./manage-data.sh restore

# 或重置为默认数据
./manage-data.sh reset
```

## 最佳实践

### 1. 定期备份

建议定期备份数据，特别是在重要操作前：

```bash
# 每日备份（可加入 crontab）
0 2 * * * /path/to/sub-proxy/manage-data.sh backup
```

### 2. 监控磁盘空间

确保数据目录有足够的磁盘空间：

```bash
# 检查磁盘使用
df -h
du -sh data/ uploads/ logs/
```

### 3. 安全配置

- 确保数据目录权限正确
- 定期清理日志文件
- 监控备份文件大小

## 注意事项

1. **首次部署**：确保 `db_default.json` 文件存在
2. **数据迁移**：从旧版本升级时，先备份现有数据
3. **权限设置**：确保 Docker 容器有读写权限
4. **磁盘空间**：预留足够的磁盘空间用于数据存储

## 支持

如果遇到问题，请检查：

1. 数据目录是否存在
2. 文件权限是否正确
3. Docker 服务是否运行
4. 磁盘空间是否充足

更多帮助请查看项目文档或提交 Issue。
