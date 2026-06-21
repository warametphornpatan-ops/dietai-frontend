"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * UrlMasker
 * - ซ่อน URL บน address bar ให้เหลือโดเมนเปล่า
 * - ยกเว้นหน้า /auth ทั้งหมด ห้ามแตะ URL (เพราะต้องใช้ token_hash ใน query ตั้งรหัสผ่าน)
 *
 * หมายเหตุ: ตัด logic พากลับหน้าเดิมตอน F5 ออก เพราะทำให้เกิดการวนซ้ำ
 * (เว็บช้า/บั๊ก/logout ไม่ออก) ผลคือกด F5 หน้าอื่นจะเด้งกลับหน้าแรก ซึ่งเป็นพฤติกรรมที่นิ่งและคาดเดาได้
 *
 * วิธีใช้: import มาวางใน layout.tsx เหมือนเดิม เช่น <UrlMasker />
 */
export default function UrlMasker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) หน้า /auth: ห้ามแตะ URL เด็ดขาด (token_hash ต้องอยู่ครบ และ F5 ต้องอยู่หน้าเดิม)
    if (pathname.startsWith('/auth')) {
      return;
    }

    // 2) หน้าแรก ไม่ต้องทำอะไร
    if (pathname === '/') {
      return;
    }

    // 3) หน้าอื่น ๆ: ซ่อน URL เป็นโดเมนเปล่า
    window.history.replaceState(null, '', '/');
  }, [pathname]);

  return null;
}