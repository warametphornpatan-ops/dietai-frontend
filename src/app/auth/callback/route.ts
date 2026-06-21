import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(request: NextRequest) {
  console.log('🔵 DEBUG: Callback route triggered');
  
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const hash = requestUrl.hash;

  console.log('🔵 DEBUG: Code from URL:', code);
  console.log('🔵 DEBUG: Hash from URL:', hash);

  if (code) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
      console.log('🔵 DEBUG: Exchanging code for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('❌ DEBUG: Exchange error:', error);
        return NextResponse.redirect(new URL('/auth/set-password?error=exchange_failed', requestUrl.origin));
      }
      
      console.log('✅ DEBUG: Session exchanged successfully!', data);
    } catch (err) {
      console.error('❌ DEBUG: Callback error:', err);
      return NextResponse.redirect(new URL('/auth/set-password?error=callback_failed', requestUrl.origin));
    }
  }

  if (hash) {
    console.log('🔵 DEBUG: Hash detected, redirecting to set-password with hash');
    return NextResponse.redirect(new URL(`/auth/set-password${hash}`, requestUrl.origin));
  }

  console.log('🔵 DEBUG: Redirecting to set-password');
  return NextResponse.redirect(new URL('/auth/set-password', requestUrl.origin));
}