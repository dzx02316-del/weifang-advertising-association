const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 初始化管理员账号
async function initAdmin() {
  const existing = await db.get('SELECT * FROM admin WHERE username = ?', [config.admin.username]);
  if (!existing) {
    const hash = bcrypt.hashSync(config.admin.password, 10);
    await db.run('INSERT INTO admin (username, password_hash) VALUES (?, ?)', [config.admin.username, hash]);
  }
}

initAdmin().catch(console.error);

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请填写用户名和密码' });
  }

  const admin = await db.get('SELECT * FROM admin WHERE username = ?', [username]);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    data: { token, username: admin.username }
  });
});

// 获取当前登录用户信息
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: { id: req.user.id, username: req.user.username }
  });
});

module.exports = router;
