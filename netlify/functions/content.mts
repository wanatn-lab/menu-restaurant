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

// เนื้อหาเริ่มต้น (ตรงกับหน้าเว็บปัจจุบัน) ใช้ตอนยังไม่มีใครบันทึกอะไรผ่านแอดมินเลย
const DEFAULT_CONTENT = {
  announceBar: "🎉 เตรียมเปิดร้าน ตุลาคม 2569 ที่ถนนขุนช้าง สุพรรณบุรี — กดติดตามไว้ก่อนใครที่นี่",
  home: {
    heroHeading: "จิ๊นโค สุพรรณบุรี — อาหารเหนือต้นตำรับ ถึงถิ่นไม่ต้องไปไกล",
    heroLead:
      "ร้าน จิ๊นโค สไตล์บ้านๆ กันเอง เสิร์ฟอาหารเหนือรสชาติจัดจ้านต้นตำรับ ตั้งแต่ลาบเหนือคั่วหอมเครื่องเทศ ไส้อั่ว น้ำพริกหนุ่ม ไปจนถึงแคปหมูกรอบ ราคาเริ่มต้นหลักสิบบาท ตั้งอยู่บนถนนขุนช้าง ต.ท่าพี่เลี้ยง อ.เมืองสุพรรณบุรี ในซอยติดร้านป้ารัตน์ อาหารตามสั่ง",
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
  menuItems: [
    { category: "ของทอด & ปิ้งย่าง", name: "ไก่ทอด", price: "เริ่มต้น", desc: "ไก่ทอดสมุนไพรกรอบนอกฉ่ำใน หมักด้วยเครื่องเทศแบบร้าน", image: "images/dish-kaithod.svg", video: "", featured: true },
    { category: "ของทอด & ปิ้งย่าง", name: "ปลาทู", price: "เริ่มต้น", desc: "ปลาทูทอดสดใหม่ทุกวัน เนื้อแน่นหอมมัน", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "ปลาสลิด", price: "เริ่มต้น", desc: "ปลาสลิดทอดกรอบ เนื้อแน่น รสเค็มมันกำลังดี", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "สามชั้นทอด", price: "เริ่มต้น", desc: "หมูสามชั้นทอดกรอบนอกนุ่มใน เสิร์ฟพร้อมน้ำจิ้มแจ่วรสจัด", image: "images/dish-samchan.svg", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "แคบหมู", price: "เริ่มต้น", desc: "แคบหมูทอดกรอบ เคี้ยวมัน หอมกลิ่นหมูแท้", image: "images/dish-kaepmoo.svg", video: "", featured: true },
    { category: "ของทอด & ปิ้งย่าง", name: "เนื้อแดดเดียวทอด", price: "เริ่มต้น", desc: "เนื้อแดดเดียวทอดสูตรเหนือแท้ เค็มนัวหอมพริกไทย", image: "", video: "", featured: false },
    { category: "ของทอด & ปิ้งย่าง", name: "เนื้อย่าง", price: "เริ่มต้น", desc: "เนื้อย่างหอมควัน หมักเครื่องเทศสูตรร้าน เสิร์ฟพร้อมน้ำจิ้มแจ่ว", image: "", video: "", featured: false },
    { category: "น้ำพริก & เครื่องเคียง", name: "ไข่ต้มยางมะตูม", price: "เริ่มต้น", desc: "ไข่ต้มยางมะตูม เครื่องเคียงคู่น้ำพริกขาดไม่ได้", image: "", video: "", featured: false },
    { category: "น้ำพริก & เครื่องเคียง", name: "พริกหนุ่มปิ้งตำ", price: "เริ่มต้น", desc: "พริกหนุ่มปิ้งตำสด รสกลมกล่อม เสิร์ฟพร้อมแคปหมูและผักสดตามฤดูกาล", image: "images/dish-namprik.svg", video: "", featured: true },
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
      data = DEFAULT_CONTENT;
      await store.setJSON(KEY, data);
    }
    return json(data);
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

    await store.setJSON(KEY, payload);
    return json({ ok: true });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = {
  path: "/api/content"
};
