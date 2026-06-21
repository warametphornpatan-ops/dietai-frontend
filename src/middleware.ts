import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. ปล่อยผ่านสำหรับไฟล์ระบบ, รูปภาพ และ API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)
  ) {
    return NextResponse.next();
  }

  // 1.5 ✅ ปล่อยผ่านทุกหน้าใต้ /auth (ต้องใช้ token_hash ใน query ตั้งรหัสผ่าน)
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // 2. หน้าอื่น ๆ ที่ไม่ใช่หน้าแรก ยังซ่อน URL เหมือนเดิม
  if (pathname !== '/') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-original-pathname', pathname);

    return NextResponse.rewrite(new URL(pathname, request.url), {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};