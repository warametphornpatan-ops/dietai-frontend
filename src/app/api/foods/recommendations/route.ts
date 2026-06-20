import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const BMI_MENU_IDS: Record<string, number[]> = {
  "under":       [62, 68, 63, 82 ,72, 69, 83, 2, 76, 78, 74, 54, 56, 57, 107, 108, 109, 111, 112],
  "normal":      [59, 58, 66, 71, 80, 62, 68, 54, 56, 57, 85, 86, 99, 100, 105, 106, 108, 109, 110, 111, 112],
  "over":        [63, 68, 2, 54, 56, 57, 58,59,85, 86, 98, 111, 112],
  "severe-over": [63,54,56,57,58,59,2, 85, 86, 98, 111, 112],
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