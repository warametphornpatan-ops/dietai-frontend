"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { validateThaiID } from "@/lib/validateThaiID";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const inputBase: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1.5px solid #c8e8d8", background: "#f4fbf7",
  color: "#0d4f2e", fontSize: 15, outline: "none",
  transition: "border-color 0.2s", boxSizing: "border-box",
};

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#2d7055" }}>
        {label}{hint && <span style={{ fontWeight: 400, color: "#6b9e84" }}> {hint}</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}
    </div>
  );
}

function PwInput({ value, onChange, placeholder, autoComplete, error }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; error?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value} placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputBase, paddingRight: 44, borderColor: error ? "#fca5a5" : "#c8e8d8" }}
        onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
        onBlur={e => e.currentTarget.style.borderColor = error ? "#fca5a5" : "#c8e8d8"}
      />
      <button type="button" onClick={() => setShow(p => !p)}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b9e84", padding: 4, display: "flex" }}>
        {show
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
      </button>
    </div>
  );
}

export default function UserResetPasswordPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    identifier: "",   // รับทั้ง email และ บัตรประชาชน
    username: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ID Card states
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const [isIdCardVerified, setIsIdCardVerified] = useState(false);
  const [verifiedFullName, setVerifiedFullName] = useState("");

  // OTP states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // detect ประเภท input
  const isInputEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.identifier.trim());
  const digitsOnly = form.identifier.replace(/\D/g, "");
  const isInputIdCard13 = !form.identifier.includes("@") && digitsOnly.length === 13;
  const isVerified = isInputEmail ? isEmailVerified : isInputIdCard13 ? isIdCardVerified : false;

  const handleSetValue = (key: string) => (val: string) => {
    if (key === "identifier") {
      // ถ้าไม่มี @ ให้กรองเฉพาะตัวเลข (บัตรประชาชน) แต่ถ้ามี @ ให้พิมพ์ได้ปกติ (email)
      const hasAt = val.includes("@");
      const cleaned = hasAt ? val : val.replace(/\D/g, "").slice(0, 13);
      setForm(p => ({ ...p, identifier: cleaned }));
      setIsEmailVerified(false);
      setIsIdCardVerified(false);
      setVerifiedFullName("");
    } else {
      setForm(p => ({ ...p, [key]: val }));
    }
    setFieldErrors(p => ({ ...p, [key]: "" }));
  };

  const pwMatch = form.confirmNewPassword && form.newPassword === form.confirmNewPassword;

  // ✅ ตรวจสอบบัตรประชาชน
  async function handleVerifyIdCard() {
    const result = validateThaiID(form.identifier);
    if (!result.isValid) {
      setFieldErrors(p => ({ ...p, identifier: result.message }));
      return;
    }

    setCheckingIdCard(true);
    setFieldErrors(p => ({ ...p, identifier: "" }));

    try {
      const res = await fetch(`${API_URL}/api/users/check-id-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_card: digitsOnly }),
      });

      if (res.ok) {
        const data = await res.json();
        const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
        setVerifiedFullName(fullName || "พบข้อมูลในระบบ");
        setIsIdCardVerified(true);
      } else if (res.status === 404) {
        setFieldErrors(p => ({ ...p, identifier: "ไม่พบเลขบัตรประชาชนนี้ในระบบ" }));
      } else {
        setFieldErrors(p => ({ ...p, identifier: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล" }));
      }
    } catch {
      alert("❌ ไม่สามารถเชื่อมต่อระบบตรวจสอบบัตรประชาชนได้");
    } finally {
      setCheckingIdCard(false);
    }
  }

  // 📧 ส่ง OTP
  async function handleSendOtp() {
    const emailStr = form.identifier.trim();
    if (!isInputEmail) {
      setFieldErrors(p => ({ ...p, identifier: "รูปแบบอีเมลไม่ถูกต้อง" }));
      return;
    }
    setSendingOtp(true);
    setFieldErrors(p => ({ ...p, identifier: "" }));
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailStr,
        options: { shouldCreateUser: true },
      });
      if (error) {
        alert(`❌ ไม่สามารถส่ง OTP ได้: ${error.message}`);
      } else {
        alert("📩 ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว โปรดตรวจสอบกล่องข้อความหรือ Junk mail");
        setShowOtpModal(true);
      }
    } catch {
      alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ OTP");
    } finally {
      setSendingOtp(false);
    }
  }

  // 🔢 ยืนยัน OTP
  async function handleVerifyOtp() {
    if (otpCode.trim().length !== 6) {
      alert("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.identifier.trim(),
        token: otpCode.trim(),
        type: "email",
      });
      if (error) {
        alert(`❌ รหัส OTP ไม่ถูกต้องหรือหมดอายุ: ${error.message}`);
      } else {
        alert("✅ ยืนยันอีเมลสำเร็จแล้ว!");
        setIsEmailVerified(true);
        setShowOtpModal(false);
        setOtpCode("");
      }
    } catch {
      alert("❌ ไม่สามารถตรวจสอบรหัส OTP ได้");
    } finally {
      setVerifyingOtp(false);
    }
  }

  // 💾 Submit
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const errs: Record<string, string> = {};
    let finalIdentifier = form.identifier.trim();
    const isEmail = finalIdentifier.includes("@");

    if (!finalIdentifier) {
      errs.identifier = "กรุณากรอกเลขบัตรประชาชนหรืออีเมล";
    } else if (isEmail) {
      if (!isInputEmail) errs.identifier = "รูปแบบอีเมลไม่ถูกต้อง";
      else if (!isEmailVerified) errs.identifier = "กรุณากดส่งและยืนยันรหัส OTP ให้สำเร็จก่อน";
    } else {
      finalIdentifier = digitsOnly;
      if (finalIdentifier.length !== 13) errs.identifier = "เลขบัตรประชาชนต้องมี 13 หลัก";
      else if (!isIdCardVerified) errs.identifier = "กรุณากดปุ่มตรวจสอบเลขบัตรประชาชนให้ผ่านก่อน";
    }

    if (!form.username.trim()) errs.username = "กรุณากรอกชื่อผู้ใช้งาน (Username)";
    if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    if (form.newPassword !== form.confirmNewPassword) errs.confirmNewPassword = "รหัสผ่านไม่ตรงกัน";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    const payload = {
      identifier: finalIdentifier,
      is_email: isEmail,
      username: form.username.trim(),
      new_password: form.newPassword,
    };

    try {
      const res = await fetch(`${API_URL}/api/users/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }
      switch (res.status) {
        case 404: alert("❌ ไม่พบข้อมูลที่ตรงกับข้อมูลที่ระบุ"); break;
        case 422: alert("❌ รูปแบบข้อมูลไม่ถูกต้อง (422)"); break;
        case 500: alert("❌ เซิร์ฟเวอร์มีปัญหา (500)"); break;
        default: alert("❌ เปลี่ยนรหัสผ่านไม่สำเร็จ");
      }
    } catch {
      alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start",
      padding: "16px 16px 40px",
      background: "linear-gradient(160deg,#f0faf5 0%,#e8f5f0 50%,#fafffe 100%)",
    }}>
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 400, height: 400, top: -120, right: -80, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,96,0.07) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, bottom: -60, left: -60, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,96,0.05) 0%,transparent 70%)" }} />
      </div>

      {/* Back link */}
      <div style={{ width: "100%", maxWidth: 420, paddingTop: 8, paddingBottom: 4, position: "relative", zIndex: 1 }}>
        <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#6b9e84", textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#16a360,#0d6e43)", marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>🔑</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0d4f2e" }}>รีเซ็ตรหัสผ่าน</h1>
        <p style={{ margin: "2px 0 0", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b9e84" }}>👤 ผู้ใช้งานทั่วไป</p>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 420, borderRadius: 24, padding: "24px 20px 28px",
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(22,163,97,0.12)",
        boxShadow: "0 20px 60px rgba(13,79,46,0.10),0 4px 16px rgba(13,79,46,0.06)",
        position: "relative", zIndex: 1,
      }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 1. Identifier — บัตรประชาชน หรือ อีเมล (ช่องเดียว) */}
          <Field label="เลขบัตรประชาชน หรือ อีเมล" error={fieldErrors.identifier}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={form.identifier}
                placeholder="เลขบัตรประชาชน 13 หลัก หรือ email@domain.com"
                disabled={isVerified}
                onChange={e => handleSetValue("identifier")(e.target.value)}
                inputMode={isInputEmail ? "email" : "numeric"}
                style={{
                  ...inputBase, flex: 1,
                  borderColor: fieldErrors.identifier ? "#fca5a5" : isVerified ? "#16a360" : "#c8e8d8",
                  background: isVerified ? "#e8f5f0" : "#f4fbf7",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
                onBlur={e => e.currentTarget.style.borderColor = fieldErrors.identifier ? "#fca5a5" : isVerified ? "#16a360" : "#c8e8d8"}
              />

              {/* ปุ่ม OTP สำหรับ email */}
              {isInputEmail && !isEmailVerified && (
                <button type="button" onClick={handleSendOtp} disabled={sendingOtp}
                  style={{
                    padding: "0 14px", borderRadius: 12, border: "none",
                    background: sendingOtp ? "#a7d4bc" : "#0d4f2e",
                    color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: sendingOtp ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap", transition: "background 0.2s",
                  }}>
                  {sendingOtp ? "กำลังส่ง..." : "ส่ง OTP"}
                </button>
              )}

              {/* ปุ่มตรวจสอบสำหรับ บัตรประชาชน */}
              {isInputIdCard13 && !isIdCardVerified && (
                <button type="button" onClick={handleVerifyIdCard} disabled={checkingIdCard}
                  style={{
                    padding: "0 14px", borderRadius: 12, border: "none",
                    background: checkingIdCard ? "#fca5a5" : "#ef4444",
                    color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: checkingIdCard ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap", transition: "background 0.2s",
                  }}>
                  {checkingIdCard ? "กำลังตรวจ..." : "ตรวจสอบ"}
                </button>
              )}

              {/* ปุ่มเขียวหลังผ่านแล้ว */}
              {isVerified && (
                <button type="button" disabled
                  style={{
                    padding: "0 14px", borderRadius: 12, border: "none",
                    background: "#16a360", color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "default", whiteSpace: "nowrap",
                  }}>
                  ✓ ยืนยันแล้ว
                </button>
              )}
            </div>

            {/* แสดงหลังยืนยัน email */}
            {isEmailVerified && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#16a360", fontWeight: 600 }}>
                ✓ ยืนยันอีเมลด้วยรหัส OTP เรียบร้อยแล้ว
              </p>
            )}

            {/* แสดงชื่อหลังยืนยันบัตร */}
            {isIdCardVerified && (
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "#e8f5f0", border: "1px solid rgba(22,163,96,0.3)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "#15803d", fontWeight: 600 }}>✓ ตรวจสอบเลขบัตรประชาชนถูกต้อง</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: "#0d4f2e", fontWeight: 700 }}>ชื่อผู้ใช้: {verifiedFullName}</p>
              </div>
            )}
          </Field>

          {/* 2. Username */}
          <Field label="ชื่อผู้ใช้งาน (Username)" error={fieldErrors.username}>
            <input
              type="text"
              value={form.username}
              placeholder="กรอกชื่อผู้ใช้งานของคุณ"
              onChange={e => handleSetValue("username")(e.target.value)}
              style={{ ...inputBase, borderColor: fieldErrors.username ? "#fca5a5" : "#c8e8d8" }}
              onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
              onBlur={e => e.currentTarget.style.borderColor = fieldErrors.username ? "#fca5a5" : "#c8e8d8"}
            />
          </Field>

          <div style={{ borderTop: "1px dashed rgba(22,163,97,0.2)" }} />

          {/* 3. รหัสผ่านใหม่ */}
          <Field label="รหัสผ่านใหม่" hint="(อย่างน้อย 6 ตัวอักษร)" error={fieldErrors.newPassword}>
            <PwInput value={form.newPassword} onChange={handleSetValue("newPassword")} placeholder="รหัสผ่านใหม่" autoComplete="new-password" error={!!fieldErrors.newPassword} />
          </Field>

          {/* 4. ยืนยันรหัสผ่าน */}
          <Field label="ยืนยันรหัสผ่านใหม่" error={fieldErrors.confirmNewPassword}>
            <div style={{ position: "relative" }}>
              <PwInput value={form.confirmNewPassword} onChange={handleSetValue("confirmNewPassword")} placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password" error={!!fieldErrors.confirmNewPassword} />
              {pwMatch && (
                <span style={{ position: "absolute", right: 42, top: "50%", transform: "translateY(-50%)", color: "#16a360", pointerEvents: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
            </div>
          </Field>

          {/* Hint box */}
          <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(22,163,96,0.06)", border: "1px solid rgba(22,163,96,0.15)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span>💡</span>
            <p style={{ margin: 0, fontSize: 12, color: "#4a7c62", lineHeight: 1.6 }}>
              ระบบจะตรวจสอบข้อมูล Username และเลขบัตรประชาชนหรืออีเมลที่ลงทะเบียนไว้ก่อนเปลี่ยนรหัสผ่านสำเร็จ
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: "100%", padding: 14, marginTop: 2, borderRadius: 14, border: "none",
              fontSize: 15, fontWeight: 700, color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#a7d4bc" : "linear-gradient(135deg,#16a360,#0d8a4f)",
              boxShadow: loading ? "none" : "0 6px 20px rgba(22,163,96,0.35)",
              transition: "all 0.2s",
            }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                กำลังเปลี่ยนรหัสผ่าน...
              </span>
            ) : "เปลี่ยนรหัสผ่าน"}
          </button>
        </form>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(22,163,97,0.12)", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#6b9e84" }}>
            จำรหัสผ่านได้แล้ว?{" "}
            <Link href="/login" style={{ color: "#16a360", fontWeight: 600, textDecoration: "none" }}>เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "#6b9e84" }}>
        <p className="text-xs font-medium" style={{ color: "#4a7c62" }}>
          Copyright © 2026 Information Technology for Industry
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#8aab9a" }}>
          King Mongkut&apos;s University of Technology North Bangkok
        </p>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(13,79,46,0.4)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100, padding: 16,
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 360,
            borderRadius: 20, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: 32 }}>✉️</span>
              <h3 style={{ margin: "8px 0 4px", fontSize: 18, color: "#0d4f2e", fontWeight: 700 }}>กรอกรหัสยืนยันตัวตน</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#6b9e84" }}>รหัส OTP ส่งไปที่ {form.identifier}</p>
            </div>
            <input
              type="text" maxLength={6} value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
              placeholder="รหัสตัวเลข 6 หลัก" inputMode="numeric"
              style={{ ...inputBase, textAlign: "center", fontSize: 20, letterSpacing: "0.3em", fontWeight: "bold" }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button type="button" onClick={() => { setShowOtpModal(false); setOtpCode(""); }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #c8e8d8", background: "#fff", color: "#6b9e84", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                ยกเลิก
              </button>
              <button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp || otpCode.length !== 6}
                style={{
                  flex: 1, padding: 12, borderRadius: 12, border: "none",
                  background: verifyingOtp || otpCode.length !== 6 ? "#a7d4bc" : "#16a360",
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  cursor: verifyingOtp || otpCode.length !== 6 ? "not-allowed" : "pointer",
                }}>
                {verifyingOtp ? "กำลังตรวจ..." : "ยืนยันรหัส"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}