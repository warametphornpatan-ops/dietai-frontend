"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// ✅ Types
type LoginType = "user" | "staff";
type RequestType = "forgot_username" | "forgot_password" | "other";

interface LoginResponse {
  access_token?: string;
  token?: string;
  role?: string;
  detail?: string;
  error?: string;
}

interface JwtPayload {
  role?: string;
  user_role?: string;
  type?: string;
  [key: string]: unknown;
}

// ✅ Constants - Centralize colors
const COLOR = {
  primary: "#16a360",
  primaryDark: "#0d8a4f",
  secondary: "#6b9e84",
  dark: "#0d4f2e",
  darkLabel: "#2d7055",
  lightBg: "#f4fbf7",
  lightBorder: "#c8e8d8",
  successBg: "#dcfce7",
  successBorder: "#86efac",
  errorBg: "#fee2e2",
  errorBorder: "#fca5a5",
} as const;

// ✅ Utility: Parse JWT safely
function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

// ✅ Utility: Format error message
function formatErrorMessage(detail?: string): string {
  if (!detail) return "เข้าสู่ระบบไม่สำเร็จ";

  const detailStr = String(detail);
  if (detailStr.includes("❌")) return detailStr;

  const lower = detailStr.toLowerCase();
  if (lower.includes("username") || lower.includes("not found") || lower.includes("ไม่พบชื่อ")) {
    return "❌ ไม่พบชื่อผู้ใช้นี้ในระบบ";
  }
  if (lower.includes("password") || lower.includes("incorrect") || lower.includes("รหัสผ่าน")) {
    return "❌ รหัสผ่านไม่ถูกต้อง";
  }
  if (lower.includes("org") || lower.includes("organization") || lower.includes("หน่วยงาน")) {
    return "❌ รหัสหน่วยงานไม่ถูกต้อง";
  }

  return `❌ ${detailStr}`;
}

// ✅ Utility: Save auth data safely
function saveAuthData(token: string, role: string): void {
  if (typeof window === "undefined") return;

  localStorage.setItem("token", token);
  localStorage.setItem("access_token", token);
  localStorage.setItem("user_role", role);

  const enc = encodeURIComponent(token);
  const secure = window.location.protocol === "https:" ? "; Secure; SameSite=Strict" : "; SameSite=Lax";

  document.cookie = `token=${enc}; Path=/; Max-Age=86400${secure}`;
  document.cookie = `access_token=${enc}; Path=/; Max-Age=86400${secure}`;
  document.cookie = `user_role=${encodeURIComponent(role)}; Path=/; Max-Age=86400${secure}`;
}

