import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface HealthRecord {
    id: number;
    systolic: number | null;
    diastolic: number | null;
    pulse: number | null;
    recommendation: string;
    created_at?: string;
    createdAt?: string;
}

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("authorization");

        const response = await fetch(
            `${BACKEND_URL}/api/user/me/health-records`,
            {
                method: "GET",
                headers: {
                    Authorization: token ?? "",
                    "Content-Type": "application/json",
                },
            }
        );

        const data: unknown = await response.json();

        // ✅ Transform created_at → createdAt
        if (Array.isArray(data)) {
            const transformed: HealthRecord[] = data.map((item) => {
                const record = item as HealthRecord;
                return {
                    ...record,
                    createdAt: record.created_at || record.createdAt,
                };
            });
            return NextResponse.json(transformed, {
                status: response.status,
            });
        }

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
            { error: "Bridge Error", detail: message },
            { status: 500 }
        );
    }
}