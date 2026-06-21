import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error || !data.session) {
        return NextResponse.redirect(
          new URL('/auth/set-password?error=exchange_failed', requestUrl.origin)
        );
      }

      // ✅ Redirect ไป set-password พร้อม session
      // Session จะ persist ใน Supabase client automatically
      const response = NextResponse.redirect(
        new URL('/auth/set-password?exchanged=true', requestUrl.origin)
      );
      
      return response;
    } catch (err) {
      return NextResponse.redirect(
        new URL('/auth/set-password?error=callback_failed', requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin));
}