import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("authorization");

        const response = await fetch(
            `${BACKEND_URL}/user/me/health-records`,
            {
                method: "GET",
                headers: {
                    Authorization: token ?? "",
                    "Content-Type": "application/json",
                },
            }
        );

        const data: unknown = await response.json();

        return NextResponse.json(data, {
            status: response.status,
        });

    } catch (error: unknown) {
        console.error("Error in health-records bridge:", error);

        let message = "Unknown error";

        if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json(
            {
                error: "Bridge Error",
                detail: message,
            },
            { status: 500 }
        );
    }
}

