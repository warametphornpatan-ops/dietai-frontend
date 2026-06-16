import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // 1. ปล่อยผ่านสำหรับไฟล์ระบบ, รูปภาพ และ API (พวกนี้ห้ามไปซ่อน URL ของมัน)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') || 
    pathname.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)
  ) {
    return NextResponse.next();
  }

  // 2. ถ้าผู้ใช้กดไปหน้าอื่นที่ไม่ใช่หน้าแรก (/)
  // ระบบจะดึงเนื้อหาของหน้านั้นมาแสดง แต่จะบังคับล็อกแถบ URL ด้านบนให้โชว์แค่ชื่อโดเมนหลักเท่านั้น
  if (pathname !== '/') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-original-pathname', pathname);

    // ทำการ Rewrite เปลี่ยนการแสดงผล URL บนบราวเซอร์ให้เหลือแค่ /
    return NextResponse.rewrite(new URL(pathname, request.url), {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

// ตัวกำหนดขอบเขต: มั่นใจได้เลยว่าโค้ดนี้จะดักจับและคุม "ทุกหน้า ทุกไฟล์" ในเว็บแน่นอน
export const config = {
  matcher: '/:path*',
};