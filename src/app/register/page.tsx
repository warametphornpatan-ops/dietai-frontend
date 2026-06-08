"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tjabazzbmxxbumokdmxi.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface RegisterResponse {
  id?: string;
  role?: string;
  nextStep?: string;
  message?: string;
  detail?: string | Record<string, unknown> | Array<Record<string, unknown>>;
  error?: string;
}

type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Gender = "ชาย" | "หญิง";

const activityThaiMap: Record<Activity, string> = {
  sedentary: "เคลื่อนไหวน้อยมาก นั่งเป็นส่วนใหญ่",
  light: "กิจกรรมเบา (1–3 วัน/สัปดาห์)",
  moderate: "ปานกลาง (4–5 วัน/สัปดาห์)",
  active: "หนัก (6–7 วัน/สัปดาห์)",
  very_active: "หนักมาก/ใช้แรงงาน",
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword?: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  waistCm?: number;
  activityLevel: Activity;
  goal: string;
  healthInfo?: string;
  citizenID: string;
  otp?: string;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function getBmiLabel(b: number): { label: string; color: string } {
  if (b < 18.5) return { label: "น้ำหนักน้อย", color: "#3b82f6" };
  if (b < 23) return { label: "ปกติ", color: "#16a360" };
  if (b < 25) return { label: "น้ำหนักเกิน", color: "#f59e0b" };
  return { label: "อ้วน", color: "#ef4444" };
}

type RegisterPayload = {
  email?: string | null;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number | null;
  waist_cm: number | null;
  activity_level: Activity;
  goal: string;
  health_info: string | null;
  citizen_id: string;
};
type RegisterErr = { detail?: unknown; error?: unknown };

// ── Shared UI ──────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1.5px solid #c8e8d8",
  background: "#f4fbf7",
  color: "#0d4f2e",
  fontSize: 15,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#16a360";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "#c8e8d8";
        props.onBlur?.(e);
      }}
    />
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step + 1) / total) * 100);
  return (
    <div style={{ width: "100%", marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: "#6b9e84" }}>
          ขั้นตอนที่ {step + 1} จาก {total}
        </span>
        <span style={{ fontSize: 12, color: "#16a360", fontWeight: 600 }}>
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#d1fae5",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg,#16a360,#0d8a4f)",
            borderRadius: 99,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 14,
        border: selected ? "2px solid #16a360" : "1.5px solid #c8e8d8",
        background: selected ? "rgba(22,163,96,0.06)" : "#f4fbf7",
        color: selected ? "#0d4f2e" : "#4a7c62",
        fontWeight: selected ? 600 : 400,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: selected ? "0 0 0 3px rgba(22,163,96,0.12)" : "none",
      }}
    >
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <span>{children}</span>
      {selected && (
        <span style={{ marginLeft: "auto", color: "#16a360" }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: 14,
        border: "none",
        background: disabled
          ? "#a7d4bc"
          : "linear-gradient(135deg,#16a360,#0d8a4f)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 15,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 6px 20px rgba(22,163,96,0.35)",
        transition: "all 0.2s",
        letterSpacing: 0.3,
      }}
    >
      {children}
    </button>
  );
}

const stepTitles = [
  "เพศของคุณ",
  "อายุ",
  "ส่วนสูง",
  "น้ำหนัก",
  "กิจกรรมประจำวัน",
  "เป้าหมาย",
  "ข้อมูลสุขภาพ",
  "สร้างบัญชี",
  "ตรวจสอบข้อมูล",
  "ยืนยัน OTP",
];
const stepIcons = [
  "👤",
  "🎂",
  "📏",
  "⚖️",
  "🏃",
  "🎯",
  "🏥",
  "🔐",
  "✅",
  "✉️",
];

