const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'cms.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const rawDb = new sqlite3.Database(DB_PATH);

// Promise 化的数据库操作
const db = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// 给已有表安全加列（列已存在则跳过）
async function addColumnIfMissing(table, column, def) {
  try {
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  } catch (e) {
    // 列已存在 —— SQLite 的 ALTER TABLE 只能加列，加重复会报错，忽略即可
  }
}

async function initTables() {
  // 管理员表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 新闻表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      cover_image TEXT,
      category TEXT,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 媒体资源分类表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS media_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 媒体资源点位表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS media_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT,
      icon TEXT,
      section_en TEXT,
      description TEXT,
      image TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_slug) REFERENCES media_categories(slug)
    )
  `);

  // 媒体点位-公司关联表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS media_point_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      point_slug TEXT NOT NULL,
      company_slug TEXT NOT NULL,
      company_name TEXT NOT NULL,
      points_json TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 会员展示表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT,
      logo TEXT,
      industry TEXT,
      subtitle TEXT,
      description TEXT,
      bio TEXT,
      tags_json TEXT,
      media_target TEXT,
      website TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      address TEXT,
      gallery_json TEXT,
      honors_json TEXT,
      is_featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // 兼容旧库：补字段
  await addColumnIfMissing('members', 'slug', 'TEXT');
  await addColumnIfMissing('members', 'subtitle', 'TEXT');
  await addColumnIfMissing('members', 'bio', 'TEXT');
  await addColumnIfMissing('members', 'tags_json', 'TEXT');
  await addColumnIfMissing('members', 'media_target', 'TEXT');
  await addColumnIfMissing('members', 'contact_name', 'TEXT');
  await addColumnIfMissing('members', 'contact_phone', 'TEXT');
  await addColumnIfMissing('members', 'address', 'TEXT');
  await addColumnIfMissing('members', 'gallery_json', 'TEXT');
  await addColumnIfMissing('members', 'honors_json', 'TEXT');

  // 首页统计数据表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS site_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      suffix TEXT,
      sort_order INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 首页板块内容（Hero / Stats / News 预览 / Media 预览 / Members 预览 / CTA）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS homepage_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_key TEXT UNIQUE NOT NULL,
      title TEXT,
      subtitle TEXT,
      eyebrow TEXT,
      description TEXT,
      body_html TEXT,
      cta_text TEXT,
      cta_href TEXT,
      background_image TEXT,
      sort_order INTEGER DEFAULT 0,
      is_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 单页内容（关于协会 / 政策法规 / 会员服务 / 联系我们 / 潍广通简介）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS page_contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT UNIQUE NOT NULL,
      title TEXT,
      subtitle TEXT,
      banner_image TEXT,
      body_html TEXT,
      extra_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedData() {
  // 统计数据
  const existingCount = await db.get('SELECT COUNT(*) AS count FROM site_stats');
  if (existingCount && existingCount.count === 0) {
    const defaultStats = [
      { key: 'members', label: '会员单位', value: '200', suffix: '+' },
      { key: 'cases', label: '服务案例', value: '3600', suffix: '+' },
      { key: 'points', label: '覆盖点位', value: '50000', suffix: '+' },
      { key: 'years', label: '行业经验', value: '15', suffix: '年' }
    ];
    for (let i = 0; i < defaultStats.length; i++) {
      const s = defaultStats[i];
      await db.run(`INSERT OR IGNORE INTO site_stats (key, label, value, suffix, sort_order) VALUES (?,?,?,?,?)`,
        [s.key, s.label, s.value, s.suffix, i]);
    }
  }
}

async function seedContent() {
  // ---- 媒体分类 & 点位 ----
  const catCount = await db.get('SELECT COUNT(*) AS count FROM media_categories');
  const pointCount = await db.get('SELECT COUNT(*) AS count FROM media_points');
  const newsCount = await db.get('SELECT COUNT(*) AS count FROM news');

  const categories = [
    { slug: 'outdoor', name: '户外大牌', description: '城市主干道与商圈核心位置高触及率广告位', cover_image: '../assets/media-outdoor.jpg', sort_order: 0 },
    { slug: 'elevator', name: '电梯媒体', description: '覆盖住宅与商务楼宇的封闭场景广告', cover_image: '../assets/media-elevator.jpg', sort_order: 1 },
    { slug: 'transit', name: '交通媒体', description: '公交车身与站台触达城市出行人群', cover_image: '../assets/media-transit.jpg', sort_order: 2 },
    { slug: 'community', name: '社区媒体', description: '深入社区门禁与道闸的精准触达', cover_image: '../assets/media-community.jpg', sort_order: 3 },
    { slug: 'scene', name: '场景媒体', description: '商超与展馆场景化沉浸式投放', cover_image: '../assets/media-scene.jpg', sort_order: 4 }
  ];
  if (catCount && catCount.count === 0) {
    for (const c of categories) {
      await db.run(`INSERT OR IGNORE INTO media_categories (slug, name, description, cover_image, sort_order) VALUES (?,?,?,?,?)`,
        [c.slug, c.name, c.description, c.cover_image, c.sort_order]);
    }
  }

  const points = [
    { category_slug: 'outdoor', title: 'LED大屏', description: '高人流商圈LED巨幕，全天候曝光', sort_order: 0 },
    { category_slug: 'outdoor', title: '高速单立柱', description: '高速公路出入口，远距离视觉冲击', sort_order: 1 },
    { category_slug: 'outdoor', title: '楼顶大牌', description: '城区主干道楼宇顶部，品牌地标', sort_order: 2 },
    { category_slug: 'outdoor', title: '跨线桥广告', description: '城市高架跨线桥，车流必经', sort_order: 3 },
    { category_slug: 'elevator', title: '电梯海报', description: '住宅/写字楼电梯框架，精准触达', sort_order: 0 },
    { category_slug: 'elevator', title: '电梯电视', description: '电梯内视频广告，动态展示', sort_order: 1 },
    { category_slug: 'elevator', title: '智能屏', description: 'AI智能投放，程序化购买', sort_order: 2 },
    { category_slug: 'transit', title: '公交车身', description: '全车身覆膜广告，移动曝光', sort_order: 0 },
    { category_slug: 'transit', title: '公交候车亭', description: '站台灯箱，候车黄金视线', sort_order: 1 },
    { category_slug: 'transit', title: '出租车顶灯屏', description: '车载LED屏，城市穿梭', sort_order: 2 },
    { category_slug: 'transit', title: '高铁站灯箱', description: '高铁站候车大厅，高端客流', sort_order: 3 },
    { category_slug: 'community', title: '小区道闸', description: '出入口道闸广告，必经通道', sort_order: 0 },
    { category_slug: 'community', title: '门禁广告', description: '单元门禁屏，最后十米', sort_order: 1 },
    { category_slug: 'community', title: '快递柜屏', description: '智能快递柜屏幕，高频触达', sort_order: 2 },
    { category_slug: 'scene', title: '影院映前', description: '电影映前广告，沉浸式体验', sort_order: 0 },
    { category_slug: 'scene', title: '健身房', description: '运动场景屏，健康人群', sort_order: 1 },
    { category_slug: 'scene', title: '餐饮桌贴', description: '餐桌桌面广告，用餐时长', sort_order: 2 },
    { category_slug: 'scene', title: '药店医院灯箱', description: '健康场景灯箱，精准人群', sort_order: 3 }
  ];
  if (pointCount && pointCount.count === 0) {
    for (const p of points) {
      await db.run(`INSERT OR IGNORE INTO media_points (category_slug, title, description, sort_order) VALUES (?,?,?,?)`,
        [p.category_slug, p.title, p.description, p.sort_order]);
    }
  }

  const news = [
    { title: '协会召开2026年第一次理事会会议', summary: '总结上半年工作，部署下半年重点任务', category: '协会要闻', is_published: 1, sort_order: 0, created_at: '2026-07-15 10:00:00' },
    { title: '关于缴纳2026年度会费的通知', summary: '请各会员单位于8月31日前完成会费缴纳', category: '通知公告', is_published: 1, sort_order: 1, created_at: '2026-07-10 10:00:00' },
    { title: '关于举办第六届广告创意大赛的通知', summary: '面向全市广告企业征集优秀创意作品', category: '通知公告', is_published: 1, sort_order: 2, created_at: '2026-07-08 10:00:00' }
  ];
  if (newsCount && newsCount.count === 0) {
    for (const n of news) {
      await db.run(`INSERT OR IGNORE INTO news (title, summary, category, is_published, sort_order, created_at) VALUES (?,?,?,?,?,?)`,
        [n.title, n.summary, n.category, n.is_published, n.sort_order, n.created_at]);
    }
  }

  // ---- 12 家会员公司（替换旧 seed） ----
  const richMembers = [
    { name:'分众传媒潍坊分公司', logo:'../assets/member-baer.png', industry:'电梯/户外', subtitle:'成立于 2014 · 分众传媒潍坊唯一合作伙伴', description:'运营分众「中国商业楼宇联播网」潍坊业务，覆盖商业楼宇电梯媒体、潍坊北站灯箱、人民广场户外LED、丰橘园三面翻及小区框架与视频联播网。', tags:['电梯联播网','北站灯箱','户外LED/三面翻'], media_target:'#cat-elevator,#cat-outdoor', contact_name:'王慧慧', contact_phone:'13964601133', address:'潍坊市高新区东方路与富华巷路口南', sort_order:0, is_featured:1 },
    { name:'山东拜尔文化科技有限公司', logo:'../assets/member-baer.png', industry:'品牌/展厅', subtitle:'40 人全职团队 · 策划-设计-落地一站式', description:'深耕本地企业品牌与空间文化服务，主营业务涵盖品牌VI全案、物料设计、展厅展馆搭建、空间文化设计，拒绝模板化，为企业定制专属方案。', tags:['品牌VI全案','展厅展馆','空间文化'], media_target:'#tab-by-company', contact_name:'花金亮', contact_phone:'13053693691', address:'潍坊市奎文区泰华大厦B座20层', sort_order:1, is_featured:1 },
    { name:'山东道尔森传媒服务有限公司', logo:'', industry:'户外天桥', subtitle:'潍坊天桥广告运营商 · 20+ 座天桥媒体', description:'独家运营潍坊城区二十余座人行天桥LED屏、三面翻与灯箱媒体，覆盖富华桥、人民医院桥、十笏园桥、人民商场桥等核心点位，并提供平面设计服务。', tags:['天桥LED','三面翻/灯箱','平面设计'], media_target:'#cat-outdoor', contact_name:'王均鹏', contact_phone:'16653688888', address:'', sort_order:2, is_featured:1 },
    { name:'山东金桥广告装饰有限公司', logo:'../assets/member-jinqiao.png', industry:'全媒体整合', subtitle:'成立于 1997 · 全媒体整合传播 + 装饰工程', description:'29年匠心企业，整合CCTV及省市媒体资源，精耕展览展示、建筑装饰、景观亮化、园林绿化，融合古建修复、数字孪生、VR/AR与AI创意。', tags:['媒体代理','展厅设计','文化空间'], media_target:'#tab-by-company', contact_name:'李勇', contact_phone:'0536-3231355', address:'青州市范公亭西路1818号', sort_order:3, is_featured:1 },
    { name:'山东龙行十万传媒有限公司', logo:'../assets/member-longxing.png', industry:'高速户外', subtitle:'成立于 2015 · 山东高速户外媒体运营', description:'专注户外媒体运营，布局30+大型广告牌与7400+路灯杆挂旗，覆盖山东13条高速公共交通指示牌与龙门架，资源辐射济南、青岛、威海、诸城等地。', tags:['高速收费站雨棚','单立柱','跨线桥/道旗'], media_target:'#cat-outdoor', contact_name:'惠彬', contact_phone:'158-5448-6555', address:'诸城市东武街137号鑫城商务楼', sort_order:4, is_featured:1 },
    { name:'弘易传媒（HonyMedia）', logo:'../assets/member-hongyi.png', industry:'电梯媒体', subtitle:'始创于 2007 · 国内领军电梯媒体集团', description:'深耕电梯海报、电梯电视与智能屏三大形态，矩阵覆盖全国200余城中高端社区与写字楼，「媒体发布+品牌全案」双轮驱动，服务茅台、京东、伊利等一线品牌。', tags:['电梯海报','电梯电视','品牌全案'], media_target:'#cat-elevator', contact_name:'', contact_phone:'4006189199', address:'潍坊市高新区东风东街4899号金融广场', sort_order:5, is_featured:1 },
    { name:'潍坊恒瑞文化发展有限公司', logo:'../assets/member-hengrui.jpg', industry:'铁路户外', subtitle:'国企 · 铁路与城市户外媒体运营', description:'本土大型全户外媒体运营商，拥有济南铁路局多个火车站、高铁站站内媒体独家招商运营权，及潍坊市区人行天桥、渤海路下穿桥、路口楼体大屏等资源。', tags:['高铁站媒体','人行天桥','楼体大屏'], media_target:'#cat-transit,#cat-outdoor', contact_name:'', contact_phone:'', address:'', sort_order:6, is_featured:1 },
    { name:'山东晟利信息科技有限公司', logo:'', industry:'互联网运营', subtitle:'技术驱动型互联网公司 · 核心团队出自百度阿里', description:'深耕实体生产型企业互联网运营十余年，提供系统研发、产品运营、渠道拓展一体化服务，为实体企业提供高性价比、强效果的线上运营方案。', tags:['企业网络推广','线上运营','系统研发'], media_target:'#tab-by-company', contact_name:'刘娜', contact_phone:'18353665791', address:'潍坊市潍城区西街88号8楼', sort_order:7, is_featured:1 },
    { name:'青州市欣澳文化传媒服务有限公司', logo:'', industry:'短视频营销', subtitle:'成立于 2022 · 外贸/教育/传媒协同', description:'一站式数字营销服务商，提供短视频代运营、大场直播、抖音本地生活服务，发布内容超5000条、破亿播放，累计服务500+客户、助推400+餐饮娱乐企业。', tags:['短视频代运营','大场直播','抖音本地生活'], media_target:'#tab-by-company', contact_name:'王建海', contact_phone:'15621621212', address:'青州市泰华大厦1114', sort_order:8, is_featured:1 },
    { name:'山东汉唐传媒有限公司', logo:'../assets/member-hantang.png', industry:'商圈LED', subtitle:'成立于 2009 · 城市核心商圈LED大屏运营商', description:'集广告策划、定位研究、影业视频拍摄、代理发布于一体，运营泰华、万达、谷德、谷德茂、东盛广场、坊子泰华、上城国际等16处核心商圈LED大屏。', tags:['商圈LED大屏','商超LED','影视拍摄'], media_target:'#cat-outdoor', contact_name:'黄云斌', contact_phone:'0536-2437777', address:'', sort_order:9, is_featured:1 },
    { name:'潍坊市公共交通集团广告分公司', logo:'../assets/member-bus.jpg', industry:'公交独家', subtitle:'始创于 1992 · 国有 · 公交广告独家运营商', description:'潍坊城区公交车体广告独家运营商，拥有148条线路、1200余台公交、350余候车亭，涵盖车体、候车亭、站点冠名、车内语音等15种媒体形式，屡获中国广告长城奖金奖。', tags:['公交车身','候车亭','线路冠名'], media_target:'#cat-transit', contact_name:'', contact_phone:'0536-8256549', address:'', sort_order:10, is_featured:1 },
    { name:'潍坊顺泽信息科技有限公司', logo:'../assets/member-shunze.png', industry:'本地生活代理', subtitle:'成立于 2014 · 58同城核心代理商', description:'集58同城代理与高德GEO全域优化于一体的综合性数字营销企业，独家代理潍坊、德州、信阳、许昌及50余县市区本地生活频道，为商家提供一站式线上线下推广方案。', tags:['58同城代理','高德GEO','本地生活营销'], media_target:'#tab-by-company', contact_name:'', contact_phone:'', address:'', sort_order:11, is_featured:1 }
  ];
  const memberCount = await db.get('SELECT COUNT(*) AS count FROM members');
  if (memberCount && memberCount.count === 0) {
    for (const m of richMembers) {
      await db.run(`INSERT OR IGNORE INTO members
        (name, logo, industry, subtitle, description, tags_json, media_target, contact_name, contact_phone, address, sort_order, is_featured, is_published)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        [m.name, m.logo, m.industry, m.subtitle, m.description, JSON.stringify(m.tags), m.media_target, m.contact_name, m.contact_phone, m.address, m.sort_order, m.is_featured]);
    }
  }

  // ---- 首页板块 ----
  const homepageSeed = [
    { section_key:'hero', eyebrow:'WEIFANG ADVERTISING ASSOCIATION', title:'让广告更有价值', subtitle:'潍坊市广告协会 · 连接行业资源 · 赋能品牌增长', description:'作为潍坊市广告行业的行业自律与资源共享平台，协会致力于整合政府、媒体、企业三方资源，为会员企业提供政策咨询、媒体采购、创意交流与人才培养一站式服务。', cta_text:'了解协会', cta_href:'./about-new.html', background_image:'../assets/hero-city.gif', sort_order:0 },
    { section_key:'stats', eyebrow:'DATA', title:'行业数据', subtitle:'协会会员概览', description:'协会成立十余年来，已汇聚近两百家优秀会员企业，覆盖户外、电梯、公交、社区、商圈五大媒体场景数万个广告点位。', cta_text:'', cta_href:'', background_image:'', sort_order:1 },
    { section_key:'news_preview', eyebrow:'NEWS', title:'协会要闻', subtitle:'', description:'', cta_text:'', cta_href:'./news.html', background_image:'', sort_order:2 },
    { section_key:'media_preview', eyebrow:'WEIGUANGTONG', title:'潍广通', subtitle:'一站式媒体资源平台', description:'整合潍坊本地五大媒体类别的核心广告资源，为品牌方与代理公司提供透明、高效的媒体采购与发布服务。', cta_text:'进入潍广通', cta_href:'./media.html', background_image:'../assets/bg-media-abstract.gif', sort_order:3 },
    { section_key:'members_preview', eyebrow:'MEMBERS', title:'会员风采', subtitle:'', description:'汇聚潍坊广告行业骨干企业。', cta_text:'查看全部会员', cta_href:'./members.html', background_image:'../assets/bg-member.gif', sort_order:4 },
    { section_key:'cta', eyebrow:'JOIN US', title:'加入潍坊市广告协会', subtitle:'携手共进，赋能广告产业高质量发展', description:'', cta_text:'入会申请', cta_href:'./service.html', background_image:'../assets/bg-cta-city.gif', sort_order:5 }
  ];
  for (const s of homepageSeed) {
    await db.run(`INSERT OR IGNORE INTO homepage_sections
      (section_key, eyebrow, title, subtitle, description, cta_text, cta_href, background_image, sort_order, is_enabled)
      VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [s.section_key, s.eyebrow, s.title, s.subtitle, s.description, s.cta_text, s.cta_href, s.background_image, s.sort_order]);
  }

  // ---- 单页内容 ----
  const pageSeed = [
    { page_key:'about', title:'关于协会', subtitle:'ABOUT US', banner_image:'../assets/bg-news-banner.gif', body_html:'<p>潍坊市广告协会是经潍坊市行政审批服务局批准、潍坊市民政局登记注册，由潍坊市市场监督管理局作为业务主管单位的全市性、行业性、非营利性社会组织。</p><p>协会宗旨：团结带领会员单位，遵守国家法律法规，恪守社会道德风尚，推动行业自律，规范行业秩序，维护行业合法权益，促进广告业健康发展。</p>' },
    { page_key:'policy', title:'政策法规', subtitle:'POLICY & REGULATIONS', banner_image:'../assets/bg-news-banner.gif', body_html:'<p>本板块收录与广告行业相关的法律法规、部门规章及地方性政策文件，会员单位可在此查阅最新监管要求。</p>' },
    { page_key:'service', title:'会员服务', subtitle:'MEMBER SERVICES', banner_image:'../assets/bg-news-banner.gif', body_html:'<p>协会为会员单位提供政策咨询、媒体资源对接、行业培训、创意交流、评优表彰等多项专属服务。</p>' },
    { page_key:'contact', title:'联系我们', subtitle:'CONTACT US', banner_image:'../assets/bg-news-banner.gif', body_html:'<p>协会办公地址：潍坊市潍城区怡园路1666号401室<br>联系电话：0536-8888XXX<br>邮箱：wfsggxh2026@163.com</p>' },
    { page_key:'media_intro', title:'潍广通简介', subtitle:'WEIGUANGTONG', banner_image:'../assets/bg-media-abstract.gif', body_html:'<p>潍广通是潍坊市广告协会打造的一站式媒体资源平台，整合户外大牌、电梯媒体、交通媒体、社区媒体、场景媒体五大类别的核心广告资源。</p>' }
  ];
  for (const p of pageSeed) {
    await db.run(`INSERT OR IGNORE INTO page_contents
      (page_key, title, subtitle, banner_image, body_html)
      VALUES (?,?,?,?,?)`,
      [p.page_key, p.title, p.subtitle, p.banner_image, p.body_html]);
  }
}

async function ensureDefaultAdmin() {
  const bcrypt = require('bcryptjs');
  const count = await db.get('SELECT COUNT(*) AS c FROM admin');
  if (count && count.c === 0) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO admin (username, password_hash) VALUES (?,?)', ['admin', hash]);
    console.log('已创建默认管理员账号 admin / admin123');
  }
}

async function init() {
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA foreign_keys = ON');
  await initTables();
  await seedData();
  await seedContent();
  await ensureDefaultAdmin();
}

module.exports = { db, init };
