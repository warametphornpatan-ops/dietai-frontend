import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const aiName = searchParams.get("aiName");

  let url = "";

  if (aiName) {
    url = `${BACKEND}/foods/search?name=${encodeURIComponent(aiName)}`;
  } else if (category) {
    url = `${BACKEND}/foods/by-category?category=${encodeURIComponent(category)}`;
  } else {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}