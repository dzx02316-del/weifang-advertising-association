const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 所有单页内容
router.get('/', async (req, res) => {
  const items = await db.all('SELECT * FROM page_contents ORDER BY updated_at DESC');
  res.json({ success: true, data: items });
});

router.get('/:key', async (req, res) => {
  const item = await db.get('SELECT * FROM page_contents WHERE page_key = ?', [req.params.key]);
  if (!item) return res.status(404).json({ success: false, message: '页面不存在' });
  let extra = {};
  try { extra = item.extra_json ? JSON.parse(item.extra_json) : {}; } catch (e) {}
  res.json({ success: true, data: { ...item, extra } });
});

router.post('/', authenticateToken, async (req, res) => {
  const { page_key, title, subtitle, banner_image, body_html, extra_json } = req.body;
  if (!page_key) return res.status(400).json({ success: false, message: 'page_key 不能为空' });
  const extraStr = typeof extra_json === 'string' ? extra_json : JSON.stringify(extra_json || {});
  await db.run(
    `INSERT INTO page_contents (page_key, title, subtitle, banner_image, body_html, extra_json)
     VALUES (?,?,?,?,?,?)`,
    [page_key, title || '', subtitle || '', banner_image || '', body_html || '', extraStr]
  );
  const item = await db.get('SELECT * FROM page_contents WHERE page_key = ?', [page_key]);
  res.json({ success: true, data: item });
});

router.put('/:key', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM page_contents WHERE page_key = ?', [req.params.key]);
  if (!existing) return res.status(404).json({ success: false, message: '页面不存在' });
  const fields = ['title','subtitle','banner_image','body_html','extra_json'];
  const sets = []; const vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      let v = req.body[f];
      if (f === 'extra_json' && typeof v !== 'string') v = JSON.stringify(v || {});
      sets.push(`${f} = ?`);
      vals.push(v);
    }
  });
  if (sets.length === 0) return res.json({ success: true, data: existing });
  vals.push(req.params.key);
  await db.run(`UPDATE page_contents SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE page_key = ?`, vals);
  const item = await db.get('SELECT * FROM page_contents WHERE page_key = ?', [req.params.key]);
  res.json({ success: true, data: item });
});

router.delete('/:key', authenticateToken, async (req, res) => {
  await db.run('DELETE FROM page_contents WHERE page_key = ?', [req.params.key]);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
