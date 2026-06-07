import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const BMI_MENU_IDS: Record<string, number[]> = {
  "under":       [62, 68, 63, 82, 72, 69, 83, 2, 76, 78, 74, 54, 56, 57],
  "normal":      [59, 58, 66, 71, 80, 62, 68, 54, 56, 57, 85, 86],
  "over":        [62, 68, 69, 2, 54, 56, 85, 86],
  "severe-over": [68, 69, 2, 85, 86],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bmiStatus = searchParams.get("bmiStatus") ?? "normal";

  const menuIds = BMI_MENU_IDS[bmiStatus] ?? BMI_MENU_IDS["normal"];

  try {
    // ดึงทุก category พร้อมกัน
    const [mains, fruits, drinks] = await Promise.all([
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("อาหารคาว")}`).then(r => r.json()),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("ผลไม้")}`).then(r => r.json()),
      fetch(`${BACKEND}/foods/by-category?category=${encodeURIComponent("เครื่องดื่ม")}`).then(r => r.json()),
    ]);

    const all = [...(mains ?? []), ...(fruits ?? []), ...(drinks ?? [])];

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