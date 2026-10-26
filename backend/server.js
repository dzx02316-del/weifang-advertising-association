const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { init: initDb } = require('./database');

const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const mediaRoutes = require('./routes/media');
const memberRoutes = require('./routes/members');
const statsRoutes = require('./routes/stats');
const homepageRoutes = require('./routes/homepage');
const pageRoutes = require('./routes/pages');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/pages', pageRoutes);

// 管理后台入口（放在静态文件服务之前，避免被 express.static 的目录重定向拦截）
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
// 同时把 pages 目录挂载到根路径，使 ./news.html 这类相对链接也能工作
app.use('/', express.static(path.join(__dirname, '..', 'pages')));

// 网站首页入口
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'pages', 'index.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

initDb()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`潍坊市广告协会 CMS 服务已启动`);
      console.log(`后台地址: http://localhost:${config.port}/admin`);
      console.log(`API 地址: http://localhost:${config.port}/api`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });
