import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// สร้าง instance ด้วย createClient ปกติ ซึ่งสามารถใช้บน "use client" ได้อย่างปลอดภัย
export const supabase = createClient(supabaseUrl, supabaseAnonKey)