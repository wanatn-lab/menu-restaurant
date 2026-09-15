/* ===================================================================
   ตัวโหลดเนื้อหาเว็บ จิ๊นโค สุพรรณบุรี
   ดึงข้อความ/รูป/วิดีโอ จาก /api/content (บันทึกผ่านหน้า /admin)
   ถ้าดึงไม่ได้ (เช่น เปิดไฟล์ตรงในเครื่อง หรือฟังก์ชันยังไม่ deploy) จะใช้ค่าสำรองนี้แทน
   =================================================================== */

const SITE_CONTENT_FALLBACK = {
  announceBar: "🎉 เตรียมเปิดร้าน ตุลาคม 2569 ที่ถนนขุนช้าง สุพรรณบุรี — กดติดตามไว้ก่อนใครที่นี่",
  home: {
    heroHeading: "จิ๊นโค สุพรรณบุรี — อาหารเหนือต้นตำรับ ถึงถิ่นไม่ต้องไปไกล",
    heroLead:
      "ร้าน จิ๊นโค สไตล์บ้านๆ กันเอง เสิร์ฟอาหารเหนือรสชาติจัดจ้านต้นตำรับ ตั้งแต่ไส้อั่วโฮมเมดคั่วหอมเครื่องเทศ พริกหนุ่มปิ้งตำ ป่นน้ำปู๋สูตรเค้ง ไปจนถึงแคบหมูกรอบ ราคาเริ่มต้นหลักสิบบาท ตั้งอยู่บนถนนขุนช้าง ต.ท่าพี่เลี้ยง อ.เมืองสุพรรณบุรี ในซอยติดร้านป้ารัตน์ อาหารตามสั่ง",
    heroImage: "images/hero-spread.svg"
  },
  about: {
    heroHeading: "จากเพจรีวิวอาหาร สู่ร้านจิ๊นโคของตัวเอง",
    heroParagraph1:
      "ก่อนจะเป็นร้านจิ๊นโค สุพรรณบุรี เจ้าของร้านคือคนทำเพจรีวิวร้านอาหารระดับภูมิภาคมาก่อน ผ่านการชิม วิเคราะห์ และแนะนำร้านอาหารเหนือ ร้านลาบ และร้านอาหารท้องถิ่นมานับไม่ถ้วน จนอยากลงมือทำร้านอาหารเหนือต้นตำรับของตัวเองให้คนสุพรรณบุรีได้ลิ้มลอง โดยไม่ต้องเดินทางไกลถึงภาคเหนือ",
    heroParagraph2:
      "ชื่อร้าน “จิ๊นโค” มาจากภาษาเหนือ คำว่า “จิ๊น” แปลว่า เนื้อ ส่วน “โค” หมายถึงวัว ถ้าค้นหาด้วยคำว่า จิ้นโค หรือ จินโค ก็เจอร้านเราได้เช่นกัน",
    heroImage: "images/dish-laab.svg"
  },
  menuItems: []
};

async function loadSiteContent() {
  try {
    const res = await fetch("/api/content", { cache: "no-store" });
    if (!res.ok) throw new Error("bad status " + res.status);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("bad shape");
    return data;
  } catch (err) {
    console.warn("โหลดเนื้อหาจาก /api/content ไม่สำเร็จ ใช้ข้อมูลสำรอง:", err);
    return SITE_CONTENT_FALLBACK;
  }
}

// แทนที่ข้อความในแบนเนอร์ประกาศด้านบน (ถ้ามีอยู่ในหน้านั้น)
function applyAnnounceBar(content) {
  const el = document.querySelector("[data-cms='announce-bar']");
  if (el && content.announceBar) el.textContent = content.announceBar;
}

// แทนที่ hero ของหน้าแรก
function applyHomeHero(content) {
  const h = content.home || {};
  const heading = document.querySelector("[data-cms='home-hero-heading']");
  const lead = document.querySelector("[data-cms='home-hero-lead']");
  const img = document.querySelector("[data-cms='home-hero-image']");
  if (heading && h.heroHeading) heading.textContent = h.heroHeading;
  if (lead && h.heroLead) lead.textContent = h.heroLead;
  if (img && h.heroImage) img.setAttribute("src", h.heroImage);
}

// แทนที่ hero ของหน้าเกี่ยวกับเรา
function applyAboutHero(content) {
  const a = content.about || {};
  const heading = document.querySelector("[data-cms='about-hero-heading']");
  const p1 = document.querySelector("[data-cms='about-hero-p1']");
  const p2 = document.querySelector("[data-cms='about-hero-p2']");
  const img = document.querySelector("[data-cms='about-hero-image']");
  if (heading && a.heroHeading) heading.textContent = a.heroHeading;
  if (p1 && a.heroParagraph1) p1.textContent = a.heroParagraph1;
  if (p2 && a.heroParagraph2) p2.textContent = a.heroParagraph2;
  if (img && a.heroImage) img.setAttribute("src", a.heroImage);
}

document.addEventListener("DOMContentLoaded", async () => {
  const content = await loadSiteContent();
  applyAnnounceBar(content);
  applyHomeHero(content);
  applyAboutHero(content);
});
