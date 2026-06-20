import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const BMI_MENU_IDS: Record<string, number[]> = {
  "under":       [54, 56, 57, 58, 59, 62, 66, 68, 69, 71, 75, 81, 82, 83, 98,105, 106, 107, 108, 109, 110, 111, 112],
  "normal":      [54, 56, 57, 59, 61, 68, 72, 77, 78, 81, 98, 99, 100, 105, 106, 107, 108, 109, 110, 111, 112],
  "over":        [54, 56, 57, 58, 65, 98, 111, 112],
  "severe-over": [ 54, 56, 57, 58, 59, 65, 98, 111, 112],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bmiStatus = searchParams.get("bmiStatus") ?? "normal";

  const menuIds = BMI_MENU_IDS[bmiStatus] ?? BMI_MENU_IDS["normal"];

  try {
    // 1️⃣ ดึงทุก category พร้อมกัน และดักจับ r.ok ป้องกันพังเวลา Backend ตอบกลับมาเป็น HTML Error Page
    const [mainsRaw, fruitsRaw, drinksRaw] = await Promise.all([
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("อาหารคาว")}`)
        .then(r => r.ok ? r.json() : []),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("ผลไม้")}`)
        .then(r => r.ok ? r.json() : []),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("เครื่องดื่ม")}`)
        .then(r => r.ok ? r.json() : []),
    ]);

    // 2️⃣ เช็คให้ชัวร์ว่าเป็น Array เท่านั้น เผื่อ Backend ห่อข้อมูลมาใน { data: [...] }
    const mains = Array.isArray(mainsRaw) ? mainsRaw : (mainsRaw?.data || []);
    const fruits = Array.isArray(fruitsRaw) ? fruitsRaw : (fruitsRaw?.data || []);
    const drinks = Array.isArray(drinksRaw) ? drinksRaw : (drinksRaw?.data || []);

    // 3️⃣ ปลอดภัย 100% ไม่เกิด Error: is not iterable แน่นอน
    const all = [...mains, ...fruits, ...drinks];

    // กรองเฉพาะ MenuID ที่อยู่ใน list ของ bmiStatus นั้น
    const filtered = all.filter((f: { MenuID: number }) => menuIds.includes(f.MenuID));

    return NextResponse.json({ success: true, data: filtered });
  } catch (err) {
    console.error("recommendations error:", err);
    return NextResponse.json({ 
        success: false, 
        data: [],
        error: String(err),
        backend: BACKEND 
    }, 
    { status: 500 });
  }
}