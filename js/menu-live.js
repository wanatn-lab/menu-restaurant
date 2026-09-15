/* ===================================================================
   เมนูไลฟ์ จิ๊นโค สุพรรณบุรี
   ดึงข้อมูลเมนู (ชื่อ/ราคา/รูป/วิดีโอ) จาก /api/content
   ซึ่งเจ้าของร้านแก้ไขเองได้ผ่านหน้า /admin (ไม่ต้องแก้โค้ด ไม่ต้องใช้ Google Sheet)
   ใช้ร่วมกันทั้งหน้าแรก (index.html) และหน้าเมนูไลฟ์ (menu-live.html)
   เพื่อให้หน้าบ้านทุกหน้าตรงกับข้อมูลหลังบ้านเสมอ
   =================================================================== */

// ข้อมูลเมนูสำรอง ใช้แสดงผลถ้าดึงจาก /api/content ไม่สำเร็จ
// (เช่น ฟังก์ชันยังไม่ได้ deploy หรือเปิดไฟล์ตรงในเครื่องโดยไม่มีเซิร์ฟเวอร์)
const MENU_LIVE_FALLBACK = [
  { category: 'ของทอด & ปิ้งย่าง', name: 'ไก่ทอด', price: '60', desc: 'ไก่ทอดสมุนไพรกรอบนอกฉ่ำใน หมักด้วยเครื่องเทศแบบร้าน', image: 'images/dish-kaithod.svg', video: '', featured: false },
  { category: 'ของทอด & ปิ้งย่าง', name: 'ไส้อั่วโฮมเมด', price: '60', desc: 'ไส้อั่วหอมๆ เครื่องเทศแน่น รสเข้มข้น กับสูตรโฮมเมดของเราเอง', image: 'images/dish-saiua.svg', video: '', featured: true },
  { category: 'ของทอด & ปิ้งย่าง', name: 'แคบหมู', price: '30', desc: 'แคบหมูทอดกรอบ เคี้ยวมัน หอมกลิ่นหมูแท้', image: 'images/dish-kaepmoo.svg', video: '', featured: true },
  { category: 'น้ำพริก & เครื่องเคียง', name: 'พริกหนุ่มปิ้งตำ', price: '30', desc: 'พริกหนุ่มปิ้งตำสด รสกลมกล่อม เสิร์ฟพร้อมแคบหมูและผักสดตามฤดูกาล', image: 'images/dish-namprik.svg', video: '', featured: true },
  { category: 'น้ำพริก & เครื่องเคียง', name: 'ป่นน้ำปู๋ (สูตรเค้ง)', price: '100', desc: 'ป่นน้ำปู๋สูตรเค้ง เอกลักษณ์เฉพาะร้าน รสเข้มข้นแบบล้านนาแท้', image: 'images/dish-laab.svg', video: '', featured: true },
  { category: 'พิเศษ', name: 'อ่องปูแสม', price: '100', desc: 'อ่องปูแสม แกงคั่วรสจัดจ้าน กลิ่นหอมเครื่องแกงเหนือ', image: '', video: '', featured: true },
  { category: 'พิเศษ', name: 'ข้าวซอยเนื้อ/ไก่', price: '70', desc: 'ข้าวซอยเนื้อ/ไก่ น้ำแกงเข้มข้น หอมเครื่องแกงเหนือ โรยหน้าเส้นกรอบ', image: '', video: '', featured: true }
];

function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/i.test(url);
}

function toYouTubeEmbed(url) {
  let id = '';
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  const longMatch = url.match(/[?&]v=([^?&]+)/);
  if (shortMatch) id = shortMatch[1];
  else if (longMatch) id = longMatch[1];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
}

function isVideoFileUrl(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function menuLivePriceText(item) {
  if (!item.price) return 'สอบถามราคา';
  return /^\d+$/.test(String(item.price)) ? `฿${item.price}` : item.price;
}

async function loadMenuLiveData() {
  try {
    const res = await fetch('/api/content', { cache: 'no-store' });
    if (!res.ok) throw new Error('โหลดเนื้อหาไม่สำเร็จ: ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data.menuItems) ? data.menuItems.filter(i => i && i.name) : [];
    if (!items.length) return { items: MENU_LIVE_FALLBACK, live: false };
    return { items, live: true };
  } catch (err) {
    console.warn('โหลดเมนูจาก /api/content ไม่สำเร็จ ใช้ข้อมูลตัวอย่างแทน:', err);
    return { items: MENU_LIVE_FALLBACK, live: false };
  }
}

function renderSkeleton(container, count = 6) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'live-card live-skeleton';
    el.innerHTML = `
      <div class="thumb"></div>
      <div class="sk-line"></div>
      <div class="sk-line short"></div>
    `;
    container.appendChild(el);
  }
}

