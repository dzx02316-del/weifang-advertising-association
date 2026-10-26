const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 前台获取统计数据
router.get('/', async (req, res) => {
  const stats = await db.all('SELECT * FROM site_stats ORDER BY sort_order ASC');
  res.json({ success: true, data: stats });
});

// 后台更新统计数据
router.put('/:id', authenticateToken, async (req, res) => {
  const { label, value, suffix, sort_order } = req.body;
  const existing = await db.get('SELECT * FROM site_stats WHERE id = ?', [req.params.id]);

  if (!existing) {
    return res.status(404).json({ success: false, message: '统计项不存在' });
  }

  await db.run(
    `UPDATE site_stats SET
      label = ?, value = ?, suffix = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      label !== undefined ? label : existing.label,
      value !== undefined ? value : existing.value,
      suffix !== undefined ? suffix : existing.suffix,
      sort_order !== undefined ? sort_order : existing.sort_order,
      req.params.id
    ]
  );

  const item = await db.get('SELECT * FROM site_stats WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: item });
});

module.exports = router;
