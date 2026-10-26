const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取新闻列表（前台公开 + 后台管理）
router.get('/', async (req, res) => {
  const { published, limit, offset } = req.query;
  let sql = 'SELECT * FROM news WHERE 1=1';
  const params = [];

  if (published !== undefined) {
    sql += ' AND is_published = ?';
    params.push(published === 'true' || published === '1' ? 1 : 0);
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));
  }

  if (offset) {
    sql += ' OFFSET ?';
    params.push(parseInt(offset, 10));
  }

  const news = await db.all(sql, params);
  res.json({ success: true, data: news });
});

// 获取单条新闻
router.get('/:id', async (req, res) => {
  const item = await db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  if (!item) {
    return res.status(404).json({ success: false, message: '新闻不存在' });
  }
  res.json({ success: true, data: item });
});

// 创建新闻
router.post('/', authenticateToken, async (req, res) => {
  const { title, summary, content, cover_image, category, is_published, sort_order } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: '标题不能为空' });
  }

  const result = await db.run(
    `INSERT INTO news (title, summary, content, cover_image, category, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      summary || '',
      content || '',
      cover_image || '',
      category || '协会动态',
      is_published !== undefined ? (is_published ? 1 : 0) : 1,
      sort_order || 0
    ]
  );

  const item = await db.get('SELECT * FROM news WHERE id = ?', [result.lastID]);
  res.json({ success: true, data: item });
});

// 更新新闻
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, summary, content, cover_image, category, is_published, sort_order } = req.body;
  const existing = await db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);

  if (!existing) {
    return res.status(404).json({ success: false, message: '新闻不存在' });
  }

  await db.run(
    `UPDATE news SET
      title = ?, summary = ?, content = ?, cover_image = ?, category = ?,
      is_published = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      title !== undefined ? title : existing.title,
      summary !== undefined ? summary : existing.summary,
      content !== undefined ? content : existing.content,
      cover_image !== undefined ? cover_image : existing.cover_image,
      category !== undefined ? category : existing.category,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      sort_order !== undefined ? sort_order : existing.sort_order,
      req.params.id
    ]
  );

  const item = await db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: item });
});

// 删除新闻
router.delete('/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM news WHERE id = ?', [req.params.id]);

  if (!existing) {
    return res.status(404).json({ success: false, message: '新闻不存在' });
  }

  await db.run('DELETE FROM news WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