// การ์ดที่มีวิดีโอไฟล์จริง (mp4/webm/ogg) เล่นอยู่ในการ์ดเลย — เอาเมาส์วางทับแล้วเล่นอัตโนมัติ
// (บนมือถือ แตะที่รูปเพื่อเล่น/หยุด) ไอคอนเล่นเป็นวงกลมเล็กมุมขวาบน ไม่บังกลางรูป
// คลิกที่ชื่อ/คำอธิบายด้านล่างการ์ด (ไม่ใช่รูป) เพื่อดูรายละเอียดเต็มของเมนูนั้น
function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'live-card';
  const imgSrc = item.image || 'images/dish-laab.svg';
  const hasInlineVideo = !!item.video && isVideoFileUrl(item.video);
  const hasOtherMedia = !!item.video && !hasInlineVideo;

  card.innerHTML = `
    <div class="thumb" aria-label="${item.name}">
      ${item.featured ? '<span class="ribbon-featured">แนะนำ</span>' : ''}
      <img src="${imgSrc}" alt="${item.name} จิ๊นโค สุพรรณบุรี" loading="lazy">
      ${hasInlineVideo ? `
        <video class="thumb-video" muted loop playsinline webkit-playsinline="true" disablePictureInPicture disableRemotePlayback preload="none">
          <source src="${item.video}" type="video/mp4">
        </video>
        <div class="play-btn"></div>
      ` : ''}
      ${hasOtherMedia ? '<div class="play-btn"></div>' : ''}
    </div>
    <div class="live-body">
      <h3><span>${item.name}</span><span class="price">${menuLivePriceText(item)}</span></h3>
      ${item.desc ? `<p>${item.desc}</p>` : ''}
      <span class="detail-hint">ดูรายละเอียด</span>
    </div>
  `;

  const thumb = card.querySelector('.thumb');
  const body = card.querySelector('.live-body');

  if (hasInlineVideo) {
    // มีวิดีโออินไลน์: วางเมาส์ทับ (หรือแตะบนมือถือ) ที่รูปเพื่อเล่นวิดีโอในการ์ดเอง
    wireInlineVideoCard(card);
  } else {
    // ไม่มีวิดีโออินไลน์ (ไม่มีวิดีโอเลย หรือเป็นลิงก์ YouTube): คลิก/แตะที่รูปเพื่อดูรายละเอียด
    thumb.style.cursor = 'pointer';
    thumb.setAttribute('role', 'button');
    thumb.setAttribute('tabindex', '0');
    thumb.addEventListener('click', () => openItemDetail(item));
    thumb.addEventListener('keypress', e => { if (e.key === 'Enter') openItemDetail(item); });
  }

  // คลิก/แตะที่ชื่อหรือคำอธิบายเมนู เพื่อดูรายละเอียดเต็มเสมอ ไม่ว่าการ์ดจะมีวิดีโอหรือไม่
  body.addEventListener('click', () => openItemDetail(item));

  return card;
}

// เล่นวิดีโอในการ์ดเอง: วางเมาส์ทับ = เล่น (คอมพิวเตอร์/แทร็กแพด), แตะที่รูป = เล่น/หยุด (มือถือ/จอสัมผัส)
// วิดีโออยู่ในกรอบการ์ดเดิมเสมอ ไม่เด้งเต็มจอ ไม่มี modal ระหว่างเล่น
function wireInlineVideoCard(card) {
  const thumb = card.querySelector('.thumb');
  const video = card.querySelector('.thumb-video');
  const btn = card.querySelector('.play-btn');
  let isPlaying = false;

  const play = () => {
    video.classList.add('playing');
    video.currentTime = 0;
    video.play().catch(() => {});
    isPlaying = true;
    btn.classList.add('is-playing');
  };
  const stop = () => {
    video.pause();
    video.classList.remove('playing');
    isPlaying = false;
    btn.classList.remove('is-playing');
  };

  const hasFineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (hasFineHover) {
    thumb.addEventListener('mouseenter', play);
    thumb.addEventListener('mouseleave', stop);
  } else {
    thumb.addEventListener('click', () => { isPlaying ? stop() : play(); });
  }
}