// ✅ Utility: Get redirect path
function getRedirectPath(role: string): string {
  const roleMap: Record<string, string> = {
    doctor: "/doctor/dashboard",
    admin: "/admin/dashboard",
    user: "/user/dashboard",
  };
  return roleMap[role] || "/user/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>("user");
  const [form, setForm] = useState({ org_code: "", username: "", password: "" });
  const [orgName, setOrgName] = useState<string>("");
  const [checkingOrg, setCheckingOrg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Support Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({
    contact_info: "",
    name: "",
    request_type: "forgot_username" as RequestType,
    description: "",
  });
  const [sendingSupport, setSendingSupport] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Check organization
  async function handleCheckOrg() {
    const code = form.org_code.trim();
    if (!code) {
      alert("กรุณากรอกรหัสหน่วยงาน 9 หลักก่อนกดตรวจสอบ");
      return;
    }

    setCheckingOrg(true);
    try {
      const res = await fetch(`${API_URL}/api/organizations/${code}`);
      if (!res.ok) {
        alert("ไม่พบรหัสหน่วยงานนี้ในระบบ โปรดตรวจสอบอีกครั้ง");
        setOrgName("");
      } else {
        const data = (await res.json()) as { name: string };
        setOrgName(data.name);
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการตรวจสอบรหัสหน่วยงาน");
      setOrgName("");
    } finally {
      setCheckingOrg(false);
    }
  }

  // ✅ Submit support request
  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supportForm.contact_info.trim() || !supportForm.name.trim() || !supportForm.description.trim()) {
      alert("กรุณากรอกข้อมูลติดต่อกลับ ชื่อ-นามสกุล และรายละเอียดปัญหา");
      return;
    }

    setSendingSupport(true);
    try {
      const res = await fetch(`${API_URL}/api/support-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: supportForm.contact_info.trim(),
          name: supportForm.name.trim(),
          request_type: supportForm.request_type,
          description: supportForm.description.trim(),
        }),
      });

      if (res.ok) {
        alert("✅ ส่งคำร้องเรียนสำเร็จ! เจ้าหน้าที่จะติดต่อกลับในเร็วๆ นี้");
        setSupportForm({
          contact_info: "",
          name: "",
          request_type: "forgot_username",
          description: "",
        });
        setShowSupportModal(false);
      } else {
        const data = (await res.json()) as { detail?: string };
        alert(data.detail || "เกิดข้อผิดพลาดในการส่งคำร้อง");
      }
    } catch {
      alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSendingSupport(false);
    }
  }

  // ✅ Handle login
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const username = form.username.trim();
    const password = form.password;
    const orgCode = form.org_code.trim();

    // Validation
    if (!username || !password) {
      alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    if (password.length < 6) {
      alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (loginType === "staff" && !orgCode) {
      alert("กรุณากรอกรหัสหน่วยงาน");
      return;
    }

    setLoading(true);

    try {
      let token: string | undefined;
      let detectedRole = "user";

      if (loginType === "user") {
        const res = await fetch(`${API_URL}/api/user/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          const data = (await res.json()) as LoginResponse;
          alert(formatErrorMessage(data.detail));
          return;
        }

        const data = (await res.json()) as LoginResponse;
        token = data.access_token || data.token;
        detectedRole = "user";
      } else {
        // Try doctor first
        let res = await fetch(`${API_URL}/api/doctors/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, org_code: orgCode }),
        });

        if (res.ok) {
          const data = (await res.json()) as LoginResponse;
          token = data.access_token || data.token;
          detectedRole = "doctor";
        } else {
          // Try admin
          res = await fetch(`${API_URL}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, org_code: orgCode }),
          });

          if (res.ok) {
            const data = (await res.json()) as LoginResponse;
            token = data.access_token || data.token;
            detectedRole = "admin";
          } else {
            const errorData = (await res.json()) as LoginResponse;
            alert(formatErrorMessage(errorData.detail));
            return;
          }
        }
      }

      if (!token) {
        alert("❌ ไม่พบ token จากเซิร์ฟเวอร์");
        return;
      }

      // Extract role from token
      const decoded = parseJwt(token);
      const roleFromToken =
        typeof decoded?.role === "string"
          ? decoded.role
          : typeof decoded?.user_role === "string"
            ? decoded.user_role
            : typeof decoded?.type === "string"
              ? decoded.type
              : null;

      const userRole = roleFromToken || detectedRole;

      // Save auth data
      saveAuthData(token, userRole);

      // Redirect
      router.replace(getRedirectPath(userRole));
    } catch {
      alert("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #f0faf5 0%, #e8f5f0 50%, #fafffe 100%)" }}
    >
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            top: "-120px",
            right: "-80px",
            background: "radial-gradient(circle, rgba(22,163,96,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            bottom: "-60px",
            left: "-60px",
            background: "radial-gradient(circle, rgba(22,163,96,0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Back Button */}
      <div className="absolute top-5 left-5 z-10">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
          style={{ color: COLOR.secondary }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          กลับหน้าแรก
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 text-center relative z-10">
        <h1 className="text-2xl font-bold" style={{ color: COLOR.dark }}>
          ระบบวิเคราะห์คาร์บ
        </h1>
        <p className="text-xs tracking-widest uppercase mt-0.5" style={{ color: COLOR.secondary }}>
          Carb Analysis System
        </p>
      </div>

      {/* Login Card */}
      <div
        className="w-full max-w-sm relative z-10 rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(22,163,97,0.12)",
          boxShadow: "0 20px 60px rgba(13,79,46,0.10), 0 4px 16px rgba(13,79,46,0.06)",
        }}
      >
        <h2 className="text-lg font-semibold text-center mb-5" style={{ color: COLOR.dark }}>
          เข้าสู่ระบบ
        </h2>

        {/* Login Type Tabs */}
        <div className="flex rounded-xl p-1 mb-5" style={{ background: "#f0faf5" }}>
          {(["user", "staff"] as LoginType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setLoginType(t);
                setOrgName("");
              }}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                loginType === t
                  ? {
                      background: COLOR.primary,
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(22,163,96,0.3)",
                    }
                  : { color: COLOR.secondary }
              }
            >
              {t === "user" ? "👤 ผู้ใช้งาน" : "🏥 เจ้าหน้าที่"}
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Organization Code */}
          {loginType === "staff" && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: COLOR.darkLabel }}>
                รหัสหน่วยงาน
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="เลขหน่วยงาน 9 หลัก"
                  autoComplete="off"
                  value={form.org_code}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, org_code: e.target.value }));
                    setOrgName("");
                  }}
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{
                    background: COLOR.lightBg,
                    border: `1.5px solid ${COLOR.lightBorder}`,
                    color: COLOR.dark,
                  }}
                />
                <button
                  type="button"
                  onClick={handleCheckOrg}
                  disabled={checkingOrg || !form.org_code}
                  className="px-3.5 rounded-xl text-sm font-medium transition-all duration-200 shrink-0 disabled:opacity-50"
                  style={
                    orgName
                      ? {
                          background: COLOR.successBg,
                          color: COLOR.primary,
                          border: `1.5px solid ${COLOR.successBorder}`,
                        }
                      : {
                          background: COLOR.errorBg,
                          color: "#ef4444",
                          border: `1.5px solid ${COLOR.errorBorder}`,
                        }
                  }
                >
                  {checkingOrg ? "..." : orgName ? "✓" : "ตรวจสอบ"}
                </button>
              </div>
              {orgName && (
                <p className="text-xs font-medium mt-1.5 flex items-center gap-1" style={{ color: COLOR.primary }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {orgName}
                </p>
              )}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLOR.darkLabel }}>
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200"
              style={{
                background: COLOR.lightBg,
                border: `1.5px solid ${COLOR.lightBorder}`,
                color: COLOR.dark,
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLOR.darkLabel }}>
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 pr-10"
                style={{
                  background: COLOR.lightBg,
                  border: `1.5px solid ${COLOR.lightBorder}`,
                  color: COLOR.dark,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                style={{ color: COLOR.secondary }}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-1 transition-all duration-200 disabled:opacity-60 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryDark})`,
              boxShadow: `0 6px 20px rgba(22,163,96,0.35)`,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-5 pt-4 flex flex-col gap-1.5 text-center" style={{ borderTop: "1px solid #e8f5f0" }}>
          <p className="text-xs" style={{ color: COLOR.secondary }}>
            สำหรับผู้ใช้งานทั่วไป?{" "}
            <Link href="/register" className="font-medium hover:underline" style={{ color: COLOR.primary }}>
              สมัครสมาชิก
            </Link>
          </p>
          <p className="text-xs" style={{ color: COLOR.secondary }}>
            สำหรับเจ้าหน้าที่?{" "}
            <Link href="/admin/register" className="font-medium hover:underline" style={{ color: COLOR.primary }}>
              ลงทะเบียนบุคลากร
            </Link>
          </p>
          <p className="text-xs" style={{ color: COLOR.secondary }}>
            ลืมรหัสผ่าน?{" "}
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="font-medium hover:underline focus:outline-none"
              style={{ color: COLOR.primary }}
            >
              รีเซ็ตรหัส
            </button>
          </p>
          <p className="text-xs" style={{ color: COLOR.secondary }}>
            ลืมชื่อผู้ใช้ / พบปัญหา?{" "}
            <button
              type="button"
              onClick={() => setShowSupportModal(true)}
              className="font-medium hover:underline focus:outline-none"
              style={{ color: COLOR.primary }}
            >
              ติดต่อเจ้าหน้าที่
            </button>
          </p>
        </div>
      </div>

      {/* ✅ Reset Password Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{
            background: "rgba(13, 79, 46, 0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="w-full max-w-md bg-white p-6 rounded-3xl border shadow-2xl"
            style={{ borderColor: "rgba(22,163,97,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: COLOR.dark }}>
              🔑 รีเซ็ตรหัสผ่าน
            </h3>
            <p className="text-xs mb-6" style={{ color: COLOR.secondary }}>
              เลือกประเภทบัญชีของคุณ
            </p>

            <div className="flex gap-3">
              {/* User Reset */}
              <Link
                href="/reset-password/user"
                className="flex-1 p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-lg"
                style={{
                  borderColor: COLOR.lightBorder,
                  color: COLOR.dark,
                }}
                onClick={() => setShowResetModal(false)}
              >
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-semibold">ผู้ใช้งาน</div>
                <div className="text-xs" style={{ color: COLOR.secondary }}>
                  บัญชีผู้ใช้ทั่วไป
                </div>
              </Link>

              {/* Admin/Staff Reset */}
              <Link
                href="/reset-password/admin"
                className="flex-1 p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-lg"
                style={{
                  borderColor: COLOR.lightBorder,
                  color: COLOR.dark,
                }}
                onClick={() => setShowResetModal(false)}
              >
                <div className="text-2xl mb-2">🏥</div>
                <div className="text-sm font-semibold">เจ้าหน้าที่</div>
                <div className="text-xs" style={{ color: COLOR.secondary }}>
                  บัญชีเจ้าหน้าที่/แอดมิน
                </div>
              </Link>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
              style={{
                color: COLOR.secondary,
                borderColor: COLOR.lightBorder,
              }}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{
            background: "rgba(13, 79, 46, 0.35)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="w-full max-w-md bg-white p-6 rounded-3xl border shadow-2xl"
            style={{ borderColor: "rgba(22,163,97,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1" style={{ color: COLOR.dark }}>
              📧 แจ้งปัญหาการเข้าสู่ระบบ
            </h3>
            <p className="text-xs mb-4" style={{ color: COLOR.secondary }}>
              กรุณากรอกข้อมูลจริงเพื่อให้เจ้าหน้าที่สามารถตรวจสอบได้อย่างถูกต้อง
            </p>

            <form onSubmit={handleSupportSubmit} className="space-y-4">
              {/* Contact Info */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR.darkLabel }}>
                  📞 ช่องทางการติดต่อกลับ
                </label>
                <input
                  type="text"
                  placeholder="เบอร์โทร หรือ อีเมล"
                  value={supportForm.contact_info}
                  onChange={(e) => setSupportForm((p) => ({ ...p, contact_info: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border transition-all"
                  style={{
                    background: COLOR.lightBg,
                    borderColor: COLOR.lightBorder,
                    color: COLOR.dark,
                  }}
                />
              </div>

              {/* ชื่อ-นามสกุล */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR.darkLabel }}>
                  👤 ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุลของคุณ"
                  value={supportForm.name}
                  onChange={(e) => setSupportForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border transition-all"
                  style={{
                    background: COLOR.lightBg,
                    borderColor: COLOR.lightBorder,
                    color: COLOR.dark,
                  }}
                />
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR.darkLabel }}>
                  🎯 ประเภทปัญหา
                </label>
                <select
                  value={supportForm.request_type}
                  onChange={(e) =>
                    setSupportForm((p) => ({
                      ...p,
                      request_type: e.target.value as RequestType,
                    }))
                  }
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border bg-white"
                  style={{
                    background: COLOR.lightBg,
                    borderColor: COLOR.lightBorder,
                    color: COLOR.dark,
                  }}
                >
                  <option value="forgot_username">🔍 ลืมชื่อผู้ใช้งาน</option>
                  <option value="forgot_password">🔒 ลืมรหัสผ่าน / บัญชีถูกล็อก</option>
                  <option value="other">⚠️ ปัญหาทางเทคนิคอื่นๆ</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: COLOR.darkLabel }}>
                  📝 รายละเอียดปัญหา
                </label>
                <textarea
                  rows={4}
                  placeholder="ระบุรายละเอียดปัญหาที่พบ"
                  value={supportForm.description}
                  onChange={(e) =>
                    setSupportForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none border transition-all resize-none"
                  style={{
                    background: COLOR.lightBg,
                    borderColor: COLOR.lightBorder,
                    color: COLOR.dark,
                  }}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-gray-50"
                  style={{ color: COLOR.secondary, borderColor: COLOR.lightBorder }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={sendingSupport}
                  className="w-1/2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryDark})`,
                    opacity: sendingSupport ? 0.6 : 1,
                  }}
                >
                  {sendingSupport ? "🔄 กำลังส่ง..." : "✉️ ส่งข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: COLOR.secondary }}>
        <p className="text-xs font-medium" style={{ color: "#4a7c62" }}>
          Copyright © 2026 Information Technology for Industry
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#8aab9a" }}>
          King Mongkut&apos;s University of Technology North Bangkok
        </p>
      </div>
    </div>
  );
}