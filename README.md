# SubProxy - 订阅代理管理系统

一个基于 Koa + React 的现代化订阅代理管理系统，支持 Docker 部署和数据持久化。

## ✨ 功能特性

### 🎯 核心功能

- **订阅管理**：创建、编辑、删除、启用/禁用订阅
- **置顶功能**：支持最多3个订阅置顶
- **搜索筛选**：按名称、状态、流量类型、有效期筛选
- **数据统计**：实时显示订阅统计信息
- **用户认证**：安全的登录系统
- **个人中心**：头像上传、个人信息管理

### 🔧 技术特性

- **现代化UI**：基于 Ant Design 的管理界面
- **数据持久化**：Docker 数据卷映射，支持升级不丢失数据
- **默认数据**：预设订阅配置和管理员账户
- **头像保护**：默认头像文件受保护
- **自动配置**：智能 baseUrl 配置

## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (开发环境)

### 一键部署

```bash
# 克隆项目
git clone <repository-url>
cd sub-proxy

# 一键部署
./deploy-with-persistence.sh

# 自定义 BASE_URL
./deploy-with-persistence.sh "http://192.168.0.1:3001"
```

### 访问系统

- **管理界面**：http://localhost:3001
- **默认账号**：admin
- **默认密码**：admin123456

## 📁 项目结构

```
sub-proxy/
├── server/                # 后端服务
│   ├── src/               # 源代码
│   │   ├── index.ts       # 服务入口
│   │   ├── routes.ts      # API 路由
│   │   ├── db.ts          # 数据库
│   │   ├── auth.ts        # 认证
│   │   └── types.ts       # 类型定义
│   └── data/              # 数据文件
│       └── db_default.json # 默认数据
├── web/                   # 前端应用
│   ├── src/               # 源代码
│   │   ├── App.tsx        # 主应用
│   │   ├── pages/         # 页面组件
│   │   ├── contexts/      # 上下文
│   │   └── utils/         # 工具函数
│   └── dist/              # 构建输出
├── data/                  # 运行时数据（持久化）
├── uploads/               # 上传文件（持久化）
├── logs/                  # 日志文件（持久化）
└── backups/               # 数据备份
```

## 🛠️ 开发环境

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build
```

### 环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
vim .env
```

## 📦 部署方式

### 1. Docker Compose 部署（推荐）

```bash
# 使用数据持久化部署
./deploy-with-persistence.sh

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 软路由/NAS部署

详见 [部署文档](DEPLOYMENT.md)

## 💾 数据管理

### 备份数据

```bash
# 备份所有数据
./manage-data.sh backup
```

### 恢复数据

```bash
# 恢复最新备份
./manage-data.sh restore
```

### 重置数据

```bash
# 重置为默认数据
./manage-data.sh reset
```

### 查看状态

```bash
# 查看数据状态
./manage-data.sh status
```

## 🔧 配置说明

### 数据持久化

| Docker 内部路径                    | 宿主机路径   | 说明         | 持久化 |
| ---------------------------------- | ------------ | ------------ | ------ |
| `/app/server/data/`                | `./data/`    | 运行时数据库 | ✅     |
| `/app/upload/`                     | `./uploads/` | 用户上传文件 | ✅     |
| `/app/logs/`                       | `./logs/`    | 日志文件     | ✅     |
| `/app/server/data/db_default.json` | 不映射       | 默认数据模板 | ❌     |

### 环境变量

```bash
# 基础 URL 配置
BASE_URL=http://192.168.0.1:3001

# 数据库配置
NODE_ENV=production
PORT=3001
```

## 📚 文档

- [数据持久化配置](docs/DATA_PERSISTENCE.md)
- [软路由/NAS部署](DEPLOYMENT.md)

## 🔄 升级流程

### 1. 备份数据

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

### 4. 重新部署

```bash
./deploy-with-persistence.sh
```

### 5. 验证数据

```bash
./manage-data.sh status
```

## 🛡️ 安全说明

- 默认管理员密码：`admin123456`
- 建议首次登录后立即修改密码
- 生产环境请使用强密码
- 定期备份重要数据

## 🐛 故障排除

### 常见问题

1. **容器无法启动**

   ```bash
   # 查看日志
   docker-compose logs

   # 检查数据目录权限
   chmod -R 755 data uploads logs
   ```

2. **数据丢失**

   ```bash
   # 从备份恢复
   ./manage-data.sh restore
   ```

3. **端口冲突**
   ```bash
   # 修改 docker-compose.yml 中的端口映射
   ports:
     - "3002:3001"  # 使用不同端口
   ```

### 日志查看

```bash
# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f sub-proxy
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如果遇到问题，请：

1. 查看 [故障排除](#-故障排除) 部分
2. 检查 [文档](docs/) 目录
3. 提交 Issue 描述问题

---

**SubProxy** - 让订阅管理更简单！
