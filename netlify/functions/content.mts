// ===================================================================
// API เนื้อหาเว็บ จิ๊นโค สุพรรณบุรี
// GET  /api/content  -> คืนข้อมูลเนื้อหาปัจจุบันทั้งหมด (สาธารณะ อ่านได้ทุกคน)
// POST /api/content  -> บันทึกเนื้อหาใหม่ ส่ง JSON body แบบ { auth: { user, pass }, verify: true }
//   เพื่อ "เช็ก login" อย่างเดียว หรือ { auth: { user, pass }, content: {...} } เพื่อบันทึกข้อมูลจริง
//   (ตั้งใจส่ง user/pass มาใน body แทนการใส่ใน header เพราะ header ต้องเป็นอักขระ ISO-8859-1 เท่านั้น
//   ถ้า user/pass มีอักขระอื่นปนมา เช่น จากคีย์บอร์ดที่แปลงตัวเลขเป็นเลขไทยอัตโนมัติ จะทำให้ fetch พังได้)
// เก็บข้อมูลด้วย Netlify Blobs แทน Google Sheet
// ===================================================================
import { getStore } from "@netlify/blobs";

const STORE_NAME = "site-content";
const KEY = "content";

// Keep the business facts in one canonical place.  Content written through the
// admin UI is editorial; it must not be able to accidentally re-publish an old
// address, opening hours, or phone number in the public API.
const BUSINESS_FACTS = {
  name: "จิ๊นโค สุพรรณบุรี",
  telephone: "093-030-9164",
  address: "ถนนขุนศรีวิชัย",
  locality: "ตำบลท่าพี่เลี้ยง อำเภอเมืองสุพรรณบุรี",
  region: "สุพรรณบุรี",
  postalCode: "72000",
  countryCode: "TH",
  latitude: "14.476954",
  longitude: "100.1163608",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=14.476954%2C100.1163608",
  facebookUrl: "https://www.facebook.com/jinkosuphan/",
  openingHoursText: "อังคาร–อาทิตย์ 11:30–20:00 น. (หยุดวันจันทร์)",
  openingHours: [
    { day: "Tuesday", opens: "11:30", closes: "20:00" },
    { day: "Wednesday", opens: "11:30", closes: "20:00" },
    { day: "Thursday", opens: "11:30", closes: "20:00" },
    { day: "Friday", opens: "11:30", closes: "20:00" },
    { day: "Saturday", opens: "11:30", closes: "20:00" },
    { day: "Sunday", opens: "11:30", closes: "20:00" }
  ]
};

