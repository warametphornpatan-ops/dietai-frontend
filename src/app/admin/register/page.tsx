"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveDoctorApplication, checkUsernameAvailabilityInApplications } from "@/lib/supabase-applications-helpers";
import { validateThaiID } from "@/lib/validateThaiID";
import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AdminRegisterForm = {
  org_code: string; citizen_id: string; first_name: string; last_name: string;
  email: string; position: string; username: string; password: string; confirm_password: string;
};

type FastApiValidationErrorItem = { loc: Array<string | number>; msg: string; type: string };
type FastApiErrorResponse = { detail: string | FastApiValidationErrorItem[] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFastApiErrorResponse(v: unknown): v is FastApiErrorResponse {
  if (!isObject(v) || !("detail" in v)) return false;
  const d = v.detail;
  if (typeof d === "string") return true;
  if (Array.isArray(d)) return d.every(i => isObject(i) && Array.isArray(i.loc) && typeof i.msg === "string");
  return false;
}

function extractErrorMessage(body: unknown): string {
  if (!isFastApiErrorResponse(body)) return "ลงทะเบียนไม่สำเร็จ";
  const { detail } = body;
  if (typeof detail === "string") return detail;
  return detail[0]?.msg ?? "ลงทะเบียนไม่สำเร็จ";
}

async function safeParseJson(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try { return await res.json(); } catch { return null; }
}

const inputBase: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 12,
  border: "1.5px solid #c8e8d8", background: "#f4fbf7",
  color: "#0d4f2e", fontSize: 15, outline: "none", transition: "border-color 0.2s",
  boxSizing: "border-box",
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

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, ...rest } = props;
  return (
    <input
      {...rest}
      style={{ ...inputBase, borderColor: hasError ? "#fca5a5" : "#c8e8d8" }}
      onFocus={e => { e.currentTarget.style.borderColor = hasError ? "#ef4444" : "#16a360"; props.onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = hasError ? "#fca5a5" : "#c8e8d8"; props.onBlur?.(e); }}
    />
  );
}

