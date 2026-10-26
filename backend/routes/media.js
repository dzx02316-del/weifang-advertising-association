const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取所有媒体分类（含点位）
router.get('/', async (req, res) => {
  const categories = await db.all('SELECT * FROM media_categories ORDER BY sort_order ASC');
  const points = await db.all('SELECT * FROM media_points ORDER BY sort_order ASC, created_at DESC');

  const data = categories.map(cat => ({
    ...cat,
    points: points.filter(p => p.category_slug === cat.slug)
  }));

  res.json({ success: true, data });
});

// 按分类获取点位
router.get('/category/:slug', async (req, res) => {
  const category = await db.get('SELECT * FROM media_categories WHERE slug = ?', [req.params.slug]);
  if (!category) {
    return res.status(404).json({ success: false, message: '分类不存在' });
  }

  const points = await db.all('SELECT * FROM media_points WHERE category_slug = ? ORDER BY sort_order ASC', [req.params.slug]);
  res.json({ success: true, data: { ...category, points } });
});

// 获取单个点位详情（含公司列表）
router.get('/point/:slug', async (req, res) => {
  const point = await db.get('SELECT * FROM media_points WHERE slug = ?', [req.params.slug]);
  if (!point) {
    return res.status(404).json({ success: false, message: '点位不存在' });
  }
  const companies = await db.all('SELECT * FROM media_point_companies WHERE point_slug = ? ORDER BY sort_order ASC', [req.params.slug]);
  const data = companies.map(c => {
    try { c.points = c.points_json ? JSON.parse(c.points_json) : []; } catch (e) { c.points = []; }
    delete c.points_json;
    return c;
  });
  res.json({ success: true, data: { ...point, companies: data } });
});

// ==================== 分类管理 ====================

// 创建分类
router.post('/categories', authenticateToken, async (req, res) => {
  const { slug, name, description, cover_image, sort_order } = req.body;

  if (!slug || !name) {
    return res.status(400).json({ success: false, message: '分类标识和名称不能为空' });
  }

  try {
    const result = await db.run(
      `INSERT INTO media_categories (slug, name, description, cover_image, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [slug, name, description || '', cover_image || '', sort_order || 0]
    );

    const item = await db.get('SELECT * FROM media_categories WHERE id = ?', [result.lastID]);
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: '分类标识已存在' });
  }
});

// 更新分类
router.put('/categories/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM media_categories WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: '分类不存在' });
  }

  const { name, description, cover_image, sort_order } = req.body;

  await db.run(
    `UPDATE media_categories SET
      name = ?, description = ?, cover_image = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      name !== undefined ? name : existing.name,
      description !== undefined ? description : existing.description,
      cover_image !== undefined ? cover_image : existing.cover_image,
      sort_order !== undefined ? sort_order : existing.sort_order,
      req.params.id
    ]
  );

  const item = await db.get('SELECT * FROM media_categories WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: item });
});

// 删除分类
router.delete('/categories/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM media_categories WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: '分类不存在' });
  }

  await db.run('DELETE FROM media_points WHERE category_slug = ?', [existing.slug]);
  await db.run('DELETE FROM media_categories WHERE id = ?', [req.params.id]);

  res.json({ success: true, message: '删除成功' });
});

// ==================== 点位管理 ====================

// 创建点位
router.post('/points', authenticateToken, async (req, res) => {
  const { category_slug, title, slug, icon, section_en, description, image, sort_order } = req.body;

  if (!category_slug || !title) {
    return res.status(400).json({ success: false, message: '分类标识和点位标题不能为空' });
  }

  const category = await db.get('SELECT * FROM media_categories WHERE slug = ?', [category_slug]);
  if (!category) {
    return res.status(404).json({ success: false, message: '分类不存在' });
  }

  const result = await db.run(
    `INSERT INTO media_points (category_slug, title, slug, icon, section_en, description, image, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [category_slug, title, slug || '', icon || '', section_en || '', description || '', image || '', sort_order || 0]
  );

  const item = await db.get('SELECT * FROM media_points WHERE id = ?', [result.lastID]);
  res.json({ success: true, data: item });
});

// 更新点位
router.put('/points/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM media_points WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: '点位不存在' });
  }

  const { category_slug, title, slug, icon, section_en, description, image, sort_order } = req.body;

  if (category_slug) {
    const category = await db.get('SELECT * FROM media_categories WHERE slug = ?', [category_slug]);
    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }
  }

  await db.run(
    `UPDATE media_points SET
      category_slug = ?, title = ?, slug = ?, icon = ?, section_en = ?, description = ?, image = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      category_slug !== undefined ? category_slug : existing.category_slug,
      title !== undefined ? title : existing.title,
      slug !== undefined ? slug : existing.slug,
      icon !== undefined ? icon : existing.icon,
      section_en !== undefined ? section_en : existing.section_en,
      description !== undefined ? description : existing.description,
      image !== undefined ? image : existing.image,
      sort_order !== undefined ? sort_order : existing.sort_order,
      req.params.id
    ]
  );

  const item = await db.get('SELECT * FROM media_points WHERE id = ?', [req.params.id]);
  res.json({ success: true, data: item });
});

// 删除点位
router.delete('/points/:id', authenticateToken, async (req, res) => {
  const existing = await db.get('SELECT * FROM media_points WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: '点位不存在' });
  }

  await db.run('DELETE FROM media_points WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
