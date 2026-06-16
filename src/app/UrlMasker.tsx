"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function UrlMasker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/");
    }
  }, [pathname]);

  return null;
}