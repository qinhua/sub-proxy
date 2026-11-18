<br/>
<div align="center">
   <a class="logo" href="https://github.com/qinhua/sub-proxy">
     <img src="./docs/logo.png" style="width:120px;border-radius:50%" alt="SubProxy"/>
   </a>
</div>
<h1 align="center">SubProxy</h1>
<p align="center">一个基于 Koa + React 的现代代理配置管理系统，支持 Docker 部署和数据持久化。可用于个人或团队使用，统一管理和分享代理配置。</p>
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
- **流量与有效期控制**：支持设置订阅总流量与过期时间，实时统计客户端配置下载流量并在耗尽或过期时自动阻断下发
- **可视化配置**：分离管理基础设置、机场节点（支持多源聚合）、链式代理和分流规则；可选择保留生成 YAML 中的注释，默认不保留
- **链式代理支持**：通过 `dialer-proxy` 串联自动优选第一跳和固定出口节点；可按节点名称的包含、排除关键词缩小第一跳测速范围
- **节点自动更新**：支持定期拉取或手动一键同步最新的机场订阅节点
- **配置预览**：表单“当前配置预览”使用已有缓存，不请求第三方；“刷新来源后预览”仅刷新已启用 URL 来源，失败来源会显示原因并沿用已有缓存。两种预览均不保存表单或刷新结果。
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
git clone https://github.com/qinhua/sub-proxy.git
cd sub-proxy

# 使用 Docker Compose 部署
docker-compose up -d

# 或使用 DockerHub 镜像部署（数据卷根据情况自己修改）
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
/bin/sh -c ./start.sh
```

### 访问系统

- **管理界面**：http://[你的IP]:3001
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
│   ├── tests/                 # 后端测试
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
│   ├── config/                # YAML 与 Shadowrocket 默认基础配置
│   └── types/                 # 共享类型定义
├── docs/                      # 项目文档
├── data/                      # 运行时数据（Docker 映射）
├── upload/                   # 上传文件（Docker 映射）
├── logs/                      # 日志文件（Docker 映射）
├── backups/                   # 数据备份
├── docker-compose.yml         # Docker Compose 配置
├── Dockerfile                 # Docker 镜像构建
├── start.sh                   # Docker 启动脚本
├── reset-password.sh          # 密码重置脚本
└── push-to-dockerhub.sh       # DockerHub 推送脚本
```

## 🎯 功能演示

### 📊 管理界面

- **仪表板**: 实时统计订阅数据，一目了然
- **订阅列表**: 支持置顶、搜索、筛选，支持直观展示流量使用进度和过期时间
- **订阅编辑**: 可视化表单，支持配置流量上限、有效期及节点、规则信息
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

订阅列表的二维码弹窗可分别查看、复制和下载 YAML 与 Shadowrocket 配置。Shadowrocket 链接使用 `client=shadowrocket` 输出原生 `.conf`，包含节点、策略组、规则和 `[General]`；普通链接保持 Clash YAML。未指定 `client` 时，服务端也会通过订阅请求的 `User-Agent: Shadowrocket/...` 自动识别；显式 `client=clash` 或 `yaml=1` 始终返回 YAML。GET 请求体不用于识别客户端。首次导入后需要在手机上选中该配置，后续更新仍从服务端获取。

