/* ===================================================================
   เมนูไลฟ์ จิ๊นโค สุพรรณบุรี
   ดึงข้อมูลเมนู (ชื่อ/ราคา/รูป/วิดีโอ) จาก /api/content
   ซึ่งเจ้าของร้านแก้ไขเองได้ผ่านหน้า /admin (ไม่ต้องแก้โค้ด ไม่ต้องใช้ Google Sheet)
   =================================================================== */

// ข้อมูลเมนูสำรอง ใช้แสดงผลถ้าดึงจาก /api/content ไม่สำเร็จ
// (เช่น ฟังก์ชันยังไม่ได้ deploy หรือเปิดไฟล์ตรงในเครื่องโดยไม่มีเซิร์ฟเวอร์)
const MENU_LIVE_FALLBACK = [
  { category: 'ของทอด & ปิ้งย่าง', name: 'ไก่ทอด', price: 'เริ่มต้น', desc: 'ไก่ทอดสมุนไพรกรอบนอกฉ่ำใน หมักด้วยเครื่องเทศแบบร้าน', image: 'images/dish-kaithod.svg', video: '', featured: true },
  { category: 'ของทอด & ปิ้งย่าง', name: 'แคบหมู', price: 'เริ่มต้น', desc: 'แคบหมูทอดกรอบ เคี้ยวมัน หอมกลิ่นหมูแท้', image: 'images/dish-kaepmoo.svg', video: '', featured: true },
  { category: 'น้ำพริก & เครื่องเคียง', name: 'พริกหนุ่มปิ้งตำ', price: 'เริ่มต้น', desc: 'พริกหนุ่มปิ้งตำสด รสกลมกล่อม เสิร์ฟพร้อมแคบหมูและผักสดตามฤดูกาล', image: 'images/dish-namprik.svg', video: '', featured: true },
  { category: 'พิเศษ', name: 'อ่องปูแสม', price: 'เริ่มต้น', desc: 'อ่องปูแสม แกงคั่วรสจัดจ้าน กลิ่นหอมเครื่องแกงเหนือ', image: '', video: '', featured: true },
  { category: 'พิเศษ', name: 'ข้าวซอยเนื้อ/ไก่', price: 'เริ่มต้น', desc: 'ข้าวซอยเนื้อ/ไก่ น้ำแกงเข้มข้น หอมเครื่องแกงเหนือ โรยหน้าเส้นกรอบ', image: '', video: '', featured: true }
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

function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'live-card';
  const hasVideo = !!item.video;
  const imgSrc = item.image || 'images/dish-laab.svg';
  const priceText = item.price ? (/^\d+$/.test(item.price) ? `฿${item.price}` : item.price) : 'สอบถามราคา';

  card.innerHTML = `
    <div class="thumb" role="${hasVideo ? 'button' : 'img'}" tabindex="${hasVideo ? '0' : '-1'}" aria-label="${hasVideo ? 'เล่นวิดีโอ ' + item.name : item.name}">
      ${item.featured ? '<span class="ribbon-featured">แนะนำ</span>' : ''}
      <img src="${imgSrc}" alt="${item.name} จิ๊นโค สุพรรณบุรี" loading="lazy">
      ${hasVideo ? '<div class="play-btn"></div>' : ''}
    </div>
    <div class="live-body">
      <h3><span>${item.name}</span><span class="price">${priceText}</span></h3>
      ${item.desc ? `<p>${item.desc}</p>` : ''}
    </div>
  `;

  if (hasVideo) {
    const openVideo = () => openMenuLiveModal(item);
    card.querySelector('.thumb').addEventListener('click', openVideo);
    card.querySelector('.thumb').addEventListener('keypress', e => { if (e.key === 'Enter') openVideo(); });
  }

  return card;
}

function openMenuLiveModal(item) {
  const overlay = document.getElementById('liveModalOverlay');
  const mediaBox = document.getElementById('liveModalMedia');
  let mediaHtml = '';
  if (isYouTubeUrl(item.video)) {
    mediaHtml = `<iframe src="${toYouTubeEmbed(item.video)}" allow="autoplay; encrypted-media" allowfullscreen title="วิดีโอ ${item.name}"></iframe>`;
  } else if (isVideoFileUrl(item.video)) {
    mediaHtml = `<video src="${item.video}" controls autoplay playsinline></video>`;
  } else {
    mediaHtml = `<img src="${item.video}" alt="วิดีโอ/ภาพเคลื่อนไหว ${item.name}">`;
  }
  mediaBox.innerHTML = mediaHtml;
  overlay.classList.add('open');
}

function closeMenuLiveModal() {
  const overlay = document.getElementById('liveModalOverlay');
  const mediaBox = document.getElementById('liveModalMedia');
  overlay.classList.remove('open');
  mediaBox.innerHTML = ''; // หยุดวิดีโอ
}

function renderTabs(tabsContainer, categories, activeCategory, onSelect) {
  tabsContainer.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = 'ทั้งหมด';
  allBtn.className = activeCategory === 'ทั้งหมด' ? 'active' : '';
  allBtn.addEventListener('click', () => onSelect('ทั้งหมด'));
  tabsContainer.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = activeCategory === cat ? 'active' : '';
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
      ? '<span class="dot"></span> ข้อมูลล่าสุดจากหน้าแอดมินของร้าน'
      : '<span class="dot"></span> กำลังแสดงเมนูตัวอย่าง (ยังไม่ได้บันทึกเมนูผ่านหน้าแอดมิน)';
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

  const overlay = document.getElementById('liveModalOverlay');
  document.getElementById('liveModalClose').addEventListener('click', closeMenuLiveModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenuLiveModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenuLiveModal(); });
}

document.addEventListener('DOMContentLoaded', initMenuLive);
