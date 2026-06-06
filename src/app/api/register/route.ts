import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;

    // ❌ ลบบรรทัด process.env เก่าออก
    // ✅ แทนที่ด้วย URL ตรง ๆ ของ Python FastAPI (เลือกใช้ตัวใดตัวหนึ่งตามที่คุณใช้งานจริง)
    
    // เคสที่ 1: ถ้าเปิดรัน Python ในเครื่องตัวเอง (Localhost) ให้ใช้บรรทัดนี้:
    const backendUrl = "http://127.0.0.1:8000";
    
    // เคสที่ 2: ถ้าคุณเปิด Ngrok ไว้ ให้เปลี่ยนเป็น URL ของ Ngrok (ไม่มี /api นำหน้า) เช่น:
    // const backendUrl = "https://unprecipitously-projectional-davida.ngrok-free.dev";

    const finalPayload = {
      ...body,
      password: body.password
    };

    // ยิงส่งต่อไปหาหลังบ้าน (มั่นใจได้ร้อยเปอร์เซ็นต์ว่า URL จะไม่เป็น undefined แล้ว)
    const response = await fetch(`${backendUrl}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalPayload),
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Proxy Error Details:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { detail: `ระบบ Proxy ขัดข้องเนื่องจาก: ${errorMessage}` },
      { status: 500 }
    );
  }
}