// เนื้อหาเริ่มต้น (ตรงกับหน้าเว็บปัจจุบัน) ใช้ตอนยังไม่มีใครบันทึกอะไรผ่านแอดมินเลย
const DEFAULT_CONTENT = {
  announceBar: "🎉 เปิดให้บริการแล้วที่ถนนขุนศรีวิชัย สุพรรณบุรี — แวะมาชิมอาหารเหนือแท้ได้เลย",
  home: {
    heroHeading: "จิ๊นโค สุพรรณบุรี — อาหารเหนือต้นตำรับ ถึงถิ่นไม่ต้องไปไกล",
    heroLead:
      "ร้านจิ๊นโคสไตล์บ้านๆ กันเอง เสิร์ฟอาหารเหนือรสชาติจัดจ้านต้นตำรับ ตั้งแต่ลาบเหนือคั่วหอมเครื่องเทศ ไส้อั่ว น้ำพริกหนุ่ม ไปจนถึงแคบหมูกรอบ ราคาเริ่มต้นหลักสิบบาท ตั้งอยู่บนถนนขุนศรีวิชัย ต.ท่าพี่เลี้ยง อ.เมืองสุพรรณบุรี",
    heroImage: "/api/media?key=uploads%2Fimage%2F2026-08%2F090b0fe3-06bf-4950-8652-296d3cab9cf6.jpg"
  },
  about: {
    heroHeading: "จากเพจรีวิวอาหาร สู่ร้านจิ๊นโคของตัวเอง",
    heroParagraph1:
      "ก่อนจะเป็นร้านจิ๊นโค สุพรรณบุรี เจ้าของร้านคือคนทำเพจรีวิวร้านอาหารระดับภูมิภาคมาก่อน ผ่านการชิม วิเคราะห์ และแนะนำร้านอาหารเหนือ ร้านลาบ และร้านอาหารท้องถิ่นมานับไม่ถ้วน จนอยากลงมือทำร้านอาหารเหนือต้นตำรับของตัวเองให้คนสุพรรณบุรีได้ลิ้มลอง โดยไม่ต้องเดินทางไกลถึงภาคเหนือ",
    heroParagraph2:
      "ชื่อร้าน “จิ๊นโค” มาจากภาษาเหนือ คำว่า “จิ๊น” แปลว่า เนื้อ ส่วน “โค” หมายถึงวัว ถ้าค้นหาด้วยคำว่า จิ้นโค หรือ จินโค ก็เจอร้านเราได้เช่นกัน",
    heroImage: "/api/media?key=uploads%2Fimage%2F2026-08%2F090b0fe3-06bf-4950-8652-296d3cab9cf6.jpg"
  },
  menuItems: [
    { category: "ของทอด & ปิ้งย่าง", name: "ไก่ทอด", price: "70", desc: "ไก่ทอดสมุนไพรกรอบนอกฉ่ำใน หมักด้วยเครื่องเทศแบบร้าน", image: "/api/media?key=uploads%2Fimage%2F2026-10%2F649a5a89dee28d51.webp", video: "", featured: true },
    { category: "ของทอด & ปิ้งย่าง", name: "ปลาทู", price: "เริ่มต้น", desc: "ปลาทูทอดสดใหม่ทุกวัน เนื้อแน่นหอมมัน", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "ปลาสลิด", price: "เริ่มต้น", desc: "ปลาสลิดทอดกรอบ เนื้อแน่น รสเค็มมันกำลังดี", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "สามชั้นทอด", price: "85", desc: "หมูสามชั้นทอดกรอบนอกนุ่มใน เสิร์ฟพร้อมน้ำจิ้มแจ่วรสจัด", image: "/api/media?key=uploads%2Fimage%2F2026-10%2Fdf97393f98383d8f.webp", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "แคบหมู", price: "30", desc: "แคบหมูทอดกรอบ เคี้ยวมัน หอมกลิ่นหมูแท้", image: "/api/media?key=uploads%2Fimage%2F2026-08%2Fda960607-6ce9-4290-a83e-9129d6302835.webp", video: "", featured: true },
    { category: "ของทอด & ปิ้งย่าง", name: "เนื้อแดดเดียวทอด", price: "เริ่มต้น", desc: "เนื้อแดดเดียวทอดสูตรเหนือแท้ เค็มนัวหอมพริกไทย", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "เนื้อย่าง", price: "เริ่มต้น", desc: "เนื้อย่างหอมควัน หมักเครื่องเทศสูตรร้าน เสิร์ฟพร้อมน้ำจิ้มแจ่ว", image: "", video: "", featured: false },
    { category: "น้ำพริก & เครื่องเคียง", name: "ไข่ต้มยางมะตูม", price: "เริ่มต้น", desc: "ไข่ต้มยางมะตูม เครื่องเคียงคู่น้ำพริกขาดไม่ได้", image: "", video: "", featured: false },
    { category: "น้ำพริก & เครื่องเคียง", name: "พริกหนุ่มปิ้งตำ", price: "30", desc: "พริกหนุ่มปิ้งตำสด รสกลมกล่อม เสิร์ฟพร้อมแคปหมูและผักสดตามฤดูกาล", image: "/api/media?key=uploads%2Fimage%2F2026-10%2F9305f01acfc29dea.webp", video: "", featured: true },
    { category: "น้ำพริก & เครื่องเคียง", name: "พริกแดงเหนือ", price: "เริ่มต้น", desc: "น้ำพริกแดงสูตรเหนือ รสเข้มข้น เผ็ดหอมเครื่องแกง", image: "", video: "", featured: false },
    { category: "น้ำพริก & เครื่องเคียง", name: "ป่นน้ำปู๋ (สูตรเค้ง)", price: "เริ่มต้น", desc: "ป่นน้ำปู๋สูตรเค้ง เอกลักษณ์เฉพาะร้าน รสเข้มข้นแบบล้านนาแท้", image: "", video: "", featured: true },
    { category: "พิเศษ", name: "อ่องปูแสม", price: "เริ่มต้น", desc: "อ่องปูแสม แกงคั่วรสจัดจ้าน กลิ่นหอมเครื่องแกงเหนือ", image: "", video: "", featured: true },
    { category: "พิเศษ", name: "ข้าวหนมเส้นน้ำเงี้ยว", price: "เริ่มต้น", desc: "ข้าวหนมเส้นน้ำเงี้ยวสูตรเหนือแท้ เส้นนุ่ม น้ำซุปเข้มข้น", image: "", video: "", featured: false },
    { category: "พิเศษ", name: "ข้าวซอยเนื้อ/ไก่", price: "เริ่มต้น", desc: "ข้าวซอยเนื้อ/ไก่ น้ำแกงเข้มข้น หอมเครื่องแกงเหนือ โรยหน้าเส้นกรอบ", image: "", video: "", featured: true },
    { category: "พิเศษ", name: "ลิ้นวัวย่าง", price: "เริ่มต้น", desc: "ลิ้นวัวย่างหอมควัน เนื้อนุ่ม เสิร์ฟพร้อมน้ำจิ้มแจ่ว", image: "", video: "", featured: false }
  ]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function normalizeAnnouncement(value) {
  const text = String(value || "").trim();
  if (/ถนนขุนช้าง|ป้ารัตน์|เตรียมเปิดร้าน/.test(text)) {
    return "🎉 เปิดให้บริการแล้วที่ถนนขุนศรีวิชัย สุพรรณบุรี — แวะมาชิมอาหารเหนือแท้ได้เลย";
  }
  return text || DEFAULT_CONTENT.announceBar;
}

function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return items;
  return items.map((f) => ({
    ...f,
    question: /^จิ๊น\s+คืออะไร/.test(String(f?.question || "")) ? "จิ๊น คืออะไร" : f?.question,
    answer: String(f?.answer || "").replace(/วัวฟวึ่ง/g, "วัว ซึ่ง")
  }));
}

