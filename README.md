<p align="center">
   <a class="logo" href="https://github.com/qinhua/sub-proxy">
     <img src="./docs/logo.jpg" style="width:120px;border-radius:50%" alt="SubProxy"/>
   </a>
</p>
<h1 align="center">SubProxy</h1>
<p align="center">一个基于 Koa + React 的现代订阅代理管理系统，支持 Docker 部署和数据持久化。</p>
<p class="badge-row" align="center">
  <a href="https://react.docschina.org" target="_blank">
    <img src="https://img.shields.io/badge/react-18.3.1-cyan?logo=react" alt="React"/>
  </a>
  <a href="https://koajs.com/" target="_blank">
    <img src="https://img.shields.io/badge/koajs-3.0.3-green" alt="KoaJS"/>
  </a>
  <a href="https://docker.com/" target="_blank">
    <img src="https://img.shields.io/badge/docker-gray?style=flat&logo=docker" alt="Docker"/>
  </a>
  <a href="https://clashvergerev.com/" target="_blank">
    <img src="https://img.shields.io/badge/Shadowrockets-aa46aa?style=flat&label=Clash" alt="supports"/>
  </a>
  <a href="https://github.com/qinhua/sub-proxy/blob/main/LICENSE" target="_blank">
    <img src="https://img.shields.io/badge/License-MIT-orange" alt="License"/>
  </a>
</p>

---

## ✨ 功能特性

### 🎯 核心功能

- **订阅管理**：创建、编辑、删除、启用/禁用订阅
- **置顶功能**：支持最多3个订阅置顶，固定显示在列表顶部
- **搜索筛选**：按名称、状态、流量类型、有效期筛选，支持实时搜索
- **数据统计**：实时显示订阅统计信息，包括总数、启用数、无限流量数等
- **用户认证**：安全的JWT登录系统，支持密码重置
- **个人中心**：头像上传、个人信息管理、账户设置
- **数据备份**：支持数据导入导出，自动备份保护

### 🔧 技术特性

- **现代化UI**：基于 Ant Design 的管理界面，响应式设计
- **数据持久化**：Docker 数据卷映射，支持升级不丢失数据
- **默认数据**：预设订阅配置和管理员账户，开箱即用
- **头像保护**：默认头像文件受保护，上传新头像不会删除默认头像
- **智能配置**：自动检测环境，智能配置 baseUrl
- **类型安全**：TypeScript 全栈开发，共享类型定义
- **Monorepo**：统一管理前后端代码，支持独立构建和部署

## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (开发环境)
- 支持 Clash、Shadowrocket 等代理客户端

### 📱 支持的客户端

- **Clash**: Clash for Windows, ClashX, Clash Verge
- **Shadowrocket**: iOS 设备
- **其他**: 支持标准订阅链接格式的客户端

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

- **管理界面**：http://localhost:5173
- **默认账号**：admin
- **默认密码**：admin123456

## 📁 项目结构

```
sub-proxy/
├── server/                    # 后端服务 (Koa.js)
│   ├── src/                   # 源代码
│   │   ├── index.ts           # 服务入口
│   │   ├── routes.ts          # API 路由
│   │   ├── authRoutes.ts      # 认证路由
│   │   ├── db.ts              # 数据库管理
│   │   ├── auth.ts            # 认证逻辑
│   │   └── types.ts           # 类型定义
│   ├── data/                  # 数据文件
│   │   └── db_default.json    # 默认数据模板
│   └── upload/                 # 上传文件目录
│       └── avatar/             # 头像文件
├── web/                       # 前端应用 (React + Vite)
│   ├── src/                   # 源代码
│   │   ├── App.tsx            # 主应用组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── Login.tsx      # 登录页面
│   │   │   ├── SubscriptionList.tsx    # 订阅列表
│   │   │   ├── SubscriptionForm.tsx    # 订阅表单
│   │   │   └── Settings.tsx   # 设置页面
│   │   ├── contexts/          # React 上下文
│   │   ├── utils/             # 工具函数
│   │   └── types.ts           # 类型定义
│   └── dist/                  # 构建输出
├── shared/                    # 共享代码
│   └── types/                 # 共享类型定义
├── docs/                      # 项目文档
├── data/                      # 运行时数据（Docker 映射）
├── uploads/                   # 上传文件（Docker 映射）
├── logs/                      # 日志文件（Docker 映射）
├── backups/                   # 数据备份
├── docker-compose.yml         # Docker Compose 配置
├── Dockerfile                 # Docker 镜像构建
├── deploy-with-persistence.sh # 部署脚本
├── manage-data.sh             # 数据管理脚本
└── reset-password.sh          # 密码重置脚本
```

## 🎯 功能演示

### 📊 管理界面

