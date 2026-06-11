"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type StaffRow = {
  id: string;
  org_code: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string | null;
  position: string | null;
  role: "admin" | "doctor";
};

type AdminForm = {
  first_name: string; last_name: string; citizen_id: string;
  username: string; email: string;
};

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
};

// ✅ Form สำหรับแก้ไข admin ตัวเอง
type AdminProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
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
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [adminOrgCode, setAdminOrgCode] = useState<string>("");
  const [adminOrgName, setAdminOrgName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminId, setAdminId] = useState<string>("");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "ok" | "error">("idle");
  const [usernameErrorDetail, setUsernameErrorDetail] = useState("");

  const [form, setForm] = useState<AdminForm>({
    first_name: "", last_name: "", citizen_id: "",
    username: "", email: "",
  });

  const [editingRow, setEditingRow] = useState<StaffRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    first_name: "", last_name: "", email: "",
  });
  const [editLoading, setEditLoading] = useState(false);

  // ✅ State สำหรับแก้ไข Admin Profile (ตัวเอง)
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
  const [adminProfileForm, setAdminProfileForm] = useState<AdminProfileForm>({
    first_name: "", last_name: "", email: "",
  });
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);

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
        setAdminId(adminData.admin_id || adminData.id);
        setAdminName(`${adminData.first_name} ${adminData.last_name}`);
        setAdminOrgCode(adminData.org_code);
        setAdminProfileForm({
          first_name: adminData.first_name,
          last_name: adminData.last_name,
          email: adminData.email || "",
        });
        if (adminData.org_code) {
          fetchOrgName(adminData.org_code);
          fetchAllStaff(adminData.org_code);
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

  async function fetchAllStaff(orgCode: string) {
    try {
      const [adminsRes, doctorsRes] = await Promise.all([
        fetch(`${API_URL}/admins/list?org_code=${orgCode}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/admins/doctors?org_code=${orgCode}`, { headers: getAuthHeaders() }),
      ]);

      const adminsData = adminsRes.ok ? await adminsRes.json() : { admins: [] };
      const doctorsData = doctorsRes.ok ? await doctorsRes.json() : { doctors: [] };

      const adminRows: StaffRow[] = (adminsData.admins || []).map((a: {
        id: string; org_code: string; first_name: string;
        last_name: string; username: string; email: string;
      }) => ({
        id: a.id, org_code: a.org_code, first_name: a.first_name,
        last_name: a.last_name, username: a.username, email: a.email,
        position: "ผู้ดูแลระบบ", role: "admin" as const,
      }));

      const doctorRows: StaffRow[] = (doctorsData.doctors || []).map((d: {
        doctor_id: string; org_code: string; first_name: string;
        last_name: string; username: string; email: string; position: string | null;
      }) => ({
        id: d.doctor_id, org_code: d.org_code, first_name: d.first_name,
        last_name: d.last_name, username: d.username, email: d.email,
        position: d.position || null, role: "doctor" as const,
      }));

      setStaffList([...adminRows, ...doctorRows]);
    } catch (e) { console.error(e); }
  }

  async function handleCheckUsername() {
    const username = form.username.trim();
    if (!username) { alert("กรุณากรอก Username "); return; }
    setCheckingUsername(true);
    setUsernameStatus("idle");
    setUsernameErrorDetail("");
    try {
      const res = await fetch(`${API_URL}/admins/doctors/check-username?username=${username}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.is_available === true) {
        setUsernameStatus("ok");
      } else {
        setUsernameStatus("error");
        setUsernameErrorDetail(data.detail || "Username นี้ถูกใช้งานแล้ว");
      }
    } catch {
      setUsernameStatus("error");
      setUsernameErrorDetail("เกิดข้อผิดพลาดในการตรวจสอบ");
    } finally { setCheckingUsername(false); }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const cd = form.citizen_id.replace(/\D/g, "");
    if (cd.length !== 13) { alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก"); return; }
    if (!form.email) { alert("กรุณากรอกอีเมล"); return; }
    if (usernameStatus !== "ok") { alert("กรุณาตรวจสอบ Username ก่อน"); return; }
    if (!adminOrgCode) { alert("ไม่พบรหัสหน่วยงาน"); return; }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admins/register`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          org_code: adminOrgCode,
          citizen_id: cd,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || "เพิ่มผู้ดูแลระบบไม่สำเร็จ"); return; }
      alert("✅ เพิ่มผู้ดูแลระบบสำเร็จ! ระบบได้ส่งอีเมลคำเชิญให้ตั้งรหัสผ่านเรียบร้อยแล้ว");
      setForm({ first_name: "", last_name: "", citizen_id: "", username: "", email: "" });
      setUsernameStatus("idle");
      setUsernameErrorDetail("");
      fetchAllStaff(adminOrgCode);
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
    finally { setLoading(false); }
  }

  function handleOpenEdit(row: StaffRow) {
    setEditingRow(row);
    setEditForm({
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email || "",
    });
  }

  function handleCloseEdit() {
    setEditingRow(null);
    setEditForm({ first_name: "", last_name: "", email: "" });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRow) return;
    if (!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`${API_URL}/admins/doctors/${editingRow.id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          org_code: adminOrgCode,
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: editForm.email.trim(),
          username: editingRow.username,
          position: editingRow.position,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "แก้ไขข้อมูลไม่สำเร็จ");
        return;
      }

      alert("✅ แก้ไขข้อมูลสำเร็จ");
      handleCloseEdit();
      fetchAllStaff(adminOrgCode);
    } catch (e) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      console.error(e);
    } finally {
      setEditLoading(false);
    }
  }

  // ✅ เปิด Admin Profile Modal
  function handleOpenAdminProfile() {
    setShowAdminProfileModal(true);
  }

  // ✅ ปิด Admin Profile Modal
  function handleCloseAdminProfile() {
    setShowAdminProfileModal(false);
  }

  // ✅ บันทึกข้อมูล Admin Profile
  async function handleSaveAdminProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!adminProfileForm.first_name.trim() || !adminProfileForm.last_name.trim() || !adminProfileForm.email.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setAdminProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/admins/profile/${adminId}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          first_name: adminProfileForm.first_name.trim(),
          last_name: adminProfileForm.last_name.trim(),
          email: adminProfileForm.email.trim(),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        alert(d.detail || "แก้ไขข้อมูลไม่สำเร็จ");
        return;
      }

      alert("✅ แก้ไขข้อมูลสำเร็จ");
      setAdminName(`${adminProfileForm.first_name} ${adminProfileForm.last_name}`);
      handleCloseAdminProfile();
    } catch (e) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      console.error(e);
    } finally {
      setAdminProfileLoading(false);
    }
  }

  async function handleDelete(row: StaffRow) {
    if (row.role === "admin") {
      alert("ไม่สามารถลบผู้ดูแลระบบจากหน้านี้ได้");
      return;
    }
    if (!confirm(`ยืนยันลบ "${row.first_name} ${row.last_name}" ออกจากระบบ?`)) return;
    try {
      const res = await fetch(`${API_URL}/admins/doctors/${row.id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) { alert("ลบไม่สำเร็จ"); return; }
      setStaffList(s => s.filter(x => x.id !== row.id));
    } catch { alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"); }
  }

  const filtered = staffList.filter(s =>
    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avatarColors = ["#3b82f6", "#6366f1", "#8b5cf6", "#0ea5e9", "#06b6d4"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>🏥</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
                {adminOrgName || "กำลังโหลดข้อมูลหน่วยงาน..."}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                ผู้ดูแลระบบ: <span style={{ color: "#3b82f6" }}>{adminName || "Admin"}</span> (รหัสหน่วยงาน: {adminOrgCode || "—"})
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* ✅ ปุ่มฟันเฟือง (Settings) */}
            <button onClick={handleOpenAdminProfile}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "#fff"; }}
              title="แก้ไขข้อมูลส่วนตัว">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m5.08-5.08l4.24-4.24" />
              </svg>
            </button>
            <button onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#fca5a5"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              ออกจากระบบ
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

          {/* ── Add Admin Form ── */}
          <div style={{ borderRadius: 18, padding: "20px", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 3, height: 18, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>เพิ่มผู้ดูแลระบบ</h2>
              <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "#eff6ff", color: "#3b82f6", fontWeight: 600, border: "1px solid #bfdbfe" }}>ADMIN</span>
            </div>
            <form onSubmit={handleAddAdmin} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="ชื่อ" required><SI required placeholder="ชื่อ" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /></Field>
                <Field label="นามสกุล" required><SI required placeholder="นามสกุล" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /></Field>
              </div>
              <Field label="เลขบัตรประชาชน" required>
                <SI required maxLength={13} placeholder="13 หลัก" inputMode="numeric"
                  value={form.citizen_id} onChange={e => setForm(p => ({ ...p, citizen_id: e.target.value.replace(/\D/g, "") }))} />
              </Field>
              <Field label="อีเมล" required hint="(ระบบจะส่งลิงก์ตั้งรหัสผ่านไปที่นี่)">
                <SI required type="email" placeholder="admin@hospital.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </Field>
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
                      color: usernameStatus === "ok" ? "#16a34a" : "#ef4444",
                    }}>
                    {checkingUsername ? "..." : "ตรวจสอบ"}
                  </button>
                </div>
                {usernameStatus === "ok" && <span style={{ fontSize: 11, color: "#15803d", marginTop: 2 }}>✅ สามารถใช้งาน Username นี้ได้</span>}
                {usernameStatus === "error" && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>❌ {usernameErrorDetail}</span>}
              </Field>

              <button type="submit" disabled={loading}
                style={{ width: "100%", padding: "11px", marginTop: 4, borderRadius: 11, border: "none", fontSize: 14, fontWeight: 700, color: "#fff", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#93c5fd" : "linear-gradient(135deg,#3b82f6,#1d4ed8)", boxShadow: loading ? "none" : "0 4px 14px rgba(59,130,246,0.3)", transition: "all 0.2s" }}>
                {loading ? "กำลังส่งคำเชิญ..." : "+ เพิ่มและส่งลิงก์ตั้งรหัสผ่าน"}
              </button>
            </form>
          </div>

          {/* ── Staff List ── */}
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
                    {["#", "ชื่อ-นามสกุล", "ตำแหน่ง", "Username", "อีเมล", "จัดการ"].map((h, i) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: i === 0 || i === 5 ? "center" : "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 32, opacity: 0.3 }}>👥</span>
                        <span>{searchQuery ? "ไม่พบบุคลากรที่ค้นหา" : "ยังไม่มีรายชื่อบุคลากรในหน่วยงานนี้"}</span>
                      </div>
                    </td></tr>
                  ) : filtered.map((row, i) => {
                    const color = avatarColors[i % avatarColors.length];
                    const isAdmin = row.role === "admin";
                    return (
                      <tr key={`${row.role}-${row.id}`} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#cbd5e1", fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {row.first_name[0]}{row.last_name[0]}
                            </div>
                            <span style={{ color: "#1e293b", fontWeight: 500 }}>{row.first_name} {row.last_name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {row.position ? (
                            <span style={{
                              fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap",
                              background: isAdmin ? "#eff6ff" : "#f0fdf4",
                              color: isAdmin ? "#3b82f6" : "#16a34a",
                              border: `1px solid ${isAdmin ? "#bfdbfe" : "#bbf7d0"}`,
                            }}>
                              {row.position}
                            </span>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#64748b" }}>{row.username}</td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{row.email || "—"}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            {!isAdmin && (
                              <button onClick={() => handleOpenEdit(row)}
                                style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #bfdbfe", background: "#eff6ff", color: "#3b82f6", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                                onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}>
                                แก้ไข
                              </button>
                            )}
                            <button onClick={() => handleDelete(row)}
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

      {/* ✅ Edit Doctor Modal */}
      {editingRow && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: 20,
        }}
          onClick={handleCloseEdit}>
          <div style={{
            background: "#fff", borderRadius: 18, padding: 28, maxWidth: 400,
            width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              แก้ไขข้อมูล {editingRow.first_name} {editingRow.last_name}
            </h2>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="ชื่อ" required>
                <SI required placeholder="ชื่อ" value={editForm.first_name}
                  onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </Field>
              <Field label="นามสกุล" required>
                <SI required placeholder="นามสกุล" value={editForm.last_name}
                  onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              </Field>
              <Field label="อีเมล" required>
                <SI required type="email" placeholder="email@example.com" value={editForm.email}
                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </Field>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={editLoading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 13,
                    fontWeight: 600, color: "#fff", cursor: editLoading ? "not-allowed" : "pointer",
                    background: editLoading ? "#93c5fd" : "#3b82f6", transition: "all 0.2s",
                  }}>
                  {editLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
                <button type="button" onClick={handleCloseEdit} disabled={editLoading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                    fontSize: 13, fontWeight: 600, color: "#64748b", background: "#f8fafc",
                    cursor: editLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
                    opacity: editLoading ? 0.5 : 1,
                  }}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Edit Admin Profile Modal */}
      {showAdminProfileModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: 20,
        }}
          onClick={handleCloseAdminProfile}>
          <div style={{
            background: "#fff", borderRadius: 18, padding: 28, maxWidth: 400,
            width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px 0", fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
              แก้ไขข้อมูลส่วนตัว
            </h2>
            <form onSubmit={handleSaveAdminProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="ชื่อ" required>
                <SI required placeholder="ชื่อ" value={adminProfileForm.first_name}
                  onChange={e => setAdminProfileForm(p => ({ ...p, first_name: e.target.value }))} />
              </Field>
              <Field label="นามสกุล" required>
                <SI required placeholder="นามสกุล" value={adminProfileForm.last_name}
                  onChange={e => setAdminProfileForm(p => ({ ...p, last_name: e.target.value }))} />
              </Field>
              <Field label="อีเมล" required>
                <SI required type="email" placeholder="email@example.com" value={adminProfileForm.email}
                  onChange={e => setAdminProfileForm(p => ({ ...p, email: e.target.value }))} />
              </Field>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="submit" disabled={adminProfileLoading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 13,
                    fontWeight: 600, color: "#fff", cursor: adminProfileLoading ? "not-allowed" : "pointer",
                    background: adminProfileLoading ? "#93c5fd" : "#3b82f6", transition: "all 0.2s",
                  }}>
                  {adminProfileLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
                <button type="button" onClick={handleCloseAdminProfile} disabled={adminProfileLoading}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0",
                    fontSize: 13, fontWeight: 600, color: "#64748b", background: "#f8fafc",
                    cursor: adminProfileLoading ? "not-allowed" : "pointer", transition: "all 0.2s",
                    opacity: adminProfileLoading ? 0.5 : 1,
                  }}>
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}