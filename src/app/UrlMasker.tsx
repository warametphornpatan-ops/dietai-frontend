"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * UrlMasker
 * - ซ่อน URL บน address bar ให้เหลือโดเมนเปล่า (เหมือนเดิม)
 * - ยกเว้นหน้า /auth ทั้งหมด ห้ามแตะ URL (เพราะต้องใช้ token_hash ใน query)
 * - จำ path จริงไว้ เพื่อให้ refresh (F5) กลับไปหน้าเดิม ไม่เด้งหน้าแรก
 *
 * วิธีใช้: import มาวางใน layout.tsx เหมือนเดิม เช่น <UrlMasker />
 */
export default function UrlMasker() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) หน้า /auth: ห้ามแตะ URL เด็ดขาด (token_hash ต้องอยู่ครบ และ F5 ต้องอยู่หน้าเดิม)
    if (pathname.startsWith('/auth')) {
      return;
    }

    // 2) ถ้า address bar เป็น "/" (เช่นหลังกด F5) แต่เคยอยู่หน้าอื่น → พากลับไปหน้านั้น
    if (pathname === '/') {
      let saved: string | null = null;
      try {
        saved = sessionStorage.getItem('realPath');
      } catch {
        saved = null;
      }
      if (saved && saved !== '/' && !saved.startsWith('/auth')) {
        router.replace(saved);
      }
      return;
    }

    // 3) หน้าอื่น ๆ: จำ path จริงไว้ แล้วซ่อน URL เป็นโดเมนเปล่า
    try {
      sessionStorage.setItem('realPath', pathname);
    } catch {
      // ignore (เช่น โหมดไม่บันทึก storage)
    }
    window.history.replaceState(null, '', '/');
  }, [pathname, router]);

  return null;
}