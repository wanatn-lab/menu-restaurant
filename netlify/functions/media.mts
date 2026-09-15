// ===================================================================
// API เสิร์ฟไฟล์รูป/วิดีโอที่อัปโหลดไว้ จิ๊นโค สุพรรณบุรี
// GET /api/media?key=uploads/image/2026-08/xxxxx.webp -> คืนไฟล์จริงจาก Netlify Blobs (store: site-media)
//
// หมายเหตุ: ไฟล์รูป/วิดีโอที่เคยอัปโหลดไว้ยังอยู่ครบใน Blobs store "site-media"
// (เห็นได้จาก Netlify dashboard > Data & storage > Blobs > site-media > uploads/image, uploads/video)
// แต่โค้ดเว็บไซต์ก่อนหน้านี้ไม่มีฟังก์ชันนี้ (ไม่มีใครเสิร์ฟไฟล์ที่ /api/media) จึงทำให้รูป/วิดีโอ
// ในหน้าเว็บ (เช่น /menu-live) ขึ้นเป็นลิงก์เสีย/หายไปทั้งหมด ฟังก์ชันนี้คือตัวที่ขาดหายไป
// ===================================================================
import { getStore } from "@netlify/blobs";

const STORE_NAME = "site-media";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return new Response("ต้องระบุพารามิเตอร์ key", { status: 400 });
  }

  const store = getStore(STORE_NAME);
  const blob = await store.get(key, { type: "arrayBuffer" });
  if (!blob) {
    return new Response("ไม่พบไฟล์นี้", { status: 404 });
  }

  const ext = key.split(".").pop()?.toLowerCase() || "";
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  return new Response(blob, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = {
  path: "/api/media",
};
