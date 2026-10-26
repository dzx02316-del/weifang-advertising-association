# 潍坊市广告协会官网 CMS — 本地运行指南

## 环境要求

- Node.js 18.x 或更高版本
- npm（随 Node.js 一起安装）

## 本地启动步骤

### 1. 复制项目到本地

将整个 `weifang-advertising-association` 文件夹复制到本地电脑任意位置。

> 如果已下载压缩包，解压后得到 `weifang-advertising-association` 文件夹。

### 2. 安装依赖

打开终端，进入 backend 目录并安装依赖：

```bash
cd weifang-advertising-association/backend
npm install
```

> `sqlite3` 为预编译模块，安装时无需额外编译工具，通常可快速完成。

### 3. 启动服务

```bash
npm start
```

启动成功后会显示：

```
潍坊市广告协会 CMS 服务已启动
后台地址: http://localhost:3000/admin
API 地址: http://localhost:3000/api
```

### 4. 访问网站与后台

- 前台首页：`http://localhost:3000/`
- 协会动态：`http://localhost:3000/pages/news.html`
- 潍广通媒体资源：`http://localhost:3000/pages/media.html`
- 会员风采：`http://localhost:3000/pages/members.html`
- 内容管理后台：`http://localhost:3000/admin`
- 后台登录账号：
  - 用户名：`admin`
  - 密码：`weifang2025`

## 目录说明

```
weifang-advertising-association/
├── assets/          # 图片、Logo 等静态资源
├── pages/           # 前台页面（index.html、news.html、media.html、about.html、policy.html、service.html、members.html、contact.html）
├── backend/         # 后端服务
│   ├── admin/       # 后台管理前端
│   ├── data/        # SQLite 数据库文件
│   ├── middleware/  # 鉴权中间件
│   ├── routes/      # API 路由
│   ├── config.js    # 配置（端口、账号、JWT 密钥）
│   ├── database.js  # 数据库初始化
│   └── server.js    # 服务入口
└── README-本地运行.md
```

## 常见问题

### 端口被占用

如果 3000 端口被占用，可以修改环境变量启动：

```bash
PORT=8080 npm start
```

### sqlite3 安装说明

本项目使用 `sqlite3` 作为数据库驱动。`sqlite3` 提供预编译二进制包，绝大多数情况下无需 Python 或 C++ 编译工具即可直接安装。如遇极少数环境无法使用预编译包，可参考 `sqlite3` 官方文档配置对应平台的构建环境。

### 数据库内容

首次启动会自动初始化数据库并写入默认示例数据（新闻、媒体分类、会员、统计数据）。

数据库文件位于 `backend/data/cms.db`，可以直接备份或替换。

## 修改默认账号密码

编辑 `backend/config.js`：

```js
admin: {
  username: 'admin',
  password: 'weifang2025'
}
```

修改后重启服务生效。
