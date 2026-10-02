// ===================================================================
// API อัปโหลดรูป/วิดีโอ จิ๊นโค สุพรรณบุรี
// POST /api/upload -> รับไฟล์จากหน้า /admin แล้วเก็บลง Netlify Blobs (store: site-media)
//   ส่ง JSON body แบบ { auth: { user, pass }, filename: "xxx.jpg", dataBase64: "...." }
//   (ส่ง user/pass มาใน body เหมือน /api/content เพื่อให้ auth ทำงานแบบเดียวกันทั้งเว็บ)
//   คืนค่า { ok: true, url: "/api/media?key=..." } แล้วเอา url ไปใส่ในช่อง "ลิงก์รูปภาพ/วิดีโอ" ให้อัตโนมัติ
//
// หมายเหตุ: จำกัดไฟล์ไม่เกิน 4MB ต่อไฟล์ เพราะ Netlify Functions จำกัดขนาด request โดยรวมไว้ที่ ~6MB
// (ไฟล์แปลงเป็น base64 ก่อนส่งจะมีขนาดใหญ่ขึ้นประมาณ 1.37 เท่าของไฟล์จริง) ถ้าไฟล์ใหญ่กว่านี้
// ให้ย่อขนาดรูปก่อน หรือถ้าเป็นวิดีโอไฟล์ใหญ่ แนะนำอัปโหลดขึ้น YouTube แล้ววางลิงก์ในช่อง "ลิงก์วิดีโอ" แทน
// ===================================================================
import { getStore } from "@netlify/blobs";

const STORE_NAME = "site-media";

const ALLOWED_IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const ALLOWED_VIDEO_EXT = ["mp4", "webm", "mov", "ogg"];
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function extFromFilename(name: string) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

function randomId() {
  // สร้าง id แบบสุ่ม ไม่พึ่งพา crypto.randomUUID เผื่อ runtime บางตัวไม่รองรับ
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

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

  const filename = (body && body.filename) || "";
  const dataBase64 = (body && body.dataBase64) || "";
  if (!filename || !dataBase64) {
    return json({ error: "ไม่พบไฟล์ที่จะอัปโหลด" }, 400);
  }

  const ext = extFromFilename(filename);
  const isImage = ALLOWED_IMAGE_EXT.includes(ext);
  const isVideo = ALLOWED_VIDEO_EXT.includes(ext);
  if (!isImage && !isVideo) {
    return json(
      { error: `ไม่รองรับไฟล์นามสกุล .${ext || "?"} (รองรับรูป: jpg, png, webp, gif และวิดีโอ: mp4, webm, mov, ogg)` },
      400
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataBase64, "base64");
  } catch {
    return json({ error: "ข้อมูลไฟล์เสียหาย อัปโหลดไม่สำเร็จ" }, 400);
  }

  if (!buffer.byteLength) {
    return json({ error: "ไฟล์ว่างเปล่า อัปโหลดไม่สำเร็จ" }, 400);
  }

  if (buffer.byteLength > MAX_BYTES) {
    return json(
      {
        error: `ไฟล์ใหญ่เกินไป (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB) อัปโหลดได้ไม่เกิน 4MB ต่อไฟล์ ลองย่อขนาดรูปก่อน หรือถ้าเป็นวิดีโอให้อัปโหลดขึ้น YouTube แล้ววางลิงก์แทน`,
      },
      400
    );
  }

  const now = new Date();
  const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const key = `uploads/${isImage ? "image" : "video"}/${yyyyMm}/${randomId()}.${ext}`;

  const store = getStore(STORE_NAME);
  await store.set(key, buffer);

  const url = `/api/media?key=${encodeURIComponent(key)}`;
  return json({ ok: true, url, key });
};

export const config = {
  path: "/api/upload",
};