客户端的订阅请求头会随版本和自定义设置变化：Shadowrocket 常见 `Shadowrocket/<版本>`（[示例](https://github.com/Openwrt-Passwall/openwrt-passwall2/blob/main/luci-app-passwall2/luasrc/model/cbi/passwall2/client/node_subscribe_config.lua)）；[Clash Verge Rev](https://www.clashverge.dev/privacy) 默认 `clash-verge/v<版本>`；[OpenClash](https://github.com/vernesong/OpenClash/blob/master/luci-app-openclash/luasrc/model/cbi/openclash/config-subscribe-edit.lua) 可设置为 `clash-verge/...`、`clash.meta/...` 或 `Clash`。普通 Clash 客户端没有统一的订阅下载 UA，因此服务端只自动识别 Shadowrocket，其余均返回 YAML。

编辑订阅时，“基础配置”提供 YAML 和 Shadowrocket 两个编辑区；两者的默认值统一定义在 `shared/config`。可视化模式的 YAML 基础配置采用国内域名走阿里 DoT、其余域名走指定代理组的配置；Shadowrocket 编辑区展示与服务端共用的 `[General]` 默认值。每行填写一项 `key = value`，已有订阅的自定义项会覆盖同名默认项，同一项只能填写一次。Shadowrocket 默认 `dns-server` 保留两个阿里 DoT 地址。未单独设置 `proxy-dns-server`，IP 类规则生成时统一带 `no-resolve`。不同客户端对代理链的解析可能不同，首次导入应在手机上检查美国住宅节点的出口 IP，并在蜂窝网络下复测 DNS 和 WebRTC。

可视化模式底部的“保留注释”开关默认关闭；开启后生成配置会保留基础配置、代理组和分流规则里的注释，规则中的独立注释行仍保持独立。链式代理区域的第一跳筛选默认关闭；开启后可用逗号或换行填写地区、节点名称的包含与排除关键词。预置包含香港、澳门、台湾、日本、新加坡、马来西亚及常见英文、旗帜写法，排除流量、到期、公告等信息节点。筛选只缩小「🔗 链式优选」的测速候选；普通「🚀 自动优选」仍覆盖全部机场节点，「🌏 国外通用」保持引用该组。链式组在 Mihomo YAML 中设置 `hidden: true`，Shadowrocket 配置中设置 `hidden=1`；隐藏效果取决于客户端是否支持，且不改变代理链引用。没有匹配节点时，配置生成返回明确错误，需调整关键词。

目前原生转换支持 AnyTLS、SOCKS5、Shadowsocks、Trojan 节点，以及当前配置使用的常见规则。遇到不支持的协议、策略组或规则时，服务端返回 422 错误，不会静默丢弃。若客户端修改了 User-Agent，应使用显式 `client=shadowrocket` 链接。

## 🛠️ 开发环境

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 运行后端测试（首次运行前先构建共享包）
pnpm build:config && pnpm build:types
pnpm --filter server test
```

## 📦 部署方式

### 1. 直接在项目目录下部署

```bash
# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 通过 Docker 镜像部署（推荐）

请参见 [详细部署指南](docs/DEPLOYMENT.md)

## 💾 数据管理

### 备份数据

```bash
# 手动备份数据
tar -czf subproxy_backup_$(date +%Y%m%d_%H%M%S).tar.gz data/ upload/ logs/
```

### 恢复数据

```bash
# 停止服务
docker-compose down

# 恢复数据
tar -xzf subproxy_backup_20241201_120000.tar.gz

# 重启服务
docker-compose up -d
```

### 重置数据

```bash
# 停止服务
docker-compose down

# 备份当前数据
cp -r data data.backup

# 删除数据目录
rm -rf data/* upload/* logs/*

# 重启服务（将自动加载默认数据）
docker-compose up -d
```

## 🔧 配置说明

### 环境变量配置

支持通过根目录的 `.env` / `.env.production` 进行环境配置，也可通过 docker 命令传入：

```env
# 订阅头部展示的来源页面地址
WEB_PAGE_URL=https://sub-proxy.yourdomain.com
```

### 数据持久化

| Docker 内部路径                    | 宿主机路径  | 说明         | 持久化 |
| ---------------------------------- | ----------- | ------------ | ------ |
| `/app/server/data/`                | `./data/`   | 运行时数据库 | ✅     |
| `/app/server/upload/`              | `./upload/` | 用户上传文件 | ✅     |
| `/app/logs/`                       | `./logs/`   | 日志文件     | ✅     |
| `/app/server/data/db_default.json` | 不映射      | 默认数据模板 | ❌     |

## 🔄 升级流程

### 1. 备份数据

```bash
tar -czf subproxy_backup_$(date +%Y%m%d_%H%M%S).tar.gz data/ upload/ logs/
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
docker-compose up -d
```

### 5. 验证数据

```bash
# 检查服务状态
docker-compose ps

# 检查数据
ls -la data/ upload/ logs/
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
   chmod -R 755 data upload logs

   # 检查端口占用
   netstat -tlnp | grep 3001
   ```

2. **数据丢失**

   ```bash
   # 从备份恢复
   tar -xzf subproxy_backup_20241201_120000.tar.gz

   # 重置为默认数据
   docker-compose down
   rm -rf data/* upload/* logs/*
   docker-compose up -d
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

### TODO

- [ ] 扩展更多客户端和协议的订阅转换
- [ ] 支持过滤订阅节点中的部分节点
- [ ] 配置文件正确性校验

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

<br/>

---

<div align="center">

**SubProxy** - 让订阅管理更简单！

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！

</div>
