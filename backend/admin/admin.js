/* ============================================================
   潍坊市广告协会 CMS 管理后台 —— 单页 SPA
   左侧导航 7 模块 + 通用表格 / 表单编辑器 / Modal / Toast
   ============================================================ */
const API = '/api';
const LS_TOKEN = 'cms_token';
const LS_USER = 'cms_user';

let state = {
  token: localStorage.getItem(LS_TOKEN) || '',
  user: localStorage.getItem(LS_USER) || 'admin',
  currentSection: 'dashboard',
  homepageTabs: [],         // [{section_key, title}]
  currentHomepageKey: '',
  pagesTabs: [],            // [{page_key, title}]
  currentPageKey: '',
  modalSaveCb: null,        // 动态绑定的保存回调
  modalDeleteCb: null
};

/* ---------- 通用工具 ---------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  const json = await r.json().catch(() => ({ success: false }));
  if (!json.success && r.status === 401) {
    logout();
    throw new Error('未授权');
  }
  if (!json.success) throw new Error(json.message || '请求失败');
  return json.data;
}
const GET = (p) => api('GET', p);
const POST = (p, b) => api('POST', p, b);
const PUT = (p, b) => api('PUT', p, b);
const DEL = (p) => api('DELETE', p);

function toast(msg, type) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + (type || '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2200);
}

function openModal(opts) {
  $('#modal-title').textContent = opts.title || '编辑';
  $('#modal-body').innerHTML = opts.body || '';
  $('#modal-save').textContent = opts.saveText || '保存';
  state.modalSaveCb = opts.onSave || null;
  state.modalDeleteCb = opts.onDelete || null;
  const del = $('#modal-delete');
  if (del) del.remove();
  if (opts.onDelete) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = opts.deleteText || '删除';
    btn.onclick = () => { if (confirm('确认删除？')) { opts.onDelete(); closeModal(); } };
    $('#modal-footer').insertBefore(btn, $('#modal-cancel'));
  }
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); state.modalSaveCb = null; }

/* ---------- 登录 / 登出 ---------- */
async function login(username, password) {
  const data = await POST('/auth/login', { username, password });
  state.token = data.token;
  state.user = data.username;
  localStorage.setItem(LS_TOKEN, data.token);
  localStorage.setItem(LS_USER, data.username);
  $('#current-user').textContent = data.username;
  $('#login-view').classList.add('hidden');
  $('#admin-view').classList.remove('hidden');
  await renderSection(state.currentSection);
}
function logout() {
  state.token = '';
  localStorage.removeItem(LS_TOKEN);
  $('#admin-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
}

/* ---------- 路由 ---------- */
const SECTIONS = {
  dashboard:  { title: '控制台',       subtitle: '站点概览与快捷入口' },
  homepage:   { title: '首页板块内容', subtitle: '编辑首页各板块文案 / 背景 / CTA' },
  news:       { title: '协会新闻',     subtitle: '发布/编辑/下线协会动态' },
  media:      { title: '媒体资源',     subtitle: '5 大媒体分类 + 点位管理' },
  members:    { title: '会员展示',     subtitle: '12 家会员公司卡片详情' },
  pages:      { title: '单页内容',     subtitle: '关于 / 政策 / 服务 / 联系 / 潍广通简介' },
  stats:      { title: '站点统计',     subtitle: '首页数据带数值管理' }
};

function switchSection(name) {
  state.currentSection = name;
  $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.section === name));
  const meta = SECTIONS[name];
  $('#page-title').textContent = meta.title;
  $('#page-subtitle').textContent = meta.subtitle || '';
  Object.keys(SECTIONS).forEach(k => $('#section-' + k).classList.toggle('hidden', k !== name));
  renderSection(name);
}

