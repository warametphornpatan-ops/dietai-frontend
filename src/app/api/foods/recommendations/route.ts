import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bmiStatus = searchParams.get("bmiStatus") ?? "normal";
  try {
    // ✅ ดึง MenuID จาก DB ตาม bmi_group + ดึงอาหารทุก category พร้อมกัน
    const [menuIdRows, mains, fruits, drinks] = await Promise.all([
      fetch(`${BACKEND}/foods/by-bmi-group?group=${encodeURIComponent(bmiStatus)}`).then(r => r.json()),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("อาหารคาว")}`).then(r => r.json()),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("ผลไม้")}`).then(r => r.json()),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("เครื่องดื่ม")}`).then(r => r.json()),
    ]);
    // แปลง menuIdRows เป็น array ของตัวเลข
    const menuIds: number[] = (menuIdRows ?? []).map(
      (m: { menu_id: number }) => Number(m.menu_id)
    );
    const all = [...(mains ?? []), ...(fruits ?? []), ...(drinks ?? [])];
    // กรองเฉพาะเมนูที่อยู่ใน bmi_group นั้น และเพิ่ม image_url
    const filtered = all
      .filter((f: { MenuID: number }) => menuIds.includes(Number(f.MenuID)))
      .map((f: { MenuID: number; [key: string]: unknown }) => ({
        ...f,
        image_url: `/foods/${f.MenuID}.jpg`,
      }));
    return NextResponse.json({ success: true, data: filtered });
  } catch (err) {
    console.error("recommendations error:", err);
    return NextResponse.json(
      { success: false, data: [], error: String(err), backend: BACKEND },
      { status: 500 }
    );
  }
}