function replaceOldStoreFacts(value) {
  return String(value || "")
    .replaceAll("ถนนขุนช้าง", "ถนนขุนศรีวิชัย")
    .replace(/\s*(?:ใน)?ซอยติดร้านป้ารัตน์\s*(?:อาหารตามสั่ง)?/g, "")
    .replace(/ทุกวัน\s*(?:08:00|12:00)\s*[–-]\s*20:00\s*น?\.?/g, BUSINESS_FACTS.openingHoursText);
}

function normalizeBusinessFacts(content) {
  const business = content.business && typeof content.business === "object" ? content.business : {};
  const contact = content.contact && typeof content.contact === "object" ? content.contact : {};
  const home = content.home && typeof content.home === "object" ? content.home : {};
  const faq = normalizeFaqItems(content.faq);

  return {
    ...content,
    home: {
      ...home,
      heroLead: replaceOldStoreFacts(home.heroLead),
      heroImage: home.heroImage && !String(home.heroImage).endsWith(".svg")
        ? home.heroImage
        : "/api/media?key=uploads%2Fimage%2F2026-08%2F090b0fe3-06bf-4950-8652-296d3cab9cf6.jpg"
    },
    about: {
      ...(content.about || {}),
      heroImage: content.about?.heroImage && !String(content.about.heroImage).endsWith(".svg")
        ? content.about.heroImage
        : "/api/media?key=uploads%2Fimage%2F2026-08%2F090b0fe3-06bf-4950-8652-296d3cab9cf6.jpg"
    },
    business: { ...business, ...BUSINESS_FACTS },
    contact: {
      ...contact,
      phone: BUSINESS_FACTS.telephone,
      mapsUrl: BUSINESS_FACTS.mapUrl,
      streetAddress: BUSINESS_FACTS.address,
      addressLocality: BUSINESS_FACTS.locality,
      addressRegion: BUSINESS_FACTS.region,
      postalCode: BUSINESS_FACTS.postalCode,
      latitude: BUSINESS_FACTS.latitude,
      longitude: BUSINESS_FACTS.longitude,
      openingHours: "Tu-Su 11:30-20:00"
    },
    faq: Array.isArray(faq)
      ? faq.map((item) => ({
        ...item,
        answer: /เปิดวันไหน/.test(String(item.question || ""))
          ? "เปิดอังคาร–อาทิตย์ เวลา 11:30–20:00 น. และหยุดทุกวันจันทร์"
          : replaceOldStoreFacts(item.answer)
      }))
      : faq
  };
}

