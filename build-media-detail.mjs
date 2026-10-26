// 生成潍广通 18 个媒体类型二级页面
import fs from "fs";
import path from "path";

const PAGES_DIR = path.resolve("./pages");
const ASSETS_DIR = path.resolve("./assets/media-cases");
const DATA = JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, "media-data.json"), "utf8"));

// ---------- 1. 提取共用 CSS（从 about-new.html 合并所有 style） ----------
const aboutSrc = fs.readFileSync(path.join(PAGES_DIR, "about-new.html"), "utf8");
const styleBlocks = [];
const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/g;
let m;
while ((m = styleRe.exec(aboutSrc)) !== null) {
  styleBlocks.push(m[1]);
}

// 追加媒体详情页专用样式
const detailCss = `
/* ============ 媒体详情页专用 ============ */
.md-banner {
  position: relative;
  padding: 120px 0 64px;
  background: linear-gradient(135deg, var(--wf-ink) 0%, var(--wf-ink-2) 60%, var(--wf-primary-900) 100%);
  color: #fff;
  overflow: hidden;
}
.md-banner::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(22,89,214,.35) 0%, transparent 55%),
    radial-gradient(circle at 80% 70%, rgba(130,168,244,.2) 0%, transparent 50%);
  pointer-events: none;
}
.md-banner-inner { position: relative; z-index: 2; max-width: var(--wf-container); margin: 0 auto; padding: 0 24px; }
.md-breadcrumb {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; color: rgba(255,255,255,.85);
  margin-bottom: 18px;
}
.md-breadcrumb a { color: rgba(255,255,255,.85); }
.md-breadcrumb a:hover { color: #fff; }
.md-breadcrumb [data-lucide] { width: 14px; height: 14px; opacity: .7; }
.md-breadcrumb-current { color: #fff; }
.md-banner-head {
  display: flex; align-items: center; gap: 16px; margin-bottom: 16px;
}
.md-banner-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: rgba(255,255,255,.12); backdrop-filter: blur(8px);
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,.18);
}
.md-banner-icon [data-lucide] { width: 28px; height: 28px; color: #fff; }
.md-banner-title { font-size: 40px; font-weight: 800; margin: 0; letter-spacing: -.02em; }
.md-banner-en { font-size: 13px; font-weight: 600; letter-spacing: .2em; color: var(--wf-primary-300); text-transform: uppercase; }
.md-banner-desc { font-size: 16px; color: rgba(255,255,255,.8); max-width: 720px; line-height: 1.7; margin: 8px 0 0; }

.md-section { padding: 72px 0; background: var(--wf-neutral-50); }
.md-container { max-width: var(--wf-container); margin: 0 auto; padding: 0 24px; }
.md-section-head { margin-bottom: 40px; }
.md-section-eyebrow { font-size: 13px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--wf-primary-500); }
.md-section-title { font-size: 28px; font-weight: 800; margin: 8px 0 0; }
.md-section-title strong { color: var(--wf-primary-500); }
.md-section-count { color: var(--wf-neutral-500); font-size: 14px; margin-top: 6px; }

.md-company {
  background: var(--wf-card);
  border: 1px solid var(--wf-border);
  border-radius: var(--wf-radius-large);
  padding: 32px;
  margin-bottom: 28px;
  box-shadow: 0 4px 20px rgba(15,22,38,.04);
  transition: box-shadow .25s, transform .25s;
}
.md-company:hover { box-shadow: 0 12px 40px rgba(15,22,38,.1); transform: translateY(-2px); }
.md-company-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--wf-border);
}
.md-company-name {
  font-size: 22px; font-weight: 800; color: var(--wf-foreground);
  display: inline-flex; align-items: center; gap: 10px;
  text-decoration: none; transition: color .2s;
}
.md-company-name:hover { color: var(--wf-primary-500); }
.md-company-name [data-lucide] { width: 18px; height: 18px; color: var(--wf-primary-500); }
.md-company-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: var(--wf-primary-50); color: var(--wf-primary-600);
  border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap;
}
.md-company-tag [data-lucide] { width: 14px; height: 14px; }
.md-company-desc { font-size: 14px; color: var(--wf-neutral-500); margin: -12px 0 20px; line-height: 1.7; }

.md-points-title {
  font-size: 14px; font-weight: 700; color: var(--wf-neutral-700);
  margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
}
.md-points-title [data-lucide] { width: 16px; height: 16px; color: var(--wf-primary-500); }
.md-point-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.md-point-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; background: var(--wf-neutral-50);
  border-radius: 10px; font-size: 14px; color: var(--wf-neutral-700); line-height: 1.5;
}
.md-point-item [data-lucide] { width: 16px; height: 16px; color: var(--wf-primary-400); flex-shrink: 0; margin-top: 1px; }

.md-gallery { margin-top: 20px; }
.md-gallery-title { font-size: 14px; font-weight: 700; color: var(--wf-neutral-700); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.md-gallery-title [data-lucide] { width: 16px; height: 16px; color: var(--wf-primary-500); }
.md-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.md-gallery-item {
  aspect-ratio: 4/3; border-radius: 12px; overflow: hidden;
  background: var(--wf-neutral-100); border: 1px solid var(--wf-border);
  cursor: pointer; transition: transform .25s;
}
.md-gallery-item:hover { transform: scale(1.03); }
.md-gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block; }

.md-empty {
  text-align: center; padding: 64px 24px;
  background: var(--wf-card); border: 1px dashed var(--wf-border); border-radius: var(--wf-radius-large);
}
.md-empty-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--wf-neutral-100); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.md-empty-icon [data-lucide] { width: 32px; height: 32px; color: var(--wf-neutral-400); }
.md-empty-text { font-size: 16px; color: var(--wf-neutral-500); margin-bottom: 4px; }
.md-empty-sub { font-size: 14px; color: var(--wf-neutral-400); }

.md-back {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 40px; color: var(--wf-primary-500); font-weight: 600; font-size: 15px;
  text-decoration: none;
}
.md-back:hover { color: var(--wf-primary-600); }
.md-back [data-lucide] { width: 18px; height: 18px; }

@media (max-width: 900px) {
  .md-banner { padding: 100px 0 48px; }
  .md-banner-title { font-size: 28px; }
  .md-company { padding: 22px; }
  .md-company-name { font-size: 18px; }
  .md-point-list { grid-template-columns: 1fr; }
  .md-gallery-grid { grid-template-columns: repeat(2, 1fr); }
}
`;

