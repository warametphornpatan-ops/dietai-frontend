"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
type LoginType = "user" | "staff";
type LoginResponse = {
  access_token?: string;
  token?: string;
  role?: string;
  detail?: string;
  error?: string;
};

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch { return null; }
}

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("user");
  const [form, setForm] = useState({ org_code: "", username: "", password: "" });
  const [orgVerified, setOrgVerified] = useState(false);
  const [orgName, setOrgName] = useState<string>("");
  const [checkingOrg, setCheckingOrg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleCheckOrg() {
    const code = form.org_code.trim();
    if (!code) { alert("กรุณากรอกรหัสหน่วยงาน 9 หลักก่อนกดตรวจสอบ"); return; }
    setCheckingOrg(true);
    setOrgName("");
    setOrgVerified(true);
    try {
      const res = await fetch(`${API_URL}/organizations/${code}`);
      if (!res.ok) { alert("ไม่พบรหัสหน่วยงานนี้ในระบบ โปรดตรวจสอบอีกครั้ง"); }
      else { const data = await res.json() as { name: string }; setOrgName(data.name); }
    } catch { alert("เกิดข้อผิดพลาดในการตรวจสอบรหัสหน่วยงาน"); }
    finally { setCheckingOrg(false); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const username = form.username.trim();
    const password = form.password;
    const orgCode = form.org_code.trim();

    if (!username || !password) { alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน"); return; }
    if (password.length < 6) { alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    if (loginType === "staff" && !orgCode) { alert("กรุณากรอกรหัสหน่วยงาน"); return; }

    setLoading(true);
    try {
      let res: Response = new Response();
      let data: LoginResponse = {};
      let detectedRole = "user";

      if (loginType === "user") {
        // ✅ ผู้ใช้งานทั่วไป → login เป็น user เท่านั้น
        res = await fetch(`${API_URL}/user/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if ((res.headers.get("content-type") || "").includes("application/json")) {
          data = await res.json() as LoginResponse;
        }
        detectedRole = "user";

      } else {
        // ✅ เจ้าหน้าที่ → ส่งไป /doctors/login เสมอ
        res = await fetch(`${API_URL}/doctors/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, org_code: orgCode }),
        });

        if ((res.headers.get("content-type") || "").includes("application/json")) {
          data = await res.json() as LoginResponse;
        }

        detectedRole = "doctor"; // ✅ เจ้าหน้าที่ = doctor
      }

      if (!res.ok || data.error) {
        alert(String(data.detail || data.error || "เข้าสู่ระบบไม่สำเร็จ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"));
        return;
      }

      const token = data.access_token || data.token;
      if (!token) { alert("ไม่พบ token จากเซิร์ฟเวอร์"); return; }

      const decoded = parseJwt(token);
      const roleFromToken = typeof decoded?.role === "string" ? decoded.role
        : typeof decoded?.user_role === "string" ? decoded.user_role
          : typeof decoded?.type === "string" ? decoded.type : null;

      const userRole = roleFromToken || detectedRole;

      if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
        localStorage.setItem("access_token", token);
        localStorage.setItem("user_role", userRole);
        const enc = encodeURIComponent(token);
        const sec = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `token=${enc}; Path=/; Max-Age=86400${sec}`;
        document.cookie = `access_token=${enc}; Path=/; Max-Age=86400${sec}`;
        document.cookie = `user_role=${encodeURIComponent(userRole)}; Path=/; Max-Age=86400${sec}`;
      }

      if (userRole === "doctor") router.replace("/doctor/dashboard");
      else if (userRole === "admin") router.replace("/admin/dashboard");
      else router.replace("/user/dashboard");

    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0faf5 0%, #e8f5f0 50%, #fafffe 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 400, height: 400, top: '-120px', right: '-80px', background: 'radial-gradient(circle, rgba(22,163,96,0.08) 0%, transparent 70%)' }} />
        <div className="absolute rounded-full" style={{ width: 300, height: 300, bottom: '-60px', left: '-60px', background: 'radial-gradient(circle, rgba(22,163,96,0.06) 0%, transparent 70%)' }} />
      </div>

      <div className="absolute top-5 left-5 z-10">
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-200" style={{ color: '#6b9e84' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          กลับหน้าแรก
        </Link>
      </div>

      <div className="mb-6 text-center relative z-10">
        <h1 className="text-2xl font-bold" style={{ color: '#0d4f2e' }}>ระบบวิเคราะห์คาร์บ</h1>
        <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: '#6b9e84' }}>Carb Analysis System</p>
      </div>

      <div
        className="w-full max-w-sm relative z-10 rounded-3xl p-6"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(22,163,97,0.12)',
          boxShadow: '0 20px 60px rgba(13,79,46,0.10), 0 4px 16px rgba(13,79,46,0.06)',
        }}
      >
        <h2 className="text-lg font-semibold text-center mb-5" style={{ color: '#0d4f2e' }}>เข้าสู่ระบบ</h2>

        {/* ✅ Toggle สำหรับเลือก User หรือ Staff */}
        <div className="flex rounded-xl p-1 mb-5" style={{ background: '#f0faf5' }}>
          {(['user', 'staff'] as LoginType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setLoginType(t); setOrgName(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={loginType === t
                ? { background: '#16a360', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,96,0.3)' }
                : { color: '#6b9e84' }}
            >
              {t === 'user' ? '👤 ผู้ใช้งาน' : '🏥 เจ้าหน้าที่'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">

          {loginType === "staff" && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#2d7055' }}>รหัสหน่วยงาน</label>
              <div className="flex gap-2">
                <input
                  suppressHydrationWarning
                  type="text"
                  placeholder="เลขหน่วยงาน 9 หลัก"
                  autoComplete="off"
                  value={form.org_code}
                  onChange={(e) => { setForm(p => ({ ...p, org_code: e.target.value })); setOrgName(""); setOrgVerified(false); }}
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: '#f4fbf7', border: '1.5px solid #c8e8d8', color: '#0d4f2e' }}
                  onFocus={e => e.currentTarget.style.borderColor = '#16a360'}
                  onBlur={e => e.currentTarget.style.borderColor = '#c8e8d8'}
                />
                <button
                  type="button"
                  onClick={handleCheckOrg}
                  disabled={checkingOrg || !form.org_code}
                  className="px-3.5 rounded-xl text-sm font-medium transition-all duration-200 shrink-0 disabled:opacity-50"
                  style={
                    orgName
                      ? { background: '#dcfce7', color: '#16a360', border: '1.5px solid #86efac' } 
                      : { background: '#fee2e2', color: '#ef4444', border: '1.5px solid #fca5a5' }  
                  }
                >
                  {checkingOrg ? '...' : orgName ? 'ตรวจสอบแล้ว' : 'ตรวจสอบ'}
                </button>
              </div>
              {orgName && (
                <p className="text-xs font-medium mt-1.5 flex items-center gap-1" style={{ color: '#16a360' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {orgName}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2d7055' }}>ชื่อผู้ใช้</label>
            <input
              suppressHydrationWarning
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
              style={{ background: '#f4fbf7', border: '1.5px solid #c8e8d8', color: '#0d4f2e' }}
              onFocus={e => e.currentTarget.style.borderColor = '#16a360'}
              onBlur={e => e.currentTarget.style.borderColor = '#c8e8d8'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2d7055' }}>รหัสผ่าน</label>
            <div className="relative">
              <input
                suppressHydrationWarning
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 pr-10"
                style={{ background: '#f4fbf7', border: '1.5px solid #c8e8d8', color: '#0d4f2e' }}
                onFocus={e => e.currentTarget.style.borderColor = '#16a360'}
                onBlur={e => e.currentTarget.style.borderColor = '#c8e8d8'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                style={{ color: '#6b9e84' }}
              >
                {showPassword
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                }
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-1 transition-all duration-200 disabled:opacity-60 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #16a360, #0d8a4f)', boxShadow: '0 6px 20px rgba(22,163,96,0.35)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                กำลังเข้าสู่ระบบ...
              </span>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-5 pt-4 flex flex-col gap-1.5 text-center" style={{ borderTop: '1px solid #e8f5f0' }}>
          <p className="text-xs" style={{ color: '#6b9e84' }}>
            สำหรับผู้ใช้งานทั่วไป?{' '}
            <Link href="/register" className="font-medium hover:underline" style={{ color: '#16a360' }}>สมัครสมาชิก</Link>
          </p>
          <p className="text-xs" style={{ color: '#6b9e84' }}>
            สำหรับเจ้าหน้าที่?{' '}
            <Link href="/admin/register" className="font-medium hover:underline" style={{ color: '#16a360' }}>ลงทะเบียนบุคลากรทางการแพทย์</Link>
          </p>
          <p className="text-xs" style={{ color: '#6b9e84' }}>
            ลืมรหัสผ่าน?{' '}
            <Link href="/reset-password" className="font-medium hover:underline" style={{ color: '#16a360' }}>รีเซ็ตรหัสผ่าน</Link>
          </p>
        </div>
      </div>

      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#6b9e84" }}>
        <p className="text-xs font-medium" style={{ color: '#4a7c62' }}>
          Copyright © 2026 Information Technology for Industry
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#8aab9a' }}>
          King Mongkut&apos;s University of Technology North Bangkok
        </p>
      </div>
    </div>
  );
}