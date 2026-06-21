"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("คำเตือน: กรุณาตรวจสอบการตั้งค่า Supabase Environment Variables ในไฟล์ .env");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface SyncResponse {
  detail?: string;
  status?: string;
  message?: string;
}

function SetPasswordContent() {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'อ่อน', 'พอใช้', 'ดี', 'แข็งแกร่ง'][strength];
  const strengthColor = ['', '#f87171', '#fb923c', '#a3e635', '#34d399'][strength];

  const handleConfirmPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    // ✅ ตรวจสอบรหัสผ่านตรงกัน
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' });
      setIsLoading(false);
      return;
    }

    try {
      // ✅ 1. ดึง session
      console.log('🔵 DEBUG: Getting session from Supabase...');
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session || !sessionData.session.user.email) {
        throw new Error('ลิงก์หมดอายุ หรือสิทธิ์การเข้าถึงไม่ถูกต้อง กรุณากดลิงก์จากอีเมลใหม่');
      }

      const adminEmail = sessionData.session.user.email;
      console.log('✅ DEBUG: Admin email:', adminEmail);

      // ✅ 2. อัพเดต password ใน Supabase Auth
      console.log('🔵 DEBUG: Updating password in Supabase Auth...');
      const { error: supabaseError } = await supabase.auth.updateUser({ password });
      
      if (supabaseError) {
        console.error('❌ DEBUG: Supabase error:', supabaseError);
        throw new Error(`Supabase Auth: ${supabaseError.message}`);
      }
      console.log('✅ DEBUG: Supabase password updated!');

      // ✅ 3. Sync password กับ backend
      console.log('🔵 DEBUG: Sending request to backend:', `${BACKEND_URL}/api/admins/sync-password`);
      const backendResponse = await fetch(`${BACKEND_URL}/api/admins/sync-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, new_password: password }),
      });

      console.log('🔵 DEBUG: Backend response status:', backendResponse.status);
      const responseData = await backendResponse.json() as SyncResponse;
      console.log('🔵 DEBUG: Backend response data:', responseData);
      
      if (!backendResponse.ok) {
        throw new Error(responseData.detail || 'ไม่สามารถบันทึกรหัสผ่านเข้าสู่ฐานข้อมูลได้');
      }

      // ✅ สำเร็จ!
      console.log('✅ DEBUG: All operations successful!');
      setStatus({ type: 'success', message: 'ตั้งรหัสผ่านสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('❌ DEBUG: Error caught:', err);
      const errorMsg = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ในขณะนี้';
      setStatus({ type: 'error', message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sp-root {
          min-height: 100vh;
          background: #f7faf8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Noto Sans Thai', 'DM Sans', sans-serif;
          padding: 24px;
        }

        .sp-card {
          width: 100%;
          max-width: 420px;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2ede8;
          box-shadow: 0 4px 32px rgba(52, 211, 153, 0.06), 0 1px 4px rgba(0,0,0,0.04);
          overflow: hidden;
          opacity: 0;
          transform: translateY(16px);
          animation: fadeUp 0.5s ease forwards;
        }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .sp-top {
          background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf8 100%);
          padding: 36px 36px 28px;
          border-bottom: 1px solid #e2ede8;
          text-align: center;
        }

        .sp-icon {
          width: 52px;
          height: 52px;
          background: #d1fae5;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 24px;
        }

        .sp-title {
          font-size: 20px;
          font-weight: 600;
          color: #1a2e25;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }

        .sp-subtitle {
          font-size: 13px;
          font-weight: 300;
          color: #6b8f79;
          line-height: 1.5;
        }

        .sp-body {
          padding: 28px 36px 32px;
        }

        .sp-field {
          margin-bottom: 20px;
        }

        .sp-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #4a7060;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .sp-input-wrap {
          position: relative;
        }

        .sp-input {
          width: 100%;
          padding: 11px 44px 11px 14px;
          font-size: 14px;
          font-family: inherit;
          font-weight: 400;
          color: #1a2e25;
          background: #f7faf8;
          border: 1.5px solid #d1e8da;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance: none;
        }

        .sp-input::placeholder { color: #a8c4b4; }

        .sp-input:focus {
          border-color: #34d399;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.12);
        }

        .sp-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: #a8c4b4;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
        }

        .sp-toggle:hover { color: #34d399; }

        .sp-strength {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sp-strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .sp-bar {
          height: 3px;
          flex: 1;
          border-radius: 99px;
          background: #e2ede8;
          transition: background 0.3s;
        }

        .sp-strength-label {
          font-size: 11px;
          font-weight: 500;
          min-width: 48px;
          text-align: right;
          transition: color 0.3s;
        }

        .sp-match {
          margin-top: 8px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: #34d399;
          font-weight: 500;
          height: 16px;
        }

        .sp-divider {
          height: 1px;
          background: #e2ede8;
          margin: 8px 0 20px;
        }

        .sp-btn {
          width: 100%;
          padding: 13px;
          background: #10b981;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
          display: block;
          text-align: center;
          text-decoration: none;
        }

        .sp-btn:hover:not(:disabled) {
          background: #059669;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
        }

        .sp-btn:active:not(:disabled) { transform: scale(0.99); }

        .sp-btn:disabled {
          background: #a7d9c5;
          cursor: not-allowed;
        }

        .sp-btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .sp-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .sp-msg {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.5;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          animation: fadeUp 0.3s ease forwards;
        }

        .sp-msg.error {
          background: #fff1f2;
          color: #b91c1c;
          border: 1px solid #fecdd3;
        }

        .sp-msg.success {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }

        .sp-msg-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }

        .sp-footer-link {
          margin-top: 20px;
          font-size: 14px;
          color: #059669;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.2s forwards;
        }

        .sp-footer-link:hover {
          color: #047857;
          text-decoration: underline;
        }
      `}</style>

      <div className="sp-root">
        <div className="sp-card" style={{ animationDelay: '0ms' }}>

          {/* Top */}
          <div className="sp-top">
            <div className="sp-icon">🔐</div>
            <div className="sp-title">สร้างรหัสผ่านใหม่</div>
            <div className="sp-subtitle">กรุณาตั้งรหัสผ่านสำหรับบัญชีแอดมินของคุณ</div>
          </div>

          {/* Body */}
          <div className="sp-body">
            {status.type === 'success' ? (
              <div>
                <div className="sp-msg success" style={{ marginTop: 0, marginBottom: 24 }}>
                  <span className="sp-msg-icon">✅</span>
                  <span>{status.message}</span>
                </div>
                <Link href="/login" className="sp-btn">
                  <span className="sp-btn-inner">ไปยังหน้าเข้าสู่ระบบ ➔</span>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleConfirmPassword} autoComplete="off">

                {/* Password */}
                <div className="sp-field">
                  <label className="sp-label" htmlFor="password">รหัสผ่านใหม่</label>
                  <div className="sp-input-wrap">
                    <input
                      suppressHydrationWarning
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="sp-input"
                    />
                    <button
                      type="button"
                      className="sp-toggle"
                      onClick={() => setShowPassword(p => !p)}
                      tabIndex={-1}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="sp-strength">
                      <div className="sp-strength-bars">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="sp-bar"
                            style={{ background: i <= strength ? strengthColor : '#e2ede8' }}
                          />
                        ))}
                      </div>
                      <span className="sp-strength-label" style={{ color: strengthColor }}>
                        {strengthLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="sp-field">
                  <label className="sp-label" htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
                  <div className="sp-input-wrap">
                    <input
                      suppressHydrationWarning
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="sp-input"
                    />
                    <button
                      type="button"
                      className="sp-toggle"
                      onClick={() => setShowConfirm(p => !p)}
                      tabIndex={-1}
                      aria-label="toggle confirm visibility"
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Match indicator */}
                  {confirmPassword.length > 0 && (
                    <div className="sp-match" style={{ color: password === confirmPassword ? '#34d399' : '#f87171' }}>
                      {password === confirmPassword ? '✓ รหัสผ่านตรงกัน' : '✗ รหัสผ่านไม่ตรงกัน'}
                    </div>
                  )}
                </div>

                <div className="sp-divider" />

                <button type="submit" disabled={isLoading} className="sp-btn">
                  <span className="sp-btn-inner">
                    {isLoading && <span className="sp-spinner" />}
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}
                  </span>
                </button>
              </form>
            )}

            {status.type === 'error' && (
              <div className="sp-msg error">
                <span className="sp-msg-icon">⚠️</span>
                <span>{status.message}</span>
              </div>
            )}
          </div>
        </div>

        <Link href="/login" className="sp-footer-link">
          ← ย้อนกลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <React.Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <SetPasswordContent />
    </React.Suspense>
  );
}