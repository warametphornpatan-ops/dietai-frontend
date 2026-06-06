import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn("คำเตือน: กรุณาตรวจสอบการตั้งค่า Supabase Environment Variables ในไฟล์ .env");
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);