const cssContent = styleBlocks.join("\n") + "\n" + detailCss;
fs.writeFileSync(path.join(ASSETS_DIR, "media-detail.css"), cssContent);
console.log("CSS 已生成: media-detail.css (" + cssContent.length + " chars)");

// ---------- 2. 生成每个公司的图片列表 ----------
function getCompanyImages(slug) {
  const dir = path.join(ASSETS_DIR, slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, 8);
}

// ---------- 3. 页面模板 ----------
function buildPage(cat) {
  const icon = cat.icon;
  const companies = cat.companies || [];

  // 公司区块 HTML
  const companiesHtml = companies.length === 0
    ? `<div class="md-empty">
         <div class="md-empty-icon"><i data-lucide="package-open"></i></div>
         <p class="md-empty-text">该媒体类型暂未入驻媒体主</p>
         <p class="md-empty-sub">如您有相关媒体资源，欢迎通过「发布媒体资源」入驻潍广通</p>
       </div>`
    : companies.map(c => {
        const imgs = getCompanyImages(c.slug);
        const gallery = imgs.length > 0
          ? `<div class="md-gallery">
               <div class="md-gallery-title"><i data-lucide="image"></i> 项目案例</div>
               <div class="md-gallery-grid">
                 ${imgs.map(f => `<div class="md-gallery-item"><img src="../assets/media-cases/${c.slug}/${f}" alt="${c.name} 案例" loading="lazy"></div>`).join("")}
               </div>
             </div>`
          : "";
        return `
        <article class="md-company wf-reveal">
          <div class="md-company-head">
            <a href="./member-detail-${c.slug}.html" class="md-company-name" data-dom-id="company-${c.slug}">
              ${c.name}
              <i data-lucide="arrow-up-right"></i>
            </a>
            <span class="md-company-tag"><i data-lucide="map-pin"></i> ${c.points.length} 个点位</span>
          </div>
          <p class="md-company-desc">${c.desc}</p>
          <div class="md-points-title"><i data-lucide="map"></i> 媒体点位</div>
          <ul class="md-point-list">
            ${c.points.map(p => `<li class="md-point-item"><i data-lucide="dot"></i>${p}</li>`).join("")}
          </ul>
          ${gallery}
        </article>`;
      }).join("");

  const totalPoints = companies.reduce((s, c) => s + c.points.length, 0);

  return `<!DOCTYPE html>
<html lang="zh-CN" class="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cat.name} - 潍广通 · 潍坊市广告协会</title>
  <link rel="stylesheet" href="../assets/media-cases/media-detail.css">
</head>
<body>
<!-- ============ SITE HEADER ============ -->
<header class="wf-site-header">
  <div class="wf-topbar">
    <div class="wf-container wf-topbar-inner">
      <span class="wf-topbar-welcome">欢迎来到潍坊市广告协会官方网站</span>
      <div class="wf-topbar-actions">
        <a href="./contact.html" class="wf-topbar-link"><i data-lucide="phone" class="wf-ico-sm"></i>0536-8888XXX</a>
        <a href="./contact.html" class="wf-topbar-link"><i data-lucide="mail" class="wf-ico-sm"></i>wfsggxh2026@163.com</a>
        <a href="./service.html" class="wf-topbar-cta">入会申请</a>
      </div>
    </div>
  </div>
  <div class="wf-mainbar">
    <div class="wf-container wf-mainbar-inner">
      <a href="./index.html" class="wf-brand">
        <span class="wf-brand-mark"><img src="../assets/logo-white.png" alt="潍坊市广告协会"></span>
      </a>
      <nav class="wf-nav" aria-label="主导航">
        <a href="./index.html" class="wf-nav-item" data-dom-id="nav-home">首页</a>
        <a href="./about-new.html" class="wf-nav-item" data-dom-id="nav-about">关于协会</a>
        <a href="./news.html" class="wf-nav-item" data-dom-id="nav-news">协会动态</a>
        <a href="./policy.html" class="wf-nav-item" data-dom-id="nav-policy">政策法规</a>
        <a href="./service.html" class="wf-nav-item" data-dom-id="nav-service">会员服务</a>
        <a href="./members.html" class="wf-nav-item" data-dom-id="nav-member">会员风采</a>
        <a href="./media.html" class="wf-nav-item wf-nav-highlight" data-dom-id="nav-media" data-active="true">潍广通</a>
      </nav>
    </div>
  </div>
</header>

<main>
  <!-- Banner -->
  <section class="md-banner">
    <div class="md-banner-inner">
      <nav class="md-breadcrumb" aria-label="面包屑">
        <a href="./index.html">首页</a>
        <i data-lucide="chevron-right"></i>
        <a href="./media.html">潍广通</a>
        <i data-lucide="chevron-right"></i>
        <span class="md-breadcrumb-current">${cat.name}</span>
      </nav>
      <div class="md-banner-head">
        <span class="md-banner-icon"><i data-lucide="${icon}"></i></span>
        <div>
          <div class="md-banner-en">${cat.sectionEn}</div>
          <h1 class="md-banner-title">${cat.name}</h1>
        </div>
      </div>
      <p class="md-banner-desc">${cat.desc}</p>
    </div>
  </section>

  <!-- 公司列表 -->
  <section class="md-section">
    <div class="md-container">
      <div class="md-section-head wf-reveal">
        <span class="md-section-eyebrow">${cat.section}</span>
        <h2 class="md-section-title">入驻媒体主 <strong>${companies.length}</strong> 家</h2>
        <p class="md-section-count">覆盖 <strong>${totalPoints}</strong> 个媒体点位，点击公司名称查看会员详情</p>
      </div>
      ${companiesHtml}
      <a href="./media.html" class="md-back"><i data-lucide="arrow-left"></i> 返回潍广通</a>
    </div>
  </section>
</main>

<footer class="wf-site-footer">
  <div class="wf-container wf-footer-grid">
    <div class="wf-footer-col wf-footer-about">
      <div class="wf-footer-brand">
        <span class="wf-brand-mark"><img src="../assets/logo-white.png" alt="潍坊市广告协会"></span>
      </div>
      <p class="wf-footer-desc">潍坊市广告协会是经潍坊市行政审批服务局批准、潍坊市民政局登记注册，由潍坊市市场监督管理局作为业务主管单位的全市性、行业性、非营利性社会组织。</p>
    </div>
    <div class="wf-footer-col">
      <h4 class="wf-footer-title">快速导航</h4>
      <ul class="wf-footer-links">
        <li><a href="./index.html">首页</a></li>
        <li><a href="./about-new.html">关于协会</a></li>
        <li><a href="./news.html">协会动态</a></li>
        <li><a href="./policy.html">政策法规</a></li>
        <li><a href="./service.html">会员服务</a></li>
        <li><a href="./members.html">会员风采</a></li>
        <li><a href="./media.html">潍广通</a></li>
        <li><a href="./contact.html" data-dom-id="footer-contact">联系我们</a></li>
      </ul>
    </div>
    <div class="wf-footer-col">
      <h4 class="wf-footer-title">联系我们</h4>
      <ul class="wf-footer-links wf-footer-contact">
        <li><i data-lucide="map-pin" class="wf-ico-sm"></i>潍坊市潍城区怡园路1666号401</li>
        <li><i data-lucide="phone" class="wf-ico-sm"></i>0536-8888XXX</li>
        <li><i data-lucide="mail" class="wf-ico-sm"></i>wfsggxh2026@163.com</li>
      </ul>
    </div>
    <div class="wf-footer-col wf-footer-qr">
      <h4 class="wf-footer-title">关注我们</h4>
      <div class="wf-qr-box"><img src="../assets/qrcode-wechat.jpg" alt="公众号二维码" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>
      <span class="wf-qr-label">官方微信</span>
    </div>
  </div>
  <div class="wf-footer-bottom">
    <div class="wf-container wf-footer-bottom-inner">
      <div class="wf-footer-friendly">
        <span class="wf-footer-friendly-label">友情链接：</span>
        <a href="#">中国广告协会</a>
        <a href="#">山东省广告协会</a>
        <a href="#">潍坊市市场监督管理局</a>
        <a href="#">潍坊市广告产业园</a>
      </div>
      <p class="wf-footer-copy">© 2026 潍坊市广告协会 版权所有　鲁ICP备XXXXXXXX号</p>
    </div>
  </div>
</footer>

<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
<script>
  if (window.lucide) { lucide.createIcons(); }
  // Scroll reveal
  (function(){
    var els = document.querySelectorAll('.wf-reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function(el){ el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function(el){ io.observe(el); });
  })();
</script>
</body>
</html>`;
}

// ---------- 4. 生成所有页面 ----------
let count = 0;
for (const cat of DATA.categories) {
  const html = buildPage(cat);
  const outPath = path.join(PAGES_DIR, `media-detail-${cat.slug}.html`);
  fs.writeFileSync(outPath, html);
  count++;
  console.log(`生成: media-detail-${cat.slug}.html (${cat.name}, ${cat.companies.length} 家公司)`);
}
console.log(`\n共生成 ${count} 个媒体详情页面`);
