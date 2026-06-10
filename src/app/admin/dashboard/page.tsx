"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Doctor = {
  doctor_id: string; org_code: string; first_name: string;
  last_name: string; username: string; email: string | null;
  position: string | null; // ✅ เพิ่ม position
};
type DoctorPayload = {
  org_code: string; first_name: string; last_name: string;
  username: string; email: string; citizen_id?: string; position?: string;
};

const inputBase: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", background: "#f8fafc",
  color: "#1e293b", fontSize: 14, outline: "none",
  transition: "border-color 0.2s, background 0.2s", boxSizing: "border-box",
};

function SI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ ...inputBase, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; props.onFocus?.(e); }}
      onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; props.onBlur?.(e); }}
    />
  );
}

function Field({ label, hint, required: req, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
        {label}
        {req && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [adminOrgCode, setAdminOrgCode] = useState<string>("");
  const [adminOrgName, setAdminOrgName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "ok" | "error">("idle");
  const [usernameErrorDetail, setUsernameErrorDetail] = useState("");
  const [form, setForm] = useState({ first_name: "", last_name: "", citizen_id: "", username: "", email: "" });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // ✅ เพิ่ม position ใน editForm
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", position: "" });

  function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem("token");
    return { "Authorization": `Bearer ${token}`, ...extraHeaders };
  }

  useEffect(() => { fetchAdminProfile(); }, []);

  async function fetchAdminProfile() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() });
      if (res.ok) {
        const adminData = await res.json();
        setAdminName(`${adminData.first_name} ${adminData.last_name}`);
        setAdminOrgCode(adminData.org_code);
        if (adminData.org_code) {
          fetchOrgName(adminData.org_code);
          fetchDoctorsOfOrg(adminData.org_code);
        }
      } else if (res.status === 401) {
        console.warn("Token หมดอายุหรือไม่ได้เข้าสู่ระบบ");
      }
    } catch (e) { console.error("โหลดข้อมูลแอดมินไม่สำเร็จ", e); }
  }

  async function fetchOrgName(code: string) {
    try {
      const res = await fetch(`${API_URL}/organizations/${code}`, { headers: getAuthHeaders() });
      if (res.ok) { const d = await res.json(); setAdminOrgName(d.name); }
    } catch (e) { console.error(e); }
  }

  async function fetchDoctorsOfOrg(orgCode: string) {
    try {
      const res = await fetch(`${API_URL}/admins/doctors?org_code=${orgCode}`, { headers: getAuthHeaders() });
      if (res.ok) { const data = await res.json(); setDoctors(data.doctors || []); }
    } catch (e) { console.error(e); }
  }

  async function handleCheckUsername() {
    const username = form.username.trim();
    const org_code = adminOrgCode;
    if (!username) { alert("กรุณากรอก Username ก่อน"); return; }
    setCheckingUsername(true);
    setUsernameStatus("idle");
    setUsernameErrorDetail("");
    try {
      const res = await fetch(`${API_URL}/admins/doctors/check-username?username=${username}&org_code=${org_code}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.is_available === true) {
        setUsernameStatus("ok");
      } else {
        setUsernameStatus("error");
        setUsernameErrorDetail(data.detail);
        alert(data.detail || "Username นี้ถูกใช้งานแล้ว");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการตรวจสอบ Username");
      setUsernameStatus("error");
    } finally { setCheckingUsername(false); }
  }

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    const cd = form.citizen_id.replace(/\D/g, "");
    if (cd.length !== 13) { alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก"); return; }
    if (!form.email) { alert("กรุณากรอกอีเมลแพทย์เพื่อระบบจะส่งลิงก์ตั้งรหัสผ่าน"); return; }
    if (usernameStatus !== "ok") { alert("กรุณาตรวจสอบ Username ว่าสามารถใช้งานได้ก่อน"); return; }
    if (!adminOrgCode) { alert("ไม่พบรหัสหน่วยงานของแอดมิน กรุณาลองใหม่อีกครั้ง"); return; }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admins/doctors`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ org_code: adminOrgCode, first_name: form.first_name, last_name: form.last_name, citizen_id: cd, username: form.username, email: form.email }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || "เพิ่มแพทย์ไม่สำเร็จ"); return; }
      alert("✅ เพิ่มข้อมูลแพทย์สำเร็จ!");
      setForm({ first_name: "", last_name: "", citizen_id: "", username: "", email: "" });
      setUsernameStatus("idle");
      setUsernameErrorDetail("");
      fetchDoctorsOfOrg(adminOrgCode);
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
    finally { setLoading(false); }
  }

  function handleEditClick(doc: Doctor) {
    setEditingId(doc.doctor_id);
    // ✅ โหลด position เข้า editForm ด้วย
    setEditForm({ first_name: doc.first_name, last_name: doc.last_name, email: doc.email || "", position: doc.position || "" });
    setIsEditModalOpen(true);
  }

  function handleCloseModal() {
    setIsEditModalOpen(false);
    setEditingId(null);
    setEditForm({ first_name: "", last_name: "", email: "", position: "" });
  }

  async function handleUpdateDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admins/doctors/${editingId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          org_code: adminOrgCode,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          position: editForm.position, // ✅ ส่ง position ไปด้วย
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || "แก้ไขไม่สำเร็จ"); return; }
      alert("✅ แก้ไขข้อมูลสำเร็จ!");
      handleCloseModal();
      fetchDoctorsOfOrg(adminOrgCode);
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`ยืนยันลบ "${name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`${API_URL}/admins/doctors/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) { alert("ลบไม่สำเร็จ"); return; }
      setDoctors(d => d.filter(x => x.doctor_id !== id));
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
  }

  const filtered = doctors.filter(d =>
    d.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avatarColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9", "#06b6d4"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>🏥</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                {adminOrgName ? adminOrgName : "กำลังโหลดข้อมูลหน่วยงาน..."}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                ผู้ดูแลระบบ: <span style={{ color: "#3b82f6" }}>{adminName || "Admin"}</span> (รหัสหน่วยงาน: {adminOrgCode || "—"})
              </p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            ออกจากระบบ
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Add Form ── */}
          <div style={{ borderRadius: 18, padding: "20px", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 3, height: 18, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>เพิ่มบุคลากรทางการแพทย์</h2>
            </div>
            <form onSubmit={handleAddDoctor} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="ชื่อ" required><SI required placeholder="ชื่อ" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></Field>
                <Field label="นามสกุล" required><SI required placeholder="นามสกุล" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></Field>
              </div>
              <Field label="เลขบัตรประชาชน" required><SI required maxLength={13} placeholder="13 หลัก" inputMode="numeric" value={form.citizen_id} onChange={e => setForm(p => ({ ...p, citizen_id: e.target.value }))} /></Field>
              <Field label="Username" required>
                <div style={{ display: "flex", gap: 8 }}>
                  <SI required placeholder="ภาษาอังกฤษ" value={form.username}
                    style={{ flex: 1, borderColor: usernameStatus === "ok" ? "#22c55e" : usernameStatus === "error" ? "#ef4444" : "#e2e8f0" }}
                    onChange={e => { setForm(p => ({ ...p, username: e.target.value })); setUsernameStatus("idle"); setUsernameErrorDetail(""); }} />
                  <button type="button" onClick={handleCheckUsername} disabled={checkingUsername || !form.username}
                    style={{
                      padding: "0 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s",
                      cursor: checkingUsername || !form.username ? "not-allowed" : "pointer",
                      opacity: checkingUsername || !form.username ? 0.5 : 1,
                      border: usernameStatus === "ok" ? "1.5px solid #22c55e" : "1.5px solid #fecaca",
                      background: usernameStatus === "ok" ? "#f0fdf4" : "#fef2f2",
                      color: usernameStatus === "ok" ? "#16a34a" : "#ef4444"
                    }}>
                    {checkingUsername ? "..." : "ตรวจสอบ"}
                  </button>
                </div>
                {usernameStatus === "ok" && <span style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>✅ สามารถใช้งาน Username นี้ได้</span>}
                {usernameStatus === "error" && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>❌ {usernameErrorDetail || "Username นี้ถูกใช้งานแล้ว"}</span>}
              </Field>
              <Field label="อีเมล" required>
                <SI required type="email" placeholder="doctor@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "11px", marginTop: 4, borderRadius: 11, border: "none", fontSize: 14, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#93c5fd" : "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: loading ? "none" : "0 4px 14px rgba(59,130,246,0.3)", transition: "all 0.2s" }}>
                {loading ? "กำลังบันทึก..." : "+ บันทึกข้อมูลบุคลากร"}
              </button>
            </form>
          </div>

          {/* ── Doctor List ── */}
          <div style={{ borderRadius: 18, padding: "20px", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 18, borderRadius: 99, background: "linear-gradient(180deg,#3b82f6,#1d4ed8)" }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>รายชื่อบุคลากรในหน่วยงานของคุณ</h2>
                <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#eff6ff", color: "#3b82f6", fontWeight: 600, border: "1px solid #bfdbfe" }}>{filtered.length} คน</span>
              </div>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input placeholder="ค้นหาชื่อ..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inputBase, width: 210, paddingLeft: 32, fontSize: 13 }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }} />
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                    {/* ✅ เพิ่มคอลัมน์ตำแหน่ง */}
                    {["#", "ชื่อ-นามสกุล", "ตำแหน่ง", "Username", "อีเมล", "จัดการ"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: i === 0 || i === 5 ? "center" : "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 32, opacity: 0.3 }}>👨‍⚕️</span>
                        <span>{searchQuery ? "ไม่พบบุคลากรที่ค้นหา" : "ยังไม่มีรายชื่อบุคลากรในหน่วยงานนี้"}</span>
                      </div>
                    </td></tr>
                  ) : filtered.map((doc, i) => {
                    const u = doc.username.startsWith(doc.org_code) ? doc.username.slice(doc.org_code.length) : doc.username;
                    const color = avatarColors[i % avatarColors.length];
                    return (
                      <tr key={doc.doctor_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#cbd5e1", fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {doc.first_name[0]}{doc.last_name[0]}
                            </div>
                            <span style={{ color: "#1e293b", fontWeight: 500 }}>{doc.first_name} {doc.last_name}</span>
                          </div>
                        </td>
                        {/* ✅ แสดงตำแหน่ง */}
                        <td style={{ padding: "10px 12px" }}>
                          {doc.position ? (
                            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#eff6ff", color: "#3b82f6", fontWeight: 600, border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
                              {doc.position}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>{u}</td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{doc.email || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                            <button onClick={() => handleEditClick(doc)}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #fde68a", background: "#fffbeb", color: "#b45309", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
                              onMouseLeave={e => e.currentTarget.style.background = "#fffbeb"}>
                              แก้ไข
                            </button>
                            <button onClick={() => handleDelete(doc.doctor_id, `${doc.first_name} ${doc.last_name}`)}
                              style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                              onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fffbeb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 3, height: 18, borderRadius: 99, background: "linear-gradient(180deg,#f59e0b,#d97706)" }} />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#92400e" }}>แก้ไขข้อมูลบุคลากร</h2>
              </div>
              <button onClick={handleCloseModal}
                style={{ width: 28, height: 28, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", fontSize: 16, fontWeight: 700 }}>
                ×
              </button>
            </div>
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              <form id="editForm" onSubmit={handleUpdateDoctor} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="ชื่อ" required><SI required value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} /></Field>
                  <Field label="นามสกุล" required><SI required value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} /></Field>
                </div>
                {/* ✅ ช่องแก้ไขตำแหน่ง */}
                <Field label="ตำแหน่ง" hint="(เช่น แพทย์, พยาบาล, นักโภชนาการ)">
                  <SI placeholder="ระบุตำแหน่ง" value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))} />
                </Field>
                <Field label="อีเมล" required>
                  <SI required type="email" placeholder="doctor@example.com" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                </Field>
              </form>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafafa" }}>
              <button type="button" onClick={handleCloseModal}
                style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                ยกเลิก
              </button>
              <button type="submit" form="editForm" disabled={loading}
                style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: loading ? "#fcd34d" : "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 12px rgba(245,158,11,0.35)", transition: "all 0.2s" }}>
                {loading ? "กำลังอัปเดต..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}