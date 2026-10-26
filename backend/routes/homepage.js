const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 首页所有板块（公开）
router.get('/', async (req, res) => {
  const items = await db.all('SELECT * FROM homepage_sections ORDER BY sort_order ASC');
  res.json({ success: true, data: items });
});

router.get('/:key', async (req, res) => {
  const item = await db.get('SELECT * FROM homepage_sections WHERE section_key = ?', [req.params.key]);
  if (!item) return res.status(404).json({ success: false, message: '板块不存在' });
  res.json({ success: true, data: item });
});

// 创建新板块
router.post('/', authenticateToken, async (req, res) => {
  const { section_key, eyebrow, title, subtitle, description, body_html, cta_text, cta_href, background_image, sort_order, is_enabled } = req.body;
  if (!section_key) return res.status(400).json({ success: false, message: 'section_key 不能为空' });
  await db.run(
    `INSERT INTO homepage_sections
     (section_key, eyebrow, title, subtitle, description, body_html, cta_text, cta_href, background_image, sort_order, is_enabled)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [section_key, eyebrow || '', title || '', subtitle || '', description || '', body_html || '',
     cta_text || '', cta_href || '', background_image || '', sort_order || 0,
     is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1]
  );
  const item = await db.get('SELECT * FROM homepage_sections WHERE section_key = ?', [section_key]);
  res.json({ success: true, data: item });
});

// 更新板块（按 section_key）
router.put('/:key', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM homepage_sections WHERE section_key = ?', [req.params.key]);
  if (!existing) return res.status(404).json({ success: false, message: '板块不存在' });
  const fields = ['eyebrow','title','subtitle','description','body_html','cta_text','cta_href','background_image','sort_order','is_enabled'];
  const sets = []; const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = ?`);
      vals.push(f === 'is_enabled' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  });
  if (sets.length === 0) return res.json({ success: true, data: existing });
  vals.push(req.params.key);
  await db.run(`UPDATE homepage_sections SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE section_key = ?`, vals);
  const item = await db.get('SELECT * FROM homepage_sections WHERE section_key = ?', [req.params.key]);
  res.json({ success: true, data: item });
});

router.delete('/:key', authenticateToken, async (req, res) => {
  await db.run('DELETE FROM homepage_sections WHERE section_key = ?', [req.params.key]);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
