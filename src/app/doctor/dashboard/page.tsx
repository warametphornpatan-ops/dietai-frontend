"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PatientReportPDF from "../PDF/PatientReportPDF";

type DailyNutrition = { date: string; totalCal: number; totalCarb: number };
type FoodLog = { id: number; foodName: string; calories: number; carbs: number; protein: number; createdAt: string };
type HealthRecord = {
  id: number; systolic: number | null; diastolic: number | null;
  pulse: number | null; recommendation: string; createdAt: string
};
type Patient = {
  id?: string; userId?: string; citizenId?: string; firstName: string; lastName: string;
  heightCm: number; weightKg: number; bmi: number;
  targetCalories: number; targetCarbs: number;
  dailyNutrition: DailyNutrition[]; foodLogs?: FoodLog[];
  healthRecords?: HealthRecord[]; allergies?: string[];
};
type DoctorProfile = {
  hospitalName: string; firstName: string; lastName: string;
  position: string; doctorId: string; orgCode: string;
};

// ✅ เพิ่ม Type สำหรับประวัติการเปลี่ยนแปลง
type ProfileHistory = {
  id: number; 
  weightKg: number | null;
  heightCm: number | null;
  healthInfo: string | null;
  createdAt: string;
};

const T = {
  bg: "#f0f4f8", white: "#ffffff", border: "#e2e8f0", borderLight: "#f1f5f9",
  text: "#1e293b", textSub: "#64748b", textMuted: "#94a3b8",
  accent: "#2563eb", accentLight: "#eff6ff", accentBorder: "#bfdbfe", accentSoft: "#dbeafe",
  indigo: "#4f46e5", indigoLight: "#eef2ff",
  green: "#16a34a", greenLight: "#f0fdf4", greenBorder: "#bbf7d0",
  rose: "#e11d48", roseLight: "#fff1f2",
  amber: "#d97706", amberLight: "#fffbeb",
  shadow: "0 1px 4px rgba(30,41,59,0.07)", shadowMd: "0 4px 16px rgba(30,41,59,0.09)",
};

const inputSt: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: `1.5px solid ${T.border}`, background: T.bg,
  color: T.text, fontSize: 13, outline: "none",
  transition: "border-color 0.15s, background 0.15s", boxSizing: "border-box",
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