// เปิดหน้าต่างรายละเอียดเมนู: รูป/วิดีโอขยาย + ชื่อ + ราคา (จากหลังบ้าน) + คำอธิบายเต็ม
function openItemDetail(item) {
  const overlay = document.getElementById('itemDetailOverlay');
  const body = document.getElementById('itemDetailBody');
  if (!overlay || !body) return;

  const imgSrc = item.image || 'images/dish-laab.svg';
  let mediaHtml = `<img src="${imgSrc}" alt="${item.name} จิ๊นโค สุพรรณบุรี">`;
  if (item.video && isVideoFileUrl(item.video)) {
    mediaHtml = `<video src="${item.video}" controls autoplay playsinline poster="${imgSrc}"></video>`;
  } else if (item.video && isYouTubeUrl(item.video)) {
    mediaHtml = `<iframe src="${toYouTubeEmbed(item.video)}" allow="autoplay; encrypted-media" allowfullscreen title="วิดีโอ ${item.name}"></iframe>`;
  }

  body.innerHTML = `
    <div class="detail-media">${mediaHtml}</div>
    <div class="detail-info">
      ${item.featured ? '<span class="detail-badge">🔥 แนะนำ</span>' : ''}
      <h3>${item.name}</h3>
      <p class="detail-price">${menuLivePriceText(item)}</p>
      ${item.desc ? `<p class="detail-desc">${item.desc}</p>` : ''}
      <a class="detail-call" href="tel:0635257143">📞 โทรสั่ง 063-525-7143</a>
    </div>
  `;
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  window.__jinkoPreviousFocus = document.activeElement;
  const title = document.getElementById('liveModalTitle');
  if (title) title.textContent = `รายละเอียดเมนู ${item.name}`;
  document.getElementById('itemDetailClose')?.focus();
}

function closeItemDetail() {
  const overlay = document.getElementById('itemDetailOverlay');
  const body = document.getElementById('itemDetailBody');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  // หยุดวิดีโอ/iframe ที่อาจกำลังเล่นอยู่
  if (body) body.innerHTML = '';
  if (window.__jinkoPreviousFocus && typeof window.__jinkoPreviousFocus.focus === 'function') window.__jinkoPreviousFocus.focus();
  window.__jinkoPreviousFocus = null;
}

function renderTabs(tabsContainer, categories, activeCategory, onSelect) {
  tabsContainer.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = 'ทั้งหมด';
  allBtn.className = activeCategory === 'ทั้งหมด' ? 'active' : '';
  allBtn.setAttribute('aria-pressed', String(activeCategory === 'ทั้งหมด'));
  allBtn.addEventListener('click', () => onSelect('ทั้งหมด'));
  tabsContainer.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = activeCategory === cat ? 'active' : '';
    btn.setAttribute('aria-pressed', String(activeCategory === cat));
    btn.addEventListener('click', () => onSelect(cat));
    tabsContainer.appendChild(btn);
  });
}

async function initMenuLive() {
  const grid = document.getElementById('liveMenuGrid');
  const tabsContainer = document.getElementById('liveMenuTabs');
  const statusEl = document.getElementById('liveMenuStatus');
  if (!grid) return;

  renderSkeleton(grid);

  const { items, live } = await loadMenuLiveData();

  if (statusEl) {
    statusEl.innerHTML = live
      ? '<span class="dot"></span> ข้อมูลล่าสุดจากร้าน'
      : '<span class="dot"></span> กำลังแสดงเมนูตัวอย่าง (ร้านยังไม่ได้อัปเดตเมนู)';
  }

  const categories = [...new Set(items.map(i => i.category))];
  let activeCategory = 'ทั้งหมด';

  function draw() {
    const filtered = activeCategory === 'ทั้งหมด' ? items : items.filter(i => i.category === activeCategory);
    grid.innerHTML = '';
    if (!filtered.length) {
      grid.innerHTML = '<div class="live-empty">ยังไม่มีเมนูในหมวดนี้</div>';
      return;
    }
    filtered.forEach(item => grid.appendChild(buildCard(item)));
  }

  function selectCategory(cat) {
    activeCategory = cat;
    renderTabs(tabsContainer, categories, activeCategory, selectCategory);
    draw();
  }

  renderTabs(tabsContainer, categories, activeCategory, selectCategory);
  draw();

  const detailOverlay = document.getElementById('itemDetailOverlay');
  const detailClose = document.getElementById('itemDetailClose');
  if (detailOverlay && detailClose) {
    detailClose.addEventListener('click', closeItemDetail);
    detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) closeItemDetail(); });
  }
  document.addEventListener('keydown', (e) => {
    if (!detailOverlay || !detailOverlay.classList.contains('open')) return;
    if (e.key === 'Escape') { closeItemDetail(); return; }
    if (e.key === 'Tab') {
      const focusables = [...detailOverlay.querySelectorAll('button, a[href], iframe, video, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

document.addEventListener('DOMContentLoaded', initMenuLive);