// ── Main Component ─────────────────────────────────────────
export default function RegisterWizard() {
  const total = 10;
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    setValue,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onTouched",
    defaultValues: {
      gender: "ชาย",
      age: undefined,
      heightCm: undefined,
      weightKg: undefined,
      targetWeightKg: undefined,
      activityLevel: "light",
      goal: "ลดน้ำหนัก",
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      citizenID: "",
      otp: "",
    },
  });

  const gender = watch("gender");
  const age = watch("age");
  const heightCm = watch("heightCm");
  const weightKg = watch("weightKg");
  const activityLevel = watch("activityLevel");
  const goal = watch("goal");
  const healthInfo = watch("healthInfo");
  const citizenID = watch("citizenID");
  const email = watch("email");
  const currentBMI = bmi(Number(weightKg) || 0, Number(heightCm) || 1);
  const bmiInfo = getBmiLabel(currentBMI);

  const next = async () => {
    if (step === 7) {
      const ok = await trigger([
        "firstName",
        "lastName",
        "email",
        "username",
        "password",
        "confirmPassword",
        "citizenID",
      ]);
      if (!ok) return;
    }
    setStep((s) => clamp(s + 1, 0, total - 1));
  };
  const back = () => setStep((s) => clamp(s - 1, 0, total - 1));

  // ── ส่ง OTP ผ่าน Supabase signUp() ─────────────────────────
  const handleRequestOtpAndProceed = async () => {
    const formData = watch();
    const currentEmail = (formData.email as string | undefined)?.trim() || "";

    if (!currentEmail) {
      handleSubmit(submitToApi)();
      return;
    }

    setSendingOtp(true);

    try {
      const usernameVal = formData.username as string | undefined;
      const firstNameVal = formData.firstName as string | undefined;
      const lastNameVal = formData.lastName as string | undefined;
      const citizenIdVal = formData.citizenID as string | undefined;
      const genderVal = formData.gender as string | undefined;
      const ageVal = formData.age as number | string | undefined;
      const heightVal = formData.heightCm as number | string | undefined;
      const weightVal = formData.weightKg as number | string | undefined;
      const activityVal = formData.activityLevel as string | undefined;
      const goalVal = formData.goal as string | undefined;
      const healthVal = formData.healthInfo as string | undefined;

      const { error } = await supabase.auth.signUp({
        email: currentEmail,
        password: (formData.password as string) || "",
        options: {
          data: {
            username: usernameVal?.trim() || null,
            first_name: firstNameVal?.trim() || null,
            last_name: lastNameVal?.trim() || null,
            citizen_id: (citizenIdVal || "").replace(/\D/g, ""),
            gender: genderVal || null,
            age: Number(ageVal) || 0,
            height_cm: Number(heightVal) || 0,
            weight_kg: Number(weightVal) || 0,
            activity_level: activityVal || null,
            goal: goalVal || null,
            health_info: healthVal?.trim() || null,
          },
        },
      });

      if (error) throw error;

      setStep(9);
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "กรุณาตรวจสอบการตั้งค่าอีเมลของคุณ";
      alert(`❌ ไม่สามารถส่งรหัส OTP ได้: ${errorMessage}`);
    } finally {
      setSendingOtp(false);
    }
  };

  // ── บันทึกข้อมูลลงตาราง user ใน SQL ─────────────────────────
  async function submitToApi(v: FormValues) {
    if (submitting) return;
    setSubmitting(true);

    const norm = {
      email: v.email.trim() === "" ? null : v.email.trim(),
      username: v.username.trim(),
      // ✅ แก้ไข: ใช้ชื่อ field ตรงกับ Backend (firstName / lastName)
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      gender: v.gender,
      age: Number(v.age) || 0,
      height_cm: Number(v.heightCm) || 0,
      weight_kg: Number(v.weightKg) || 0,
      target_weight_kg:
        v.targetWeightKg != null ? Number(v.targetWeightKg) : null,
      waist_cm: v.waistCm != null ? Number(v.waistCm) : null,
      activity_level: v.activityLevel,
      goal: v.goal,
      health_info: v.healthInfo?.trim() || null,
      password: v.password,
      citizen_id: (v.citizenID || "").replace(/\D/g, "").slice(0, 13),
    };

    try {
      // ── กรณีมีอีเมล: ยืนยัน OTP จาก Supabase แล้วบันทึกลง SQL ──
      if (v.email && v.email.trim() !== "") {
        const { data: verifyData, error: verifyError } =
          await supabase.auth.verifyOtp({
            email: v.email.trim(),
            token: v.otp ? v.otp.trim() : "",
            type: "signup",
          });

        if (verifyError) {
          alert("รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
          return;
        }

        if (verifyData?.user) {
          // ✅ แก้ไข: เปลี่ยน /register → /user/register
          const response = await fetch(`${API_URL}/user/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: verifyData.user.id,
              username: norm.username,
              password: norm.password,
              email: norm.email,
              // ✅ แก้ไข: ใช้ firstName / lastName ตรงกับ Backend
              firstName: norm.firstName,
              lastName: norm.lastName,
              citizen_id: norm.citizen_id,
              role: "user",
              gender: norm.gender,
              age: norm.age,
              height_cm: norm.height_cm,
              weight_kg: norm.weight_kg,
              target_weight_kg: norm.target_weight_kg,
              waist_cm: norm.waist_cm,
              activity_level: norm.activity_level,
              goal: norm.goal,
              health_info: norm.health_info,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            alert(
              `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${result.message || "บันทึกไม่สำเร็จ"}`
            );
            return;
          }
        }

        alert("🎉 ยืนยัน OTP และสมัครสมาชิกสำเร็จ!");
        window.location.href = "/login";
        return;
      }

      // ── กรณีไม่มีอีเมล: ลงทะเบียนผ่าน custom API โดยตรง ──────
      const payload: RegisterPayload = {
        email: norm.email,
        username: norm.username,
        password: norm.password,
        // ✅ แก้ไข: ใช้ firstName / lastName ตรงกับ Backend
        firstName: norm.firstName,
        lastName: norm.lastName,
        gender: norm.gender,
        age: norm.age,
        height_cm: norm.height_cm,
        weight_kg: norm.weight_kg,
        target_weight_kg: norm.target_weight_kg,
        waist_cm: norm.waist_cm,
        activity_level: norm.activity_level,
        goal: norm.goal,
        health_info: norm.health_info,
        citizen_id: norm.citizen_id,
      };

      // ✅ แก้ไข: เปลี่ยน /register → /user/register
      const res = await fetch(`${API_URL}/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let dataUnknown: unknown = {};
      if (
        (res.headers.get("content-type") || "").includes("application/json")
      ) {
        try {
          dataUnknown = await res.json();
        } catch {
          dataUnknown = {};
        }
      }

      if (!res.ok) {
        const e = dataUnknown as RegisterErr;
        const rawErr = e?.detail || e?.error;
        const msg =
          typeof rawErr === "object" && rawErr !== null
            ? JSON.stringify(rawErr, null, 2)
            : String(rawErr || "สมัครสมาชิกไม่สำเร็จ");
        alert(`เกิดข้อผิดพลาด:\n${msg}`);
        return;
      }

      alert("🎉 สมัครสมาชิกสำเร็จ! ลองล็อกอินได้เลย");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
      alert(`❌ เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "16px 16px 32px",
        background:
          "linear-gradient(160deg,#f0faf5 0%,#e8f5f0 50%,#fafffe 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          paddingTop: 8,
        }}
      >
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1.5px solid #c8e8d8",
              background: "#f4fbf7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#2d7055",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#0d4f2e" }}>
            สมัครสมาชิก
          </span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: "24px 20px",
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(22,163,97,0.12)",
          boxShadow:
            "0 20px 60px rgba(13,79,46,0.10),0 4px 16px rgba(13,79,46,0.06)",
        }}
      >
        <ProgressBar step={step} total={total} />

        {/* Step header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>{stepIcons[step]}</div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#0d4f2e",
            }}
          >
            {stepTitles[step]}
          </h2>
        </div>

        {/* STEP 0: gender */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ChoiceCard
              icon="♂️"
              selected={gender === "ชาย"}
              onClick={() => setValue("gender", "ชาย")}
            >
              ชาย
            </ChoiceCard>
            <ChoiceCard
              icon="♀️"
              selected={gender === "หญิง"}
              onClick={() => setValue("gender", "หญิง")}
            >
              หญิง
            </ChoiceCard>
            <div style={{ marginTop: 4 }}>
              <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* STEP 1: age */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600 }}>
              อายุ (ปี)
            </label>
            <StyledInput
              type="number"
              min={1}
              max={80}
              value={age ?? ""}
              placeholder="เช่น 25"
              onChange={(e) =>
                setValue(
                  "age",
                  e.target.value === ""
                    ? (undefined as unknown as number)
                    : Number(e.target.value)
                )
              }
            />
            <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
          </div>
        )}

        {/* STEP 2: height */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600 }}>
              ส่วนสูง (ซม.)
            </label>
            <StyledInput
              type="number"
              min={120}
              max={220}
              value={heightCm ?? ""}
              placeholder="เช่น 165"
              onChange={(e) =>
                setValue(
                  "heightCm",
                  e.target.value === ""
                    ? (undefined as unknown as number)
                    : Number(e.target.value)
                )
              }
            />
            <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
          </div>
        )}

        {/* STEP 3: weight */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600 }}>
              น้ำหนัก (กก.)
            </label>
            <StyledInput
              type="number"
              min={35}
              max={160}
              step={0.1}
              value={weightKg ?? ""}
              placeholder="เช่น 65"
              onChange={(e) =>
                setValue(
                  "weightKg",
                  e.target.value === ""
                    ? (undefined as unknown as number)
                    : Number(e.target.value)
                )
              }
            />
            {weightKg && heightCm && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(22,163,96,0.07)",
                  border: "1px solid rgba(22,163,96,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 13, color: "#4a7c62" }}>
                  BMI ของคุณ:
                </span>
                <span
                  style={{ fontSize: 16, fontWeight: 700, color: bmiInfo.color }}
                >
                  {currentBMI.toFixed(1)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontWeight: 600,
                    background: `${bmiInfo.color}18`,
                    color: bmiInfo.color,
                  }}
                >
                  {bmiInfo.label}
                </span>
              </div>
            )}
            <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
          </div>
        )}

        {/* STEP 4: activity */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(
              [
                { key: "sedentary", icon: "🛋️", label: "เคลื่อนไหวน้อยมาก", sub: "นั่งเป็นส่วนใหญ่" },
                { key: "light", icon: "🚶", label: "กิจกรรมเบา", sub: "1–3 วัน/สัปดาห์" },
                { key: "moderate", icon: "🏊", label: "ปานกลาง", sub: "4–5 วัน/สัปดาห์" },
                { key: "active", icon: "🏋️", label: "หนัก", sub: "6–7 วัน/สัปดาห์" },
                { key: "very_active", icon: "⚡", label: "หนักมาก", sub: "ใช้แรงงาน/ออกกำลัง 2×/วัน" },
              ] as { key: Activity; icon: string; label: string; sub: string }[]
            ).map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setValue("activityLevel", a.key)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  border: activityLevel === a.key ? "2px solid #16a360" : "1.5px solid #c8e8d8",
                  background: activityLevel === a.key ? "rgba(22,163,96,0.07)" : "#f4fbf7",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                  boxShadow: activityLevel === a.key ? "0 0 0 3px rgba(22,163,96,0.12)" : "none",
                }}
              >
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: activityLevel === a.key ? 600 : 400,
                      color: activityLevel === a.key ? "#0d4f2e" : "#4a7c62",
                    }}
                  >
                    {a.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b9e84", marginTop: 1 }}>
                    {a.sub}
                  </div>
                </div>
                {activityLevel === a.key && (
                  <span style={{ marginLeft: "auto", color: "#16a360" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
            <div style={{ marginTop: 4 }}>
              <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* STEP 5: goal */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { g: "ลดน้ำหนัก", icon: "📉", sub: "ลดไขมัน ควบคุมคาร์บ" },
              { g: "สุขภาพที่ดีขึ้น", icon: "💚", sub: "สมดุลโภชนาการ" },
              { g: "เพิ่มน้ำหนัก", icon: "📈", sub: "เพิ่มกล้ามเนื้อ มวลกาย" },
            ].map(({ g, icon, sub }) => (
              <button
                key={g}
                type="button"
                onClick={() => setValue("goal", g)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 14,
                  cursor: "pointer",
                  border: goal === g ? "2px solid #16a360" : "1.5px solid #c8e8d8",
                  background: goal === g ? "rgba(22,163,96,0.07)" : "#f4fbf7",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                  boxShadow: goal === g ? "0 0 0 3px rgba(22,163,96,0.12)" : "none",
                }}
              >
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: goal === g ? 700 : 400, color: goal === g ? "#0d4f2e" : "#4a7c62" }}>
                    {g}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b9e84", marginTop: 1 }}>
                    {sub}
                  </div>
                </div>
                {goal === g && (
                  <span style={{ marginLeft: "auto", color: "#16a360" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
            <div style={{ marginTop: 4 }}>
              <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* STEP 6: health */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600 }}>
              ปัญหาสุขภาพ / ข้อจำกัดด้านอาหาร
            </label>
            <StyledInput
              placeholder="เช่น เบาหวาน, แพ้ถั่ว... (ถ้าไม่มีเว้นว่างได้)"
              value={healthInfo ?? ""}
              onChange={(e) => setValue("healthInfo", e.target.value)}
            />
            <p style={{ fontSize: 12, color: "#6b9e84", margin: "0 4px" }}>
              * ข้อมูลนี้เป็นเพียงข้อมูลพื้นฐานในการเก็บข้อมูลสุขภาพ
            </p>
            <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
          </div>
        )}

        {/* STEP 7: account */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "ชื่อ", name: "firstName", placeholder: "เช่น สมชาย", rules: { required: "กรุณากรอกชื่อ" } },
              { label: "นามสกุล", name: "lastName", placeholder: "เช่น ใจดี", rules: { required: "กรุณากรอกนามสกุล" } },
            ].map(({ label, name, placeholder, rules }) => (
              <div key={name}>
                <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  {...register(name as keyof FormValues, rules)}
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
                />
                {errors[name as keyof FormValues] && (
                  <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    {String(errors[name as keyof FormValues]?.message)}
                  </p>
                )}
              </div>
            ))}

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                เลขบัตรประชาชน (13 หลัก)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                placeholder="กรอกตัวเลข 13 หลัก เช่น 1100100234567"
                {...register("citizenID", {
                  required: "กรุณากรอกเลขบัตรประชาชน",
                  pattern: { value: /^[0-9]{13}$/, message: "ต้องเป็นตัวเลข 13 หลัก" },
                })}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
              />
              {errors.citizenID && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                  {String(errors.citizenID.message)}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Email <span style={{ fontWeight: 400, color: "#6b9e84" }}>(ถ้ามี)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                placeholder="เช่น somchai@gmail.com"
                {...register("email", {
                  validate: (v) =>
                    v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "รูปแบบอีเมลไม่ถูกต้อง",
                })}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
              />
              {errors.email && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                  {String(errors.email.message)}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                placeholder="ตั้งชื่อผู้ใช้ภาษาอังกฤษ เช่น somchai_dev"
                {...register("username", {
                  required: "กรุณากรอกชื่อผู้ใช้",
                  minLength: { value: 3, message: "ต้องมีอย่างน้อย 3 ตัวอักษร" },
                })}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
              />
              {errors.username && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                  {String(errors.username.message)}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                  {...register("password", {
                    required: "กรุณากรอกรหัสผ่าน",
                    minLength: { value: 6, message: "ต้องมีอย่างน้อย 6 ตัวอักษร" },
                  })}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b9e84", padding: 4 }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                  {String(errors.password.message)}
                </p>
              )}
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="กรอกรหัสผ่านอีกครั้งให้ตรงกัน"
                  {...register("confirmPassword", {
                    required: "กรุณายืนยันรหัสผ่าน",
                    validate: (value) => value === watch("password") || "รหัสผ่านไม่ตรงกัน",
                  })}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b9e84", padding: 4 }}
                >
                  {showConfirmPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                  {String(errors.confirmPassword.message)}
                </p>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              <PrimaryBtn onClick={next}>ดำเนินการต่อ →</PrimaryBtn>
            </div>
          </div>
        )}

        {/* STEP 8: review */}
        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ borderRadius: 14, border: "1px solid rgba(22,163,97,0.18)", overflow: "hidden" }}>
              {[
                { label: "เพศ", value: gender },
                { label: "อายุ", value: `${age} ปี` },
                { label: "ส่วนสูง", value: `${heightCm} ซม.` },
                { label: "น้ำหนัก", value: `${weightKg} กก.` },
                { label: "BMI", value: `${currentBMI.toFixed(1)} (${bmiInfo.label})`, color: bmiInfo.color },
                { label: "กิจกรรม", value: activityThaiMap[activityLevel] },
                { label: "เป้าหมาย", value: goal },
                { label: "สุขภาพ", value: healthInfo || "-" },
                {
                  label: "เลขบัตร ปชช.",
                  value: citizenID?.length === 13 ? `${citizenID.slice(0, 3)}-*****-${citizenID.slice(-4)}` : citizenID || "-",
                },
                { label: "อีเมล", value: email || "(ไม่ได้ระบุ)" },
              ].map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    fontSize: 13,
                    background: i % 2 === 0 ? "#f4fbf7" : "rgba(255,255,255,0.7)",
                    borderBottom: i < 9 ? "1px solid rgba(22,163,97,0.1)" : "none",
                  }}
                >
                  <span style={{ color: "#6b9e84", fontWeight: 500 }}>{row.label}</span>
                  <span style={{ color: row.color || "#0d4f2e", fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            <PrimaryBtn onClick={handleRequestOtpAndProceed} disabled={submitting || sendingOtp}>
              {sendingOtp || submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  กำลังดำเนินการ...
                </span>
              ) : email && email.trim() !== "" ? (
                "ส่งรหัส OTP เข้าอีเมล"
              ) : (
                "✓ ยืนยันและสมัครสมาชิก"
              )}
            </PrimaryBtn>

            <button
              type="button"
              onClick={back}
              disabled={submitting || sendingOtp}
              style={{ width: "100%", padding: "12px", borderRadius: 14, fontSize: 14, fontWeight: 500, border: "1.5px solid #c8e8d8", background: "#f4fbf7", color: "#4a7c62", cursor: "pointer" }}
            >
              ย้อนกลับไปแก้ไข
            </button>
          </div>
        )}

        {/* STEP 9: OTP Verification */}
        {step === 9 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: "#4a7c62", margin: 0 }}>ระบบส่งรหัส OTP ไปที่อีเมล</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0d4f2e", margin: "4px 0 0" }}>{email}</p>
              <p style={{ fontSize: 12, color: "#6b9e84", margin: "8px 0 0" }}>
                กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์ Spam)
              </p>
            </div>

            <div>
              <label style={{ fontSize: 13, color: "#2d7055", fontWeight: 600, display: "block", marginBottom: 6, textAlign: "center" }}>
                รหัส OTP (6 หลัก)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                {...register("otp", {
                  required: "กรุณากรอกรหัส OTP",
                  pattern: { value: /^[0-9]{6}$/, message: "รหัส OTP ต้องเป็นตัวเลข 6 หลัก" },
                })}
                style={{ ...inputStyle, textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: 600 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#16a360")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#c8e8d8")}
              />
              {errors.otp && (
                <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6, textAlign: "center" }}>
                  {String(errors.otp.message)}
                </p>
              )}
            </div>

            <PrimaryBtn onClick={handleSubmit(submitToApi)} disabled={submitting}>
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  กำลังตรวจสอบรหัส OTP...
                </span>
              ) : (
                "✓ ยืนยัน OTP และสร้างบัญชี"
              )}
            </PrimaryBtn>
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              style={{ width: "100%", padding: "12px", borderRadius: 14, fontSize: 14, fontWeight: 500, border: "1.5px solid #c8e8d8", background: "#f4fbf7", color: "#4a7c62", cursor: "pointer" }}
            >
              ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}