const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const MEMBER_COLS = [
  'name', 'slug', 'logo', 'industry', 'subtitle', 'description', 'bio',
  'tags_json', 'media_target', 'website',
  'contact_name', 'contact_phone', 'address',
  'gallery_json', 'honors_json',
  'is_featured', 'sort_order', 'is_published'
];

function pickMemberBody(body) {
  const out = {};
  MEMBER_COLS.forEach(k => { if (body[k] !== undefined) out[k] = body[k]; });
  // tags 数组自动 JSON 化
  if (Array.isArray(out.tags_json)) out.tags_json = JSON.stringify(out.tags_json);
  else if (out.tags_json === undefined && Array.isArray(body.tags)) out.tags_json = JSON.stringify(body.tags);
  // gallery/honors 数组自动 JSON 化
  if (Array.isArray(out.gallery_json)) out.gallery_json = JSON.stringify(out.gallery_json);
  else if (out.gallery_json === undefined && Array.isArray(body.gallery)) out.gallery_json = JSON.stringify(body.gallery);
  if (Array.isArray(out.honors_json)) out.honors_json = JSON.stringify(out.honors_json);
  else if (out.honors_json === undefined && Array.isArray(body.honors)) out.honors_json = JSON.stringify(body.honors);
  // 布尔归一
  if (out.is_featured !== undefined) out.is_featured = out.is_featured ? 1 : 0;
  if (out.is_published !== undefined) out.is_published = out.is_published ? 1 : 0;
  return out;
}

// 列表（公开）
router.get('/', async (req, res) => {
  const { published, featured, limit, with_tags } = req.query;
  let sql = 'SELECT * FROM members WHERE 1=1';
  const params = [];
  if (published !== undefined) {
    sql += ' AND is_published = ?';
    params.push(published === 'true' || published === '1' ? 1 : 0);
  }
  if (featured === 'true' || featured === '1') {
    sql += ' AND is_featured = 1';
  }
  sql += ' ORDER BY is_featured DESC, sort_order ASC, created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit, 10)); }

  let members = await db.all(sql, params);

  // tags/gallery/honors 自动解析
  members = members.map(m => {
    try { m.tags = m.tags_json ? JSON.parse(m.tags_json) : []; } catch (e) { m.tags = []; }
    try { m.gallery = m.gallery_json ? JSON.parse(m.gallery_json) : []; } catch (e) { m.gallery = []; }
    try { m.honors = m.honors_json ? JSON.parse(m.honors_json) : []; } catch (e) { m.honors = []; }
    return m;
  });
  res.json({ success: true, data: members });
});

router.get('/:id', async (req, res) => {
  const item = await db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!item) return res.status(404).json({ success: false, message: '会员不存在' });
  try { item.tags = item.tags_json ? JSON.parse(item.tags_json) : []; } catch (e) { item.tags = []; }
  try { item.gallery = item.gallery_json ? JSON.parse(item.gallery_json) : []; } catch (e) { item.gallery = []; }
  try { item.honors = item.honors_json ? JSON.parse(item.honors_json) : []; } catch (e) { item.honors = []; }
  res.json({ success: true, data: item });
});

router.post('/', authenticateToken, async (req, res) => {
  const b = pickMemberBody(req.body);
  if (!b.name) return res.status(400).json({ success: false, message: '会员名称不能为空' });
  const cols = Object.keys(b);
  const qs = cols.map(() => '?').join(',');
  const sql = `INSERT INTO members (${cols.join(',')}) VALUES (${qs})`;
  const result = await db.run(sql, cols.map(c => b[c]));
  const item = await db.get('SELECT * FROM members WHERE id = ?', [result.lastID]);
  res.json({ success: true, data: item });
});

router.put('/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ success: false, message: '会员不存在' });
  const b = pickMemberBody(req.body);
  const setSQL = Object.keys(b).map(k => `${k} = ?`).join(', ');
  await db.run(`UPDATE members SET ${setSQL}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [...Object.values(b), req.params.id]);
  const item = await db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: item });
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM members WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ success: false, message: '会员不存在' });
  await db.run('DELETE FROM members WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