function normalizeContent(content) {
  if (!content || typeof content !== "object") return content;
  return normalizeBusinessFacts({
    ...content,
    announceBar: replaceOldStoreFacts(normalizeAnnouncement(content.announceBar)),
  });
}

// ตรวจรูปแบบข้อมูลคร่าวๆ ก่อนบันทึก ป้องกันข้อมูลพังทั้งเว็บ
function isValidContent(body) {
  if (!body || typeof body !== "object") return false;
  if (typeof body.announceBar !== "string") return false;
  if (!body.home || typeof body.home.heroHeading !== "string") return false;
  if (!body.about || typeof body.about.heroHeading !== "string") return false;
  if (!Array.isArray(body.menuItems)) return false;
  return body.menuItems.every(
    (item) => item && typeof item === "object" && typeof item.name === "string"
  );
}

export default async (req: Request) => {
  const store = getStore(STORE_NAME);

  if (req.method === "GET") {
    let data = await store.get(KEY, { type: "json" });
    if (!data) {
      data = normalizeContent(DEFAULT_CONTENT);
      await store.setJSON(KEY, data);
    }
    return json(normalizeContent(data));
  }

  if (req.method === "POST") {
    const expectedUser = Netlify.env.get("ADMIN_USERNAME") || "";
    const expectedPass = Netlify.env.get("ADMIN_PASSWORD") || "";
    if (!expectedUser || !expectedPass) {
      return json(
        { error: "ยังไม่ได้ตั้งชื่อผู้ใช้/รหัสผ่านแอดมิน (ตัวแปร ADMIN_USERNAME / ADMIN_PASSWORD) บน Netlify ของเว็บนี้" },
        500
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "ข้อมูลที่ส่งมาไม่ใช่ JSON ที่ถูกต้อง" }, 400);
    }

    const providedUser = (body && body.auth && body.auth.user) || "";
    const providedPass = (body && body.auth && body.auth.pass) || "";
    if (providedUser !== expectedUser || providedPass !== expectedPass) {
      return json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, 401);
    }

    // แค่เช็ก login เฉยๆ ไม่บันทึกข้อมูล (เรียกตอนเปิดหน้า /admin)
    if (body && body.verify === true) {
      return json({ ok: true });
    }

    const payload = body && body.content;
    if (!isValidContent(payload)) {
      return json({ error: "รูปแบบข้อมูลไม่ถูกต้อง กรุณาลองใหม่" }, 400);
    }

    await store.setJSON(KEY, normalizeContent(payload));
    return json({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/content"
};