export default function AdminRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<AdminRegisterForm>({
    org_code: "", citizen_id: "", first_name: "", last_name: "",
    email: "", position: "", username: "", password: "", confirm_password: "",
  });
  const [loading, setLoading] = useState(false);

  const [checkingOrg, setCheckingOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgStatus, setOrgStatus] = useState<"idle" | "success" | "error">("idle");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "success" | "error">("idle");

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AdminRegisterForm, string>>>({});

  // ✅ OTP Modal (ยืนยัน email)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // ✅ Success Modal (หลังจาก OTP สำเร็จ)
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const set = (key: keyof AdminRegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [key]: e.target.value }));
    setFieldErrors(p => ({ ...p, [key]: "" }));
    if (key === "org_code") { setOrgStatus("idle"); setOrgName(""); }
    if (key === "username") { setUsernameStatus("idle"); setUsernameMessage(""); }
  };

  async function handleCheckOrg() {
    const code = form.org_code.trim();
    if (!code) { setFieldErrors(p => ({ ...p, org_code: "กรุณากรอกรหัสหน่วยงานก่อน" })); return; }
    setCheckingOrg(true); setOrgStatus("idle"); setOrgName("");
    try {
      const res = await fetch(`${API_URL}/organizations/${code}`);
      if (!res.ok) { setOrgStatus("error"); setOrgName("ไม่พบรหัสหน่วยงานนี้ในระบบ"); return; }
      const data = await res.json();
      if (data.name) { setOrgStatus("success"); setOrgName(data.name); }
      else { setOrgStatus("error"); setOrgName("ไม่พบรหัสหน่วยงานนี้ในระบบ"); }
    } catch { setOrgStatus("error"); setOrgName("เกิดข้อผิดพลาดในการเชื่อมต่อ"); }
    finally { setCheckingOrg(false); }
  }

  async function handleCheckUsername() {
    const user = form.username.trim();
    if (!user) {
      setFieldErrors(p => ({ ...p, username: "กรุณากรอกชื่อผู้ใช้ก่อน" }));
      return;
    }
    setCheckingUsername(true);
    setUsernameStatus("idle");
    setUsernameMessage("");
    try {
      const result = await checkUsernameAvailabilityInApplications(user);
      
      if (result.success && result.available) {
        setUsernameStatus("success");
        setUsernameMessage("สามารถใช้ชื่อผู้ใช้นี้ได้");
      } else {
        setUsernameStatus("error");
        setUsernameMessage("ชื่อผู้ใช้นี้มีในระบบแล้ว");
      }
    } catch {
      setUsernameStatus("error");
      setUsernameMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const errs: Partial<Record<keyof AdminRegisterForm, string>> = {};
    if (orgStatus !== "success") errs.org_code = "กรุณาตรวจสอบรหัสหน่วยงานก่อน";
    
    const digits = form.citizen_id.replace(/\D/g, "");
    
    if (digits.length !== 13) {
      errs.citizen_id = "ต้องเป็นตัวเลข 13 หลัก";
    } else {
      const result = validateThaiID(form.citizen_id);
      if (!result.isValid) {
        errs.citizen_id = result.message;
      }
    }
    
    if (!form.first_name.trim()) errs.first_name = "กรุณากรอกชื่อจริง";
    if (!form.last_name.trim()) errs.last_name = "กรุณากรอกนามสกุล";
    if (!form.email.trim()) errs.email = "กรุณากรอกอีเมล";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "รูปแบบอีเมลไม่ถูกต้อง";
    if (!form.position.trim()) errs.position = "กรุณากรอกตำแหน่ง";
    if (usernameStatus !== "success") errs.username = "กรุณาตรวจสอบชื่อผู้ใช้ก่อน";
    if (form.password.length < 6) errs.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    if (form.password !== form.confirm_password) errs.confirm_password = "รหัสผ่านไม่ตรงกัน";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    try {
      // ✅ บันทึกลง doctor_applications
      const result = await saveDoctorApplication({
        org_code: form.org_code.trim(),
        citizen_id: digits,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password_hash: form.password,
        position: form.position.trim(),
      });

      if (!result.success) {
        alert(result.error || "ลงทะเบียนไม่สำเร็จ");
        return;
      }

      // ✅ ส่ง OTP ผ่าน Supabase Auth API
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: form.email.trim(),
        });

        if (error) {
          alert("ลงทะเบียนสำเร็จ แต่ส่ง OTP ไม่ได้: " + error.message);
          setShowSuccessModal(true);
          return;
        }

        // ✅ แสดง OTP Modal
        setShowOtpModal(true);
      } catch (e) {
        alert("ลงทะเบียนสำเร็จ แต่เกิดข้อผิดพลาดในการส่ง OTP");
        setShowSuccessModal(true);
      }

    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  function handleCloseSuccessModal() {
    setShowSuccessModal(false);
    router.push("/login");
  }

  // ✅ Verify OTP ผ่าน Supabase
  async function handleVerifyOtp() {
    if (otp.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email.trim(),
        token: otp,
        type: "email",
      });

      if (error) {
        alert("รหัส OTP ไม่ถูกต้องหรือหมดอายุ: " + error.message);
        return;
      }

      // ✅ OTP ถูกต้อง - Update email_verified ใน doctor_applications
      const { error: updateError } = await supabase
        .from("doctor_applications")
        .update({ email_verified: true })
        .eq("email", form.email.trim());

      if (updateError) {
        console.error("Error updating email_verified:", updateError);
      }

      // ✅ ปิด OTP Modal และแสดง Success Modal
      setShowOtpModal(false);
      setShowSuccessModal(true);
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setVerifyingOtp(false);
    }
  }

  const pwMatch = form.confirm_password && form.password === form.confirm_password;

  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start", padding: "16px 16px 40px",
      background: "linear-gradient(160deg,#f0faf5 0%,#e8f5f0 50%,#fafffe 100%)",
    }}>
      {/* bg circles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 400, height: 400, top: -120, right: -80, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,96,0.07) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, bottom: -60, left: -60, borderRadius: "50%", background: "radial-gradient(circle,rgba(22,163,96,0.05) 0%,transparent 70%)" }} />
      </div>

      {/* back */}
      <div style={{ width: "100%", maxWidth: 440, paddingTop: 8, paddingBottom: 4, position: "relative", zIndex: 1 }}>
        <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#6b9e84", textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          กลับหน้าเข้าสู่ระบบ
        </Link>
      </div>

      {/* logo */}
      <div style={{ textAlign: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0d4f2e" }}>ระบบวิเคราะห์คาร์บ</h1>
        <p style={{ margin: "2px 0 0", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b9e84" }}>Carb Analysis System</p>
      </div>

      {/* card */}
      <div style={{
        width: "100%", maxWidth: 440, borderRadius: 24, padding: "24px 20px 28px",
        background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(22,163,97,0.12)",
        boxShadow: "0 20px 60px rgba(13,79,46,0.10),0 4px 16px rgba(13,79,46,0.06)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 4, height: 22, borderRadius: 99, background: "linear-gradient(180deg,#16a360,#0d8a4f)" }} />
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0d4f2e" }}>ลงทะเบียนบุคลากรทางการแพทย์</h2>
          <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "rgba(22,163,96,0.1)", color: "#0d6e43", fontWeight: 600, letterSpacing: "0.05em" }}>MEDICAL STAFF</span>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* org code */}
          <Field label="รหัสหน่วยงาน" hint="(9 หลัก)" error={fieldErrors.org_code}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" placeholder="GA123456" value={form.org_code}
                onChange={set("org_code")}
                style={{ ...inputBase, flex: 1, borderColor: fieldErrors.org_code ? "#fca5a5" : orgStatus === "success" ? "#16a360" : orgStatus === "error" ? "#fca5a5" : "#c8e8d8" }}
                onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
                onBlur={e => e.currentTarget.style.borderColor = fieldErrors.org_code ? "#fca5a5" : orgStatus === "success" ? "#16a360" : "#c8e8d8"}
              />
              <button type="button" onClick={handleCheckOrg} disabled={checkingOrg || !form.org_code}
                style={{
                  padding: "0 16px", borderRadius: 12,
                  border: orgStatus === "success" ? "1.5px solid #86efac" : "1.5px solid #fca5a5",
                  background: orgStatus === "success" ? "#dcfce7" : "#fee2e2",
                  color: orgStatus === "success" ? "#16a360" : "#dc2626",
                  fontSize: 13, fontWeight: 600,
                  cursor: checkingOrg || !form.org_code ? "not-allowed" : "pointer",
                  opacity: checkingOrg || !form.org_code ? 0.5 : 1, whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.2s",
                }}>
                {checkingOrg ? "กำลังตรวจ..." : "ตรวจสอบ"}
              </button>
            </div>
            {orgStatus !== "idle" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, marginTop: 2,
                background: orgStatus === "success" ? "rgba(22,163,96,0.08)" : "rgba(239,68,68,0.07)",
                border: `1px solid ${orgStatus === "success" ? "rgba(22,163,96,0.25)" : "rgba(239,68,68,0.2)"}`,
              }}>
                {orgStatus === "success"
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a360" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                <span style={{ fontSize: 13, fontWeight: 500, color: orgStatus === "success" ? "#0d6e43" : "#dc2626" }}>{orgName}</span>
              </div>
            )}
          </Field>

          {/* citizen id */}
          <Field label="เลขบัตรประชาชน" hint="(13 หลัก)" error={fieldErrors.citizen_id}>
            <StyledInput type="text" inputMode="numeric" maxLength={13} placeholder="xxxxxxxxxxxxxxxxx"
              value={form.citizen_id} hasError={!!fieldErrors.citizen_id}
              onChange={e => { setForm(p => ({ ...p, citizen_id: e.target.value.replace(/\D/g, "") })); setFieldErrors(p => ({ ...p, citizen_id: "" })); }} />
          </Field>

          {/* name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ชื่อจริง" error={fieldErrors.first_name}>
              <StyledInput type="text" placeholder="ชื่อ" value={form.first_name}
                hasError={!!fieldErrors.first_name} onChange={set("first_name")} />
            </Field>
            <Field label="นามสกุล" error={fieldErrors.last_name}>
              <StyledInput type="text" placeholder="นามสกุล" value={form.last_name}
                hasError={!!fieldErrors.last_name} onChange={set("last_name")} />
            </Field>
          </div>

          {/* email */}
          <Field label="อีเมล" error={fieldErrors.email}>
            <StyledInput type="email" inputMode="email" placeholder="test@gmail.com"
              value={form.email} hasError={!!fieldErrors.email} onChange={set("email")} />
          </Field>

          {/* position */}
          <Field label="ตำแหน่ง" error={fieldErrors.position}>
            <StyledInput
              type="text"
              placeholder="เช่น แพทย์, พยาบาล, นักโภชนาการ"
              value={form.position}
              hasError={!!fieldErrors.position}
              onChange={set("position")}
            />
          </Field>

          {/* username */}
          <Field label="ชื่อผู้ใช้" hint="(Username)" error={fieldErrors.username}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" placeholder="ภาษาอังกฤษ" value={form.username}
                onChange={set("username")}
                style={{ ...inputBase, flex: 1, borderColor: fieldErrors.username ? "#fca5a5" : usernameStatus === "success" ? "#16a360" : usernameStatus === "error" ? "#fca5a5" : "#c8e8d8" }}
                onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
                onBlur={e => e.currentTarget.style.borderColor = fieldErrors.username ? "#fca5a5" : usernameStatus === "success" ? "#16a360" : "#c8e8d8"}
              />
              <button type="button" onClick={handleCheckUsername} disabled={checkingUsername || !form.username}
                style={{
                  padding: "0 16px", borderRadius: 12,
                  border: usernameStatus === "success" ? "1.5px solid #86efac" : "1.5px solid #fca5a5",
                  background: usernameStatus === "success" ? "#dcfce7" : "#fee2e2",
                  color: usernameStatus === "success" ? "#16a360" : "#dc2626",
                  fontSize: 13, fontWeight: 600,
                  cursor: checkingUsername || !form.username ? "not-allowed" : "pointer",
                  opacity: checkingUsername || !form.username ? 0.5 : 1, whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.2s",
                }}>
                {checkingUsername ? "กำลังตรวจ..." : "ตรวจสอบ"}
              </button>
            </div>
            {usernameStatus !== "idle" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, marginTop: 2,
                background: usernameStatus === "success" ? "rgba(22,163,96,0.08)" : "rgba(239,68,68,0.07)",
                border: `1px solid ${usernameStatus === "success" ? "rgba(22,163,96,0.25)" : "rgba(239,68,68,0.2)"}`,
              }}>
                {usernameStatus === "success"
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a360" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                <span style={{ fontSize: 13, fontWeight: 500, color: usernameStatus === "success" ? "#0d6e43" : "#dc2626" }}>{usernameMessage}</span>
              </div>
            )}
          </Field>

          <div style={{ borderTop: "1px dashed rgba(22,163,97,0.2)", margin: "0 0 2px" }} />

          {/* password */}
          <Field label="รหัสผ่าน" error={fieldErrors.password}>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร" value={form.password}
                onChange={set("password")}
                style={{ ...inputBase, paddingRight: 44, borderColor: fieldErrors.password ? "#fca5a5" : "#c8e8d8" }}
                onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
                onBlur={e => e.currentTarget.style.borderColor = fieldErrors.password ? "#fca5a5" : "#c8e8d8"} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b9e84", padding: 4, display: "flex" }}>
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>
          </Field>

          {/* confirm password */}
          <Field label="ยืนยันรหัสผ่าน" error={fieldErrors.confirm_password}>
            <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} autoComplete="new-password"
                placeholder="กรอกรหัสผ่านอีกครั้ง" value={form.confirm_password}
                onChange={set("confirm_password")}
                style={{ ...inputBase, paddingRight: 44, borderColor: fieldErrors.confirm_password ? "#fca5a5" : pwMatch ? "#16a360" : "#c8e8d8" }}
                onFocus={e => e.currentTarget.style.borderColor = "#16a360"}
                onBlur={e => e.currentTarget.style.borderColor = fieldErrors.confirm_password ? "#fca5a5" : pwMatch ? "#16a360" : "#c8e8d8"} />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b9e84", padding: 4, display: "flex" }}>
                {showConfirm
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
              {pwMatch && (
                <span style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", color: "#16a360" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
            </div>
          </Field>

          {/* submit */}
          <button type="submit" disabled={loading || orgStatus !== "success" || usernameStatus !== "success"}
            style={{
              width: "100%", padding: 14, marginTop: 4, borderRadius: 14, border: "none", fontSize: 15,
              fontWeight: 700, color: "#fff", cursor: loading || orgStatus !== "success" || usernameStatus !== "success" ? "not-allowed" : "pointer",
              background: loading || orgStatus !== "success" || usernameStatus !== "success" ? "#a7d4bc" : "linear-gradient(135deg,#16a360,#0d8a4f)",
              boxShadow: loading || orgStatus !== "success" || usernameStatus !== "success" ? "none" : "0 6px 20px rgba(22,163,96,0.35)",
              transition: "all 0.2s",
            }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                กำลังลงทะเบียน...
              </span>
            ) : "ลงทะเบียนบุคลากร"}
          </button>
        </form>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(22,163,97,0.12)", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 13, color: "#6b9e84" }}>
            มีบัญชีอยู่แล้ว?{" "}
            <Link href="/login" style={{ color: "#16a360", fontWeight: 600, textDecoration: "none" }}>เข้าสู่ระบบ</Link>
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

      {/* ✅ OTP Modal */}
      {showOtpModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: 16
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 360, borderRadius: 20, padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)", textAlign: "center"
          }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(22,163,96,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a360" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0d4f2e", fontWeight: 700 }}>ยืนยันอีเมลของคุณ</h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6b9e84", lineHeight: 1.6 }}>
              ระบบได้ส่งรหัส OTP 6 หลักไปที่<br />
              <strong style={{ color: "#0d6e43" }}>{form.email}</strong>
            </p>

            <input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="_ _ _ _ _ _" value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ ...inputBase, textAlign: "center", letterSpacing: 12, fontSize: 24, fontWeight: 700, color: "#0d6e43", marginBottom: 16 }}
            />

            <p style={{ fontSize: 12, color: "#9bb8a8", margin: "0 0 16px" }}>
              ไม่ได้รับอีเมล? ตรวจสอบในกล่อง Spam หรือรอสักครู่
            </p>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || verifyingOtp}
              style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 700, color: "#fff",
                background: otp.length !== 6 || verifyingOtp ? "#a7d4bc" : "#16a360",
                cursor: otp.length !== 6 || verifyingOtp ? "not-allowed" : "pointer", transition: "0.2s"
              }}
            >
              {verifyingOtp ? "กำลังตรวจสอบ..." : "ยืนยันรหัส OTP"}
            </button>
          </div>
        </div>
      )}

      {/* ✅ Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: 16
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: 360, borderRadius: 20, padding: 24,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)", textAlign: "center"
          }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(22,163,96,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a360" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#0d4f2e", fontWeight: 700 }}>ลงทะเบียนสำเร็จ!</h3>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b9e84", lineHeight: 1.6 }}>
              ข้อมูลของคุณได้รับการลงทะเบียน<br />
              <strong style={{ color: "#0d6e43" }}>รอการอนุมัติจากแอดมิน</strong>
            </p>

            <p style={{ fontSize: 13, color: "#6b9e84", margin: "0 0 16px", lineHeight: 1.5 }}>
              แอดมินจะตรวจสอบข้อมูลของคุณ  เมื่อได้รับการอนุมัติแล้ว จะสามารถเข้าใช้งานได้
            </p>

            <button
              type="button"
              onClick={handleCloseSuccessModal}
              style={{
                width: "100%", padding: 14, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 700, color: "#fff",
                background: "#16a360",
                cursor: "pointer", transition: "0.2s"
              }}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}