function SI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ ...inputSt, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentLight; props.onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg; props.onBlur?.(e); }} />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 11, fontWeight: 700, color: T.textSub, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{children}</label>;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <span style={{ color: T.accent }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

const isDigitOnly = (s: string) => /^\d+$/.test(s.trim());

export default function DoctorDashboard() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  const [systolicInput, setSystolicInput] = useState("");
  const [diastolicInput, setDiastolicInput] = useState("");
  const [pulseInput, setPulseInput] = useState("");
  const [recInput, setRecInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ State สำหรับ Modal ประวัติการเปลี่ยนแปลง
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [profileHistoryData, setProfileHistoryData] = useState<ProfileHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบหรือไม่?")) {
      localStorage.clear();
      document.cookie = "token=; Path=/; Max-Age=0;";
      document.cookie = "access_token=; Path=/; Max-Age=0;";
      document.cookie = "user_role=; Path=/; Max-Age=0;";
      router.push("/login");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("access_token");
    const role = localStorage.getItem("user_role");
    if (!token || role !== "doctor") { router.replace("/login"); return; }

    const decoded = parseJwt(token);
    if (decoded) {
      const firstName = (decoded.first_name || decoded.firstName || "แพทย์") as string;
      const lastName = (decoded.last_name || decoded.lastName || "") as string;
      const orgCode = (decoded.org_code || decoded.orgCode || "") as string;
      const position = (decoded.position || decoded.role_title || decoded.title || "") as string;
      const username = (decoded.username || decoded.sub || "") as string;

      setDoctorProfile({
        hospitalName: "กำลังโหลดข้อมูลสถานพยาบาล...",
        firstName, lastName,
        position, 
        doctorId: username,
        orgCode
      });

      if (orgCode) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations/${orgCode}`)
          .then(res => { if (res.ok) return res.json(); throw new Error(); })
          .then((data: Record<string, unknown>) => {
            setDoctorProfile(prev => prev ? {
              ...prev,
              hospitalName: typeof data.name === "string" ? data.name : `หน่วยงานรหัส: ${orgCode}`
            } : null);
          })
          .catch(() => {
            setDoctorProfile(prev => prev ? { ...prev, hospitalName: `หน่วยงานรหัส: ${orgCode}` } : null);
          });
      }
    }
  }, [router]);

  const loadPatients = useCallback(async (kw: string) => {
    if (!kw.trim()) { setPatients([]); return; }
    try {
      const param = isDigitOnly(kw) ? `citizenId=${encodeURIComponent(kw)}` : `name=${encodeURIComponent(kw)}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/doctors/patients?${param}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPatients(data);
        setSelected(prev => {
          if (!prev) return null;
          const prevId = prev.id || prev.userId;
          return data.find((p: Patient) => (p.id || p.userId) === prevId) || prev;
        });
      } else setPatients([]);
    } catch { setPatients([]); }
  }, []);

  useEffect(() => { loadPatients(keyword); }, [keyword, loadPatients]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const targetId = selected.id || selected.userId;
    if (!targetId) { alert("ไม่พบรหัสผู้ป่วย"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/doctors/patients/${targetId}/health-records`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systolic: systolicInput ? parseInt(systolicInput) : null,
          diastolic: diastolicInput ? parseInt(diastolicInput) : null,
          pulse: pulseInput ? parseInt(pulseInput) : null,
          recommendation: recInput
        }),
      });
      if (res.ok) {
        alert("บันทึกคำแนะนำเรียบร้อยแล้ว!");
        setSystolicInput(""); setDiastolicInput(""); setPulseInput(""); setRecInput("");
        loadPatients(keyword);
      } else alert("เกิดข้อผิดพลาดในการบันทึก");
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
    finally { setIsSubmitting(false); }
  };

  // ✅ ฟังก์ชันดึงข้อมูลประวัติรายบุคคลเมื่อกดปุ่ม Modal
  const fetchProfileHistory = async (patientId: string) => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/doctors/patients/${patientId}/profile-history`);
      if (res.ok) {
        const data = await res.json();
        setProfileHistoryData(data);
      } else {
        setProfileHistoryData([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setProfileHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const filteredNames = useMemo(() => {
    const map = new Map<string, Patient>();
    const s = keyword.trim().toLowerCase();
    if (!s) return [];
    const isCitizen = isDigitOnly(keyword);
    (Array.isArray(patients) ? patients : []).forEach(p => {
      const id = p.id || p.userId || Math.random().toString();
      if (isCitizen) {
        if ((p.citizenId || "").includes(keyword.trim())) map.set(id, p);
      } else {
        if ((p.firstName || "").toLowerCase().includes(s) || (p.lastName || "").toLowerCase().includes(s)) map.set(id, p);
      }
    });
    return Array.from(map.values());
  }, [keyword, patients]);

  const bmiColor = (bmi: number) => bmi > 25 ? T.rose : bmi > 23 ? T.amber : T.green;
  const bmiLabel = (bmi: number) => bmi > 25 ? "น้ำหนักเกิน" : bmi > 23 ? "ค่อนข้างเกิน" : "ปกติ";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, padding: "20px 16px 48px", fontFamily: "sans-serif", color: T.text }}>
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.white, padding: "16px 20px", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: T.shadow, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 300 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: T.accent, display: "flex", alignItems: "center", color: T.white, boxShadow: "0 2px 10px rgba(37,99,235,0.2)", flexShrink: 0, justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>
                {doctorProfile?.hospitalName}
              </h1>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: T.textSub }}>
                {doctorProfile?.position || "แพทย์"}:{" "}
                <span style={{ color: T.accent, fontWeight: 600 }}>
                  {doctorProfile?.firstName} {doctorProfile?.lastName}
                </span>
                {doctorProfile?.orgCode && (
                  <span style={{ color: T.textMuted }}> (รหัส: {doctorProfile.orgCode})</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            suppressHydrationWarning
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.white, color: T.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = T.rose; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            ออกจากระบบ
          </button>
        </div>

        {/* Search */}
        {!selected && (
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: T.textMuted }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="ค้นหาด้วยชื่อผู้ป่วย หรือ เลขบัตรประชาชน 13 หลัก..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              suppressHydrationWarning
              style={{ ...inputSt, paddingLeft: 42, fontSize: 14, padding: "13px 14px 13px 42px", borderRadius: 13, background: T.white, boxShadow: T.shadow }}
              onFocus={e => { e.currentTarget.style.borderColor = T.accent; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
            />
            {keyword && (
              <span style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99,
                background: isDigitOnly(keyword) ? T.indigoLight : T.accentLight,
                color: isDigitOnly(keyword) ? T.indigo : T.accent,
                border: `1px solid ${isDigitOnly(keyword) ? T.indigo + "40" : T.accentBorder}`,
                pointerEvents: "none"
              }}>
                {isDigitOnly(keyword) ? "🪪 เลขบัตร" : "👤 ชื่อ"}
              </span>
            )}
          </div>
        )}

        {/* Dropdown */}
        {!selected && keyword && filteredNames.length > 0 && (
          <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: T.shadowMd, overflow: "hidden" }}>
            {filteredNames.map((p, i) => {
              const uid = p.id || p.userId || "?";
              return (
                <button key={uid} onClick={() => { setSelected(p); setKeyword(p.firstName || ""); }}
                  style={{ width: "100%", textAlign: "left", padding: "12px 18px", background: "transparent", border: "none", borderBottom: i < filteredNames.length - 1 ? `1px solid ${T.borderLight}` : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.accentSoft, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                      {(p.firstName || "?")[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{p.firstName} {p.lastName}</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>
                        {p.citizenId ? `บัตร: ${p.citizenId}` : `รหัส: ${uid.substring(0, 8)}...`}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.accent, background: T.accentLight, border: `1px solid ${T.accentBorder}`, padding: "3px 10px", borderRadius: 99 }}>เปิดข้อมูล</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Patient Detail */}
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button onClick={() => { setSelected(null); setKeyword(""); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: T.textSub, background: "none", border: "none", cursor: "pointer", padding: "2px 0", width: "fit-content" }}
              onMouseEnter={e => e.currentTarget.style.color = T.text}
              onMouseLeave={e => e.currentTarget.style.color = T.textSub}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              กลับไปหน้าค้นหา
            </button>

            <div style={{ background: T.white, borderRadius: 18, border: `1px solid ${T.border}`, boxShadow: T.shadowMd, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.accentSoft, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, border: `2px solid ${T.accentBorder}`, flexShrink: 0 }}>
                    {(selected.firstName || "?")[0]}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{selected.firstName} {selected.lastName}</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                      {[{ label: `สูง ${selected.heightCm || "–"} ซม.` }, { label: `หนัก ${selected.weightKg || "–"} กก.` }].map(x => (
                        <span key={x.label} style={{ fontSize: 12, fontWeight: 500, color: T.textSub, background: T.bg, border: `1px solid ${T.border}`, padding: "3px 10px", borderRadius: 99 }}>{x.label}</span>
                      ))}
                      {selected.bmi ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: bmiColor(selected.bmi), background: T.bg, border: `1.5px solid ${bmiColor(selected.bmi)}30`, padding: "3px 10px", borderRadius: 99 }}>
                          BMI {selected.bmi} · {bmiLabel(selected.bmi)}
                        </span>
                      ) : null}
                      {selected.allergies && selected.allergies.length > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.rose, background: T.roseLight, border: `1.5px solid ${T.rose}40`, padding: "3px 12px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          แพ้อาหาร: {selected.allergies.join(", ")}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 500, background: T.bg, border: `1px solid ${T.border}`, padding: "3px 12px", borderRadius: 99, color: T.green }}>ไม่มีประวัติการแพ้อาหาร</span>
                      )}

                      {/* ✅ ปุ่มกดเพื่อเปิด Modal ดูประวัติการเปลี่ยนแปลง */}
                      <button
                        onClick={() => fetchProfileHistory(selected.id || selected.userId || "")}
                        style={{
                          fontSize: 12, fontWeight: 600, color: T.white, background: T.indigo, border: "none", padding: "4px 12px", borderRadius: 99, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, boxShadow: T.shadow
                        }}
                      >
                        📊 ดูประวัติการเปลี่ยนแปลง
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <PatientReportPDF patientData={selected} doctorData={doctorProfile}
                    currentRecord={{
                      sys: selected?.healthRecords?.[0]?.systolic?.toString() || "",
                      dia: selected?.healthRecords?.[0]?.diastolic?.toString() || "",
                      pulse: selected?.healthRecords?.[0]?.pulse?.toString() || "",
                      recommendation: selected?.healthRecords?.[0]?.recommendation || ""
                    }} />
                </div>
              </div>

              <div style={{ padding: "24px", background: "#fafbfc" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <Section title="สรุปโภชนาการรายวัน" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}>
                      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: T.bg, borderBottom: `1.5px solid ${T.border}` }}>
                              {["วันที่", "แคลอรี่", "คาร์บ (g)"].map((h, i) => (
                                <th key={h} style={{ padding: "9px 12px", textAlign: i === 0 ? "left" : "right", fontWeight: 600, color: T.textSub, fontSize: 12 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {!selected.dailyNutrition || selected.dailyNutrition.length === 0 ? (
                              <tr><td colSpan={3} style={{ padding: "28px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>ไม่พบข้อมูล</td></tr>
                            ) : selected.dailyNutrition.map((d, i, arr) => {
                              const calOver = selected.targetCalories && d.totalCal > selected.targetCalories;
                              const carbOver = selected.targetCarbs && d.totalCarb > selected.targetCarbs;
                              const dateObj = new Date(d.date);
                              const formattedDate = isNaN(dateObj.getTime()) ? d.date : dateObj.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
                              return (
                                <tr key={d.date} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                                  onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <td style={{ padding: "9px 12px", fontWeight: 500, color: T.text, whiteSpace: "nowrap" }}>{formattedDate}</td>
                                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                                    <span style={{ fontWeight: calOver ? 700 : 400, color: calOver ? T.rose : T.textSub }}>{d.totalCal.toLocaleString()}</span>
                                    {calOver && <span style={{ marginLeft: 6, fontSize: 10, background: T.roseLight, color: T.rose, padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>เกิน</span>}
                                  </td>
                                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                                    <span style={{ fontWeight: carbOver ? 700 : 400, color: carbOver ? T.amber : T.textSub }}>{d.totalCarb.toLocaleString()}</span>
                                    {carbOver && <span style={{ marginLeft: 6, fontSize: 10, background: T.amberLight, color: T.amber, padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>เกิน</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </Section>

                    <Section title="ประวัติการทานรายมื้อ" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.42-4.42a2 2 0 0 1 2.83 0l8.13 8.13a2 2 0 0 1 0 2.83L13 18" /><path d="M11.66 18.34a2 2 0 0 1-2.83 0l-5.66-5.66a2 2 0 0 1 0-2.83Z" /></svg>}>
                      <div style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden", maxHeight: 340, overflowY: "auto", boxShadow: T.shadow }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                            <tr style={{ background: T.bg, borderBottom: `1.5px solid ${T.border}` }}>
                              {["วัน/เวลา", "เมนู", "Kcal", "Carb", "Pro"].map((h, i) => (
                                <th key={h} style={{ padding: "8px 10px", textAlign: i < 2 ? "left" : "right", fontWeight: 600, color: T.textSub, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {!selected.foodLogs?.length ? (
                              <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: T.textMuted }}>ไม่พบประวัติ</td></tr>
                            ) : selected.foodLogs.map((log, i, arr) => (
                              <tr key={log.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
                                onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <td style={{ padding: "8px 10px", color: T.textMuted, whiteSpace: "nowrap" }}>
                                  {new Date(log.createdAt).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td style={{ padding: "8px 10px", fontWeight: 500, color: T.text }}>{log.foodName}</td>
                                <td style={{ padding: "8px 10px", textAlign: "right", color: T.textSub }}>{log.calories}</td>
                                <td style={{ padding: "8px 10px", textAlign: "right", color: T.textSub }}>{log.carbs}</td>
                                <td style={{ padding: "8px 10px", textAlign: "right", color: T.textSub }}>{log.protein}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Section>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ background: T.white, borderRadius: 14, border: `1px solid ${T.border}`, padding: "20px", boxShadow: T.shadow }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                        <span style={{ color: T.indigo }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></span>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>บันทึกผลตรวจและคำแนะนำ</h3>
                      </div>
                      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          <div><Label>SYS (mmHg)</Label><SI type="number" placeholder="120" value={systolicInput} onChange={e => setSystolicInput(e.target.value)} /></div>
                          <div><Label>DIA (mmHg)</Label><SI type="number" placeholder="80" value={diastolicInput} onChange={e => setDiastolicInput(e.target.value)} /></div>
                          <div><Label>Pulse (bpm)</Label><SI type="number" placeholder="75" value={pulseInput} onChange={e => setPulseInput(e.target.value)} /></div>
                        </div>
                        {systolicInput && diastolicInput && (
                          <div style={{ padding: "10px 14px", borderRadius: 10, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>{systolicInput}/{diastolicInput} mmHg</span>
                            {parseInt(systolicInput) > 140 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: T.roseLight, color: T.rose, fontWeight: 700 }}>ความดันสูง</span>}
                          </div>
                        )}
                        <div>
                          <Label>คำแนะนำการดูแลสุขภาพ</Label>
                          <textarea required placeholder="ระบุคำแนะนำด้านโภชนาการ การออกกำลังกาย หรือการปรับพฤติกรรม..." value={recInput} onChange={e => setRecInput(e.target.value)}
                            style={{ width: "100%", minHeight: 110, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13, resize: "none", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }}
                            onFocus={e => { e.currentTarget.style.borderColor = T.indigo; e.currentTarget.style.background = T.indigoLight; }}
                            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg; }} />
                        </div>
                        <button type="submit" disabled={isSubmitting}
                          style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: isSubmitting ? T.textMuted : `linear-gradient(135deg,${T.indigo},#3730a3)`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: isSubmitting ? "not-allowed" : "pointer", boxShadow: isSubmitting ? "none" : "0 4px 14px rgba(79,70,229,0.35)" }}>
                          {isSubmitting ? "กำลังบันทึก..." : "บันทึกและส่งคำแนะนำ"}
                        </button>
                      </form>
                    </div>

                    {/* ✅ ส่วนที่เขียนไม่จบ ปิดแท็กให้เรียบร้อยแล้ว */}
                    {selected.healthRecords && selected.healthRecords.length > 0 && (
                      <Section title="ประวัติการตรวจก่อนหน้า" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /></svg>}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
                          {selected.healthRecords.map(rec => (
                            <div key={rec.id} style={{ background: T.white, borderRadius: 12, border: `1px solid ${T.border}`, padding: "14px 16px", boxShadow: T.shadow, position: "relative", overflow: "hidden" }}>
                              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,${T.indigo},#818cf8)`, borderRadius: "0 0 0 12px" }} />
                              <div style={{ paddingLeft: 10 }}>
                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: T.indigo, background: T.indigoLight, padding: "3px 8px", borderRadius: 99 }}>
                                    {new Date(rec.createdAt).toLocaleDateString("th-TH")}
                                  </span>
                                  {rec.systolic && rec.diastolic && (
                                    <span style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>
                                      ความดัน: {rec.systolic}/{rec.diastolic}
                                    </span>
                                  )}
                                  {rec.pulse && (
                                    <span style={{ fontSize: 12, color: T.textSub, fontWeight: 500 }}>
                                      ชีพจร: {rec.pulse}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
                                  {rec.recommendation}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ✅ Modal แสดงประวัติการเปลี่ยนแปลง */}
      {isHistoryModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20
        }}>
          <div style={{ background: T.white, width: "100%", maxWidth: 600, borderRadius: 20, boxShadow: T.shadowMd, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
            
            {/* Header ของ Modal */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.bg }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 10 }}>
                📊 ประวัติการเปลี่ยนแปลง
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* เนื้อหาใน Modal */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {isLoadingHistory ? (
                <div style={{ textAlign: "center", padding: "40px", color: T.textMuted, fontSize: 14 }}>
                  กำลังโหลดข้อมูล...
                </div>
              ) : profileHistoryData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: T.textMuted, fontSize: 14 }}>
                  ไม่พบข้อมูลประวัติการเปลี่ยนแปลง
                </div>
              ) : (
                <div style={{ borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                        <th style={{ padding: "12px", textAlign: "left", color: T.textSub, fontWeight: 600 }}>วัน/เวลา</th>
                        <th style={{ padding: "12px", textAlign: "center", color: T.textSub, fontWeight: 600 }}>น้ำหนัก (กก.)</th>
                        <th style={{ padding: "12px", textAlign: "center", color: T.textSub, fontWeight: 600 }}>ส่วนสูง (ซม.)</th>
                        <th style={{ padding: "12px", textAlign: "left", color: T.textSub, fontWeight: 600 }}>การแพ้อาหาร</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileHistoryData.map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: idx < profileHistoryData.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
                          <td style={{ padding: "12px", color: T.text }}>
                            {new Date(row.createdAt).toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: T.text, fontWeight: 500 }}>
                            {row.weightKg || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center", color: T.text, fontWeight: 500 }}>
                            {row.heightCm || "-"}
                          </td>
                          <td style={{ padding: "12px", color: T.rose, fontSize: 12 }}>
                            {row.healthInfo && row.healthInfo !== "EMPTY" ? row.healthInfo : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer ของ Modal */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, background: T.borderLight, color: T.text, border: "none", cursor: "pointer", fontWeight: 600 }}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}