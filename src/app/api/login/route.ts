import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        // ยิงเข้าประตูลับที่ถูกต้องของ FastAPI (/user/login แบบไม่มี s)
        const response = await fetch(`${backendUrl}/user/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        return NextResponse.json(
            { detail: "Internal Server Error ทางฝั่ง Proxy ล็อกอิน" },
            { status: 500 }
        );
    }
}