- **仪表板**: 实时统计订阅数据，一目了然
- **订阅列表**: 支持置顶、搜索、筛选，操作便捷
- **订阅编辑**: 可视化表单，支持无限流量和永久有效设置
- **个人中心**: 头像上传、信息管理、密码修改

### 🔧 管理功能

- **数据备份**: 一键导出/导入，保护数据安全
- **密码重置**: 忘记密码时快速恢复，保留所有数据
- **置顶管理**: 重要订阅置顶显示，最多支持3个
- **实时搜索**: 输入即搜索，支持多条件筛选

### 📱 客户端支持

- **订阅链接**: 标准格式，兼容主流客户端
- **动态更新**: 实时同步订阅状态和配置
- **多端同步**: 一处修改，处处生效

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

详见 [部署文档](docs/DEPLOYMENT.md)

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

- [软路由/NAS部署](docs/DEPLOYMENT.md) - 软路由和NAS环境部署指南
- [数据持久化配置](docs/DATA_PERSISTENCE.md) - 数据持久化、备份恢复、升级流程
- [密码重置指南](docs/DOCKER_PASSWORD_RESET.md) - 忘记密码后的恢复方法

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

### 🔑 密码重置

如果忘记密码，可以使用以下命令重置（**保留所有订阅和设置**）：

```bash
# 使用脚本重置（推荐）
./reset-password.sh <容器名称>

# 或使用Docker命令
docker exec <容器名称> sh -c "cp /app/server/data/db.json /app/server/data/db_backup_$(date +%Y%m%d_%H%M%S).json && node -e \"const fs=require('fs'); const db=JSON.parse(fs.readFileSync('/app/server/data/db.json','utf8')); db.users=[{id:'admin-001',username:'admin',password:'\\\$2b\\\$10\\\$0jOBh3OCJN4BeVCBPM8hTO3cHzCvhFRcuJpDm30k5ht1uJ.mozthK',createdAt:'2025-10-24T16:35:18.920Z',lastLoginAt:null,avatar:'/upload/avatar/default_avatar.png',email:'',phone:'',lastUpdatedAt:new Date().toISOString()}]; fs.writeFileSync('/app/server/data/db.json',JSON.stringify(db,null,2));\" && echo '✅ 密码重置成功！保留所有订阅和设置。默认用户名: admin, 密码: admin123456'"
```

**重置后默认登录信息：**

- **用户名**: `admin`
- **密码**: `admin123456`

## 🐛 故障排除

### 常见问题

1. **容器无法启动**

   ```bash
   # 查看详细日志
   docker-compose logs

   # 检查数据目录权限
   chmod -R 755 data uploads logs

   # 检查端口占用
   netstat -tlnp | grep 3001
   ```

2. **数据丢失**

   ```bash
   # 从备份恢复
   ./manage-data.sh restore

   # 重置为默认数据
   ./manage-data.sh reset
   ```

3. **端口冲突**

   ```bash
   # 修改 docker-compose.yml 中的端口映射
   ports:
     - "3002:3001"  # 使用不同端口
   ```

4. **忘记密码**

   ```bash
   # 使用密码重置脚本
   ./reset-password.sh <容器名称>
   ```

5. **无法访问服务**

   ```bash
   # 检查防火墙设置
   iptables -L | grep 3001

   # 检查容器状态
   docker ps | grep sub-proxy

   # 检查健康状态
   curl http://localhost:3001/health
   ```

### 日志查看

```bash
# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f sub-proxy

# 查看容器日志
docker logs <容器名称>
```

## 📄 许可证

<a href="https://github.com/qinhua/sub-proxy/blob/main/LICENSE" target="_blank">MIT License</a>

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南

1. **Fork 项目** 到你的 GitHub 账户
2. **创建分支** `git checkout -b feature/your-feature`
3. **提交更改** `git commit -m 'Add some feature'`
4. **推送分支** `git push origin feature/your-feature`
5. **提交 Pull Request**

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码规范
- 添加适当的注释和文档
- 确保测试通过

## 📞 支持

如果遇到问题，请：

1. 查看 [故障排除](#-故障排除) 部分
2. 检查 [文档](docs/) 目录
3. 搜索 [Issues](https://github.com/qinhua/sub-proxy/issues) 看是否有类似问题
4. 提交 [新 Issue](https://github.com/qinhua/sub-proxy/issues/new) 描述问题

### 社区

- **GitHub**: [qinhua/sub-proxy](https://github.com/qinhua/sub-proxy)
- **Issues**: [问题反馈](https://github.com/qinhua/sub-proxy/issues)
- **Discussions**: [讨论区](https://github.com/qinhua/sub-proxy/discussions)

---

<br/>

<div align="center">

**SubProxy** - 让订阅管理更简单！

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！

</div>