async function renderSection(name) {
  try {
    if (name === 'dashboard')  await renderDashboard();
    if (name === 'homepage')   await renderHomepage();
    if (name === 'news')       await renderNews();
    if (name === 'media')      await renderMedia();
    if (name === 'members')    await renderMembers();
    if (name === 'pages')      await renderPages();
    if (name === 'stats')      await renderStats();
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ==========================================================
   控制台
   ========================================================== */
async function renderDashboard() {
  const [newsAll, allMedia, membersAll] = await Promise.all([
    GET('/news'),
    GET('/media'),
    GET('/members')
  ]);
  $('#dash-news-count').textContent = newsAll.length;
  $('#dash-cat-count').textContent = allMedia.length;
  $('#dash-point-count').textContent = allMedia.reduce((acc, c) => acc + (c.points ? c.points.length : 0), 0);
  $('#dash-member-count').textContent = membersAll.length;
}

/* ==========================================================
   首页板块（按 section_key 切换编辑）
   ========================================================== */
const HOMEPAGE_KEYS = [
  { section_key: 'hero',          title: 'Hero 首屏',          page: 'index.html' },
  { section_key: 'stats',         title: '数据带',             page: 'index.html' },
  { section_key: 'news_preview',  title: '协会要闻预览',       page: 'index.html' },
  { section_key: 'media_preview', title: '潍广通预览',         page: 'index.html' },
  { section_key: 'members_preview', title: '会员风采预览',     page: 'index.html' },
  { section_key: 'cta',           title: '入会 CTA',           page: 'index.html' }
];

async function renderHomepage() {
  // 渲染 tabs
  const tabs = $('#homepage-tabs');
  tabs.innerHTML = HOMEPAGE_KEYS.map(k =>
    `<button class="tab-chip ${state.currentHomepageKey === k.section_key || !state.currentHomepageKey ? 'active' : ''}" data-key="${k.section_key}">${k.title}</button>`
  ).join('');
  $$('#homepage-tabs .tab-chip').forEach(b => {
    b.onclick = () => { state.currentHomepageKey = b.dataset.key; renderHomepage(); };
  });
  // 默认选第一个
  if (!state.currentHomepageKey) state.currentHomepageKey = HOMEPAGE_KEYS[0].section_key;

  // 加载板块
  const item = await GET('/homepage/' + state.currentHomepageKey);
  const form = $('#homepage-form');
  form.innerHTML = sectionForm(item);
  $('#homepage-save').onclick = async () => {
    const body = gatherForm('homepage-form-body');
    await PUT('/homepage/' + state.currentHomepageKey, body);
    toast('已保存');
  };
}

function sectionForm(item) {
  const tpl = `
    <div class="card-form-body" id="homepage-form-body">
      <div class="form-grid-2">
        ${cell('eyebrow', '眉标 (英文)')}
        ${cell('title', '主标题')}
        ${cell('subtitle', '副标题')}
        ${cell('cta_text', 'CTA 按钮文字')}
        ${cell('cta_href', 'CTA 跳转链接')}
        ${cell('background_image', '背景图路径', 'text', '可留空。例如 ../assets/hero-city.gif')}
        ${cell('sort_order', '排序', 'number')}
        ${cell('is_enabled', '启用', 'checkbox')}
      </div>
      <div class="form-group">
        <label>描述正文 (description)</label>
        <textarea name="description">${item.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>正文 HTML (body_html，可留空，用于富文本板块)</label>
        <textarea name="body_html" style="min-height:160px;">${item.body_html || ''}</textarea>
      </div>
      <div class="card-form-foot">
        <button class="btn btn-primary" id="homepage-save">保存板块</button>
      </div>
    </div>
  `;
  function cell(k, label, type, ph) {
    const v = item[k];
    if (type === 'checkbox') {
      return `<label class="chk"><input type="checkbox" name="${k}" ${v ? 'checked' : ''}> <span>${label}</span></label>`;
    }
    return `<div class="form-group"><label>${label}</label><input type="${type || 'text'}" name="${k}" value="${v !== null && v !== undefined ? String(v).replace(/"/g,'&quot;') : ''}" ${ph ? `placeholder="${ph}"` : ''}></div>`;
  }
  return tpl;
}

/* ==========================================================
   单页内容（关于 / 政策 / 服务 / 联系 / 潍广通简介）
   ========================================================== */
const PAGE_KEYS = [
  { page_key: 'about',       title: '关于协会',   file: 'pages/about-new.html' },
  { page_key: 'policy',      title: '政策法规',   file: 'pages/policy.html' },
  { page_key: 'service',     title: '会员服务',   file: 'pages/service.html' },
  { page_key: 'contact',     title: '联系我们',   file: 'pages/contact.html' },
  { page_key: 'media_intro', title: '潍广通简介', file: 'pages/media.html' }
];

async function renderPages() {
  const tabs = $('#pages-tabs');
  tabs.innerHTML = PAGE_KEYS.map(k =>
    `<button class="tab-chip ${state.currentPageKey === k.page_key || !state.currentPageKey ? 'active' : ''}" data-key="${k.page_key}">${k.title}</button>`
  ).join('');
  $$('#pages-tabs .tab-chip').forEach(b => {
    b.onclick = () => { state.currentPageKey = b.dataset.key; renderPages(); };
  });
  if (!state.currentPageKey) state.currentPageKey = PAGE_KEYS[0].page_key;

  const item = await GET('/pages/' + state.currentPageKey);
  const form = $('#pages-form');
  form.innerHTML = `
    <div class="card-form-body" id="pages-form-body">
      <div class="form-grid-2">
        <div class="form-group"><label>主标题</label><input name="title" value="${item.title || ''}"></div>
        <div class="form-group"><label>副标题 (EN)</label><input name="subtitle" value="${item.subtitle || ''}"></div>
        <div class="form-group"><label>Banner 背景图路径</label><input name="banner_image" value="${item.banner_image || ''}" placeholder="例如 ../assets/bg-news-banner.gif"></div>
      </div>
      <div class="form-group">
        <label>正文 HTML（支持富文本标签）</label>
        <textarea name="body_html" style="min-height:260px;font-family:Menlo,monospace;">${item.body_html || ''}</textarea>
      </div>
      <div class="card-form-foot">
        <button class="btn btn-primary" id="pages-save">保存页面</button>
      </div>
    </div>
  `;
  $('#pages-save').onclick = async () => {
    const body = gatherForm('pages-form-body');
    await PUT('/pages/' + state.currentPageKey, body);
    toast('已保存');
  };
}

/* ==========================================================
   新闻
   ========================================================== */
let newsAll = [];
async function renderNews() {
  newsAll = await GET('/news');
  paintNews(newsAll);
}
function paintNews(list) {
  const kw = ($('#news-search')?.value || '').trim();
  const rows = list.filter(n => !kw || (n.title || '').includes(kw));
  $('#news-tbody').innerHTML = rows.map((n, i) => `
    <tr>
      <td>${i+1}</td>
      <td>
        <div style="font-weight:600;">${n.title}</div>
        ${n.summary ? `<div style="font-size:13px;color:var(--neutral-500);margin-top:2px;">${n.summary}</div>` : ''}
      </td>
      <td><span class="badge badge-default">${n.category || '-'}</span></td>
      <td style="white-space:nowrap;">${(n.created_at || '').slice(0,10)}</td>
      <td>${n.is_published ? '<span class="badge badge-success">已发布</span>' : '<span class="badge badge-default">草稿</span>'}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${n.id}">编辑</button>
          <button class="btn btn-ghost btn-sm" data-pub="${n.id}">${n.is_published ? '下线' : '发布'}</button>
          <button class="btn btn-danger btn-sm" data-del="${n.id}">删除</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="empty-tip">暂无新闻</td></tr>`;
  bindNewsEvents();
}
function bindNewsEvents() {
  $$('#news-tbody [data-edit]').forEach(b => b.onclick = () => openNewsModal(parseInt(b.dataset.edit)));
  $$('#news-tbody [data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('确认删除？')) return;
    await DEL('/news/' + b.dataset.del);
    toast('已删除'); await renderNews();
  });
  $$('#news-tbody [data-pub]').forEach(b => b.onclick = async () => {
    const id = parseInt(b.dataset.pub);
    const n = newsAll.find(x => x.id === id);
    await PUT('/news/' + id, { is_published: n.is_published ? 0 : 1 });
    toast('已更新'); await renderNews();
  });
}

function openNewsModal(id) {
  const isNew = !id;
  const n = isNew ? { title:'', summary:'', content:'', cover_image:'', category:'协会要闻', is_published:1, sort_order:0 } : newsAll.find(x => x.id === id);
  const body = `
    <div class="form-group"><label>标题 *</label><input name="title" value="${n.title}"></div>
    <div class="form-group"><label>分类</label>
      <select name="category">
        ${['协会要闻','通知公告','行业资讯'].map(c => `<option ${n.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>摘要</label><textarea name="summary">${n.summary || ''}</textarea></div>
    <div class="form-group"><label>正文 HTML</label><textarea name="content" style="min-height:180px;">${n.content || ''}</textarea></div>
    <div class="form-grid-2">
      <div class="form-group"><label>封面图路径</label><input name="cover_image" value="${n.cover_image || ''}"></div>
      <div class="form-group"><label>排序</label><input type="number" name="sort_order" value="${n.sort_order || 0}"></div>
    </div>
    <label class="chk"><input type="checkbox" name="is_published" ${n.is_published ? 'checked' : ''}> <span>立即发布</span></label>
  `;
  openModal({
    title: isNew ? '新增新闻' : '编辑新闻',
    body,
    onSave: async () => {
      const f = gatherForm('modal-body');
      if (isNew) await POST('/news', f); else await PUT('/news/' + id, f);
      toast('已保存'); await renderNews(); closeModal();
    }
  });
}

/* ==========================================================
   媒体资源：分类 + 点位
   ========================================================== */
async function renderMedia() {
  const all = await GET('/media');
  // all = [{...cat, points:[...]}]，展开平铺供后续渲染
  const cats = all;
  const list = $('#media-list');
  list.innerHTML = cats.map(c => {
    const pts = points.filter(p => p.category_slug === c.slug);
    return `
      <div class="media-category">
        <div class="media-category-header">
          <div>
            <div class="media-category-title">${c.name} <span class="cat-slug">(${c.slug})</span></div>
            <div class="media-category-desc">${c.description || ''}</div>
          </div>
          <div class="media-category-actions">
            <button class="btn btn-ghost btn-sm" data-cat-edit="${c.slug}">编辑分类</button>
            <button class="btn btn-primary btn-sm" data-point-add="${c.slug}">+ 新增点位</button>
          </div>
        </div>
        <div class="media-points">
          ${pts.map(p => `
            <div class="media-point">
              <div>
                <div class="media-point-title">${p.title}</div>
                <div class="media-point-desc">${p.description || ''}</div>
              </div>
              <div class="actions">
                <button class="btn btn-ghost btn-sm" data-point-edit="${p.id}">编辑</button>
                <button class="btn btn-danger btn-sm" data-point-del="${p.id}">删除</button>
              </div>
            </div>
          `).join('') || `<div class="empty-tip">暂无点位</div>`}
        </div>
      </div>
    `;
  }).join('');
  bindMediaEvents(cats);
}
function bindMediaEvents(cats) {
  $$('[data-cat-edit]').forEach(b => b.onclick = () => openCatModal(cats.find(c => c.slug === b.dataset.catEdit)));
  $$('[data-point-add]').forEach(b => b.onclick = () => openPointModal(null, b.dataset.pointAdd));
  $$('[data-point-edit]').forEach(b => b.onclick = async () => {
    const pts = await GET('/media/points/' + b.dataset.pointEdit);
    openPointModal(pts);
  });
  $$('[data-point-del]').forEach(b => b.onclick = async () => {
    if (!confirm('确认删除该点位？')) return;
    await DEL('/media/points/' + b.dataset.pointDel);
    toast('已删除'); renderMedia();
  });
  $('#media-cat-add').onclick = () => openCatModal(null);
  $('#media-point-add').onclick = () => openPointModal(null, (cats[0] || {}).slug);
}

function openCatModal(c) {
  const isNew = !c;
  c = c || { slug:'', name:'', description:'', cover_image:'', sort_order:0 };
  const body = `
    <div class="form-grid-2">
      <div class="form-group"><label>Slug * (英文唯一)</label><input name="slug" value="${c.slug}" ${isNew ? '' : 'disabled'}></div>
      <div class="form-group"><label>分类名称 *</label><input name="name" value="${c.name}"></div>
    </div>
    <div class="form-group"><label>描述</label><textarea name="description">${c.description || ''}</textarea></div>
    <div class="form-grid-2">
      <div class="form-group"><label>封面图路径</label><input name="cover_image" value="${c.cover_image || ''}"></div>
      <div class="form-group"><label>排序</label><input type="number" name="sort_order" value="${c.sort_order || 0}"></div>
    </div>
  `;
  openModal({
    title: isNew ? '新增分类' : '编辑分类',
    body,
    onSave: async () => {
      const f = gatherForm('modal-body');
      if (isNew) { await POST('/media/categories', f); }
      else { await PUT('/media/categories/' + c.id, f); }
      toast('已保存'); renderMedia(); closeModal();
    }
  });
}
function openPointModal(p, slug) {
  const isNew = !p;
  p = p || { category_slug: slug || '', title:'', description:'', image:'', sort_order:0 };
  const body = `
    <div class="form-grid-2">
      <div class="form-group"><label>所属分类</label><input name="category_slug" value="${p.category_slug}" ${isNew ? '' : 'disabled'}></div>
      <div class="form-group"><label>点位名称 *</label><input name="title" value="${p.title}"></div>
    </div>
    <div class="form-group"><label>描述</label><textarea name="description">${p.description || ''}</textarea></div>
    <div class="form-grid-2">
      <div class="form-group"><label>图片路径</label><input name="image" value="${p.image || ''}"></div>
      <div class="form-group"><label>排序</label><input type="number" name="sort_order" value="${p.sort_order || 0}"></div>
    </div>
  `;
  openModal({
    title: isNew ? '新增点位' : '编辑点位',
    body,
    onSave: async () => {
      const f = gatherForm('modal-body');
      if (isNew) { await POST('/media/points', f); }
      else { await PUT('/media/points/' + p.id, f); }
      toast('已保存'); renderMedia(); closeModal();
    }
  });
}

/* ==========================================================
   会员（扩详情字段）
   ========================================================== */
let membersAll = [];
async function renderMembers() {
  membersAll = await GET('/members');
  paintMembers(membersAll);
}
function paintMembers(list) {
  const kw = ($('#members-search')?.value || '').trim();
  const rows = list.filter(m => !kw || (m.name || '').includes(kw));
  $('#members-tbody').innerHTML = rows.map(m => {
    const tags = (m.tags || []).map(t => `<span class="badge badge-default">${t}</span>`).join(' ');
    return `
    <tr>
      <td>${m.id}</td>
      <td style="max-width:240px;">
        <div style="font-weight:600;">${m.name}</div>
        ${m.subtitle ? `<div style="font-size:12px;color:var(--neutral-500);">${m.subtitle}</div>` : ''}
      </td>
      <td>${m.industry || '-'}</td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:var(--neutral-500);">${m.description || ''}</td>
      <td><code style="font-size:12px;background:var(--neutral-50);padding:2px 6px;border-radius:4px;">${m.media_target || '-'}</code></td>
      <td>${m.is_published ? '<span class="badge badge-success">已发布</span>' : '<span class="badge badge-default">下架</span>'}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${m.id}">编辑</button>
          <button class="btn btn-danger btn-sm" data-del="${m.id}">删除</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="empty-tip">暂无会员</td></tr>`;
  $$('#members-tbody [data-edit]').forEach(b => b.onclick = () => openMemberModal(parseInt(b.dataset.edit)));
  $$('#members-tbody [data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('确认删除？')) return;
    await DEL('/members/' + b.dataset.del);
    toast('已删除'); await renderMembers();
  });
}
function openMemberModal(id) {
  const isNew = !id;
  const m = isNew ? { name:'', logo:'', industry:'', subtitle:'', description:'', tags:[], media_target:'', website:'', contact_name:'', contact_phone:'', address:'', is_featured:0, is_published:1, sort_order:0 } : membersAll.find(x => x.id === id);
  const body = `
    <div class="form-grid-2">
      <div class="form-group"><label>公司名称 *</label><input name="name" value="${m.name}"></div>
      <div class="form-group"><label>Logo 路径</label><input name="logo" value="${m.logo || ''}" placeholder="例如 ../assets/member-xxx.png"></div>
      <div class="form-group"><label>行业分类</label><input name="industry" value="${m.industry || ''}"></div>
      <div class="form-group"><label>副标题（一行亮点）</label><input name="subtitle" value="${m.subtitle || ''}" placeholder="例如 成立于 2014 · 分众传媒潍坊唯一合作伙伴"></div>
    </div>
    <div class="form-group"><label>简介</label><textarea name="description">${m.description || ''}</textarea></div>
    <div class="form-group"><label>标签（英文逗号分隔）</label>
      <input name="tags_json" value="${Array.isArray(m.tags) ? m.tags.join(',') : (m.tags_json || '')}" placeholder="例如 电梯联播网,北站灯箱,户外LED/三面翻">
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label>潍广通跳转锚点</label><input name="media_target" value="${m.media_target || ''}" placeholder="多个逗号分隔，如 #cat-elevator,#cat-outdoor"></div>
      <div class="form-group"><label>官网</label><input name="website" value="${m.website || ''}"></div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label>联系人</label><input name="contact_name" value="${m.contact_name || ''}"></div>
      <div class="form-group"><label>电话</label><input name="contact_phone" value="${m.contact_phone || ''}"></div>
      <div class="form-group"><label>地址</label><input name="address" value="${m.address || ''}"></div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label>排序</label><input type="number" name="sort_order" value="${m.sort_order || 0}"></div>
      <label class="chk"><input type="checkbox" name="is_featured" ${m.is_featured ? 'checked' : ''}> <span>首页精选</span></label>
      <label class="chk"><input type="checkbox" name="is_published" ${m.is_published ? 'checked' : ''}> <span>已发布</span></label>
    </div>
  `;
  openModal({
    title: isNew ? '新增会员' : '编辑会员',
    body,
    onSave: async () => {
      const f = gatherForm('modal-body');
      // tags_json 由逗号分隔字符串 → JSON 数组
      if (typeof f.tags_json === 'string') {
        const arr = f.tags_json.split(/[,，]/).map(s => s.trim()).filter(Boolean);
        f.tags_json = JSON.stringify(arr);
      }
      if (isNew) await POST('/members', f); else await PUT('/members/' + id, f);
      toast('已保存'); await renderMembers(); closeModal();
    }
  });
}

/* ==========================================================
   站点统计
   ========================================================== */
let statsAll = [];
async function renderStats() {
  statsAll = await GET('/stats');
  $('#stats-tbody').innerHTML = statsAll.map(s => `
    <tr>
      <td><code>${s.key}</code></td>
      <td>${s.label}</td>
      <td><strong style="font-size:18px;color:var(--primary);">${s.value}</strong></td>
      <td>${s.suffix || '-'}</td>
      <td>${s.sort_order}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" data-edit="${s.id}">编辑</button>
          <button class="btn btn-danger btn-sm" data-del="${s.id}">删除</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="empty-tip">暂无数据</td></tr>`;
  $$('#stats-tbody [data-edit]').forEach(b => b.onclick = () => openStatModal(statsAll.find(x => x.id === parseInt(b.dataset.edit))));
  $$('#stats-tbody [data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('确认删除？')) return;
    await DEL('/stats/' + b.dataset.del);
    toast('已删除'); await renderStats();
  });
  $('#stat-add').onclick = () => openStatModal(null);
}
function openStatModal(s) {
  const isNew = !s;
  s = s || { key:'', label:'', value:'', suffix:'', sort_order:0 };
  const body = `
    <div class="form-grid-2">
      <div class="form-group"><label>Key (英文唯一)</label><input name="key" value="${s.key}" ${isNew ? '' : 'disabled'}></div>
      <div class="form-group"><label>标签</label><input name="label" value="${s.label}"></div>
      <div class="form-group"><label>数值</label><input name="value" value="${s.value}"></div>
      <div class="form-group"><label>后缀 (+ / 年 / 等)</label><input name="suffix" value="${s.suffix || ''}"></div>
      <div class="form-group"><label>排序</label><input type="number" name="sort_order" value="${s.sort_order || 0}"></div>
    </div>
  `;
  openModal({
    title: isNew ? '新增统计项' : '编辑统计项',
    body,
    onSave: async () => {
      const f = gatherForm('modal-body');
      if (isNew) await POST('/stats', f); else await PUT('/stats/' + s.id, f);
      toast('已保存'); await renderStats(); closeModal();
    }
  });
}

/* ==========================================================
   通用表单数据收集
   ========================================================== */
function gatherForm(rootId) {
  const root = document.getElementById(rootId);
  const out = {};
  $$('input, textarea, select', root).forEach(el => {
    const name = el.name;
    if (!name) return;
    if (el.type === 'checkbox') { out[name] = el.checked ? 1 : 0; return; }
    if (el.type === 'number') { out[name] = el.value === '' ? null : Number(el.value); return; }
    out[name] = el.value;
  });
  return out;
}

/* ==========================================================
   初始化
   ========================================================== */
function init() {
  // 登录
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#login-error').textContent = '';
    const u = $('#login-username').value.trim();
    const p = $('#login-password').value;
    try { await login(u, p); }
    catch (err) { $('#login-error').textContent = err.message || '登录失败'; }
  });

  // 登出
  $('#logout-btn').onclick = logout;

  // 侧边导航
  $$('.nav-item').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(a.dataset.section);
  }));

  // 搜索事件
  $('#news-search')?.addEventListener('input', () => paintNews(newsAll));
  $('#members-search')?.addEventListener('input', () => paintMembers(membersAll));

  // Modal 关闭
  $('#modal-close').onclick = closeModal;
  $('#modal-cancel').onclick = closeModal;
  $('#modal-overlay').onclick = closeModal;
  $('#modal-save').onclick = () => state.modalSaveCb && state.modalSaveCb();

  // 新增按钮
  $('#news-add').onclick = () => openNewsModal(null);
  $('#member-add').onclick = () => openMemberModal(null);

  // 自动登录
  if (state.token) {
    $('#login-view').classList.add('hidden');
    $('#admin-view').classList.remove('hidden');
    $('#current-user').textContent = state.user;
    switchSection('dashboard');
  }
}

init();
