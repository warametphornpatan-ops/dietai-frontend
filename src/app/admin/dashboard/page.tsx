/* 
  ✅ ที่เปลี่ยน:
  1. เพิ่ม state: const [selectedApplication, setSelectedApplication] = useState<DoctorApplication | null>(null);
  2. เปลี่ยน pending applications section จาก GRID/CARD มาเป็น TABLE
  3. ตารางมีคอลัมน์: #, ชื่อ-นามสกุล, ตำแหน่ง, อีเมล, สถานะ Email, จัดการ
  4. คลิกที่ชื่อ หรือปุ่ม "ตรวจสอบ" จะแสดง MODAL
  5. ปุ่ม "อนุมัติ" และ "ปฏิเสธ" อยู่ใน MODAL
*/

"use client";

import { validateThaiID } from "@/lib/validateThaiID";
import { getPendingApplications, approveDoctorApplication, rejectDoctorApplication, type DoctorApplication } from "@/lib/supabase-applications-helpers";
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

type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
};

type SupportRequestRow = {
  id: number;
  contact_info: string;
  name: string;
  details: string;
  created_at: string;
  status: "pending" | "resolved";
};

type AdminResponse = {
  id: string;
  admin_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  org_code: string;
  username: string;
};

type AdminListItem = {
  id: string;
  org_code: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
};

type DoctorListItem = {
  doctor_id: string;
  org_code: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  position: string | null;
};

type AdminsListResponse = {
  admins: AdminListItem[];
};

type DoctorsListResponse = {
  doctors: DoctorListItem[];
};

type SupportRequestsResponse = {
  requests: SupportRequestRow[];
};

type OrgResponse = {
  code: string;
  name: string;
};

type UserAccountItem = {
  id: string;
  name: string;
  username: string;
  email: string;
};

type UsersListResponse = {
  users: UserAccountItem[];
  total: number;
};

type AdminForm = {
  first_name: string;
  last_name: string;
  citizen_id: string;
  username: string;
  email: string;
};

type EditStaffForm = {
  first_name: string;
  last_name: string;
  email: string;
  position: string;
};

type EditUserForm = {
  name: string;
  email: string;
};

type AdminProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
};

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  borderRadius: 10,
  border: "1.5px solid #e2e8f0",
  background: "#f8fafc",
  color: "#1e293b",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s, background 0.2s",
  boxSizing: "border-box",
};

function SI(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputBase, ...props.style }}
      onFocus={e => {
        e.currentTarget.style.borderColor = "#3b82f6";
        e.currentTarget.style.background = "#eff6ff";
        props.onFocus?.(e);
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = "#e2e8f0";
        e.currentTarget.style.background = "#f8fafc";
        props.onBlur?.(e);
      }}
    />
  );
}

function Field({ label, hint, required: req, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
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

function validateThaiIDRealtime(id: string): { status: "idle" | "ok" | "error"; message: string } {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 0) return { status: "idle", message: "" };
  if (digits.length < 13) return { status: "error", message: "กรุณากรอกเลขบัตรให้ครบ 13 หลัก" };

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  if (check === parseInt(digits[12])) {
    return { status: "ok", message: "✅ เลขบัตรประชาชนถูกต้อง" };
  } else {
    return { status: "error", message: "❌ เลขบัตรประชาชนไม่ถูกต้อง" };
  }
}

export default function AdminDashboardPage() {
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [pendingApplications, setPendingApplications] = useState<DoctorApplication[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [adminOrgCode, setAdminOrgCode] = useState<string>("");
  const [adminOrgName, setAdminOrgName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminId, setAdminId] = useState<string>("");

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "ok" | "error">("idle");
  const [usernameErrorDetail, setUsernameErrorDetail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [citizenIdValidation, setCitizenIdValidation] = useState<{ status: "idle" | "ok" | "error"; message: string }>({ status: "idle", message: "" });

  const [form, setForm] = useState<AdminForm>({
    first_name: "",
    last_name: "",
    citizen_id: "",
    username: "",
    email: "",
  });

  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [editStaffForm, setEditStaffForm] = useState<EditStaffForm>({
    first_name: "",
    last_name: "",
    email: "",
    position: "",
  });
  const [editStaffLoading, setEditStaffLoading] = useState(false);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    name: "",
    email: "",
  });
  const [editUserLoading, setEditUserLoading] = useState(false);

  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
  const [adminProfileForm, setAdminProfileForm] = useState<AdminProfileForm>({
    first_name: "",
    last_name: "",
    email: "",
  });
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);

  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [resolvingRequestId, setResolvingRequestId] = useState<number | null>(null);
  
  // ✅ NEW: สำหรับ modal แสดงรายละเอียด pending application
  const [selectedApplication, setSelectedApplication] = useState<DoctorApplication | null>(null);

  function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem("token");
    return { "Authorization": `Bearer ${token}`, ...extraHeaders };
  }

  useEffect(() => { fetchAdminProfile(); }, []);

  async function fetchAdminProfile() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() });
      if (res.ok) {
        const adminData: AdminResponse = await res.json();
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
          fetchAllUsersData(adminData.org_code);
          fetchPendingApplications(adminData.org_code);
          fetchSupportRequests(adminData.org_code);
        }
      } else if (res.status === 401) {
        console.warn("Token หมดอายุหรือไม่ได้เข้าสู่ระบบ");
      }
    } catch (e) {
      console.error("โหลดข้อมูลแอดมินไม่สำเร็จ", e);
    }
  }

  async function fetchOrgName(code: string) {
    try {
      const res = await fetch(`${API_URL}/api/organizations/${code}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const d: OrgResponse = await res.json();
        setAdminOrgName(d.name);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAllStaff(orgCode: string) {
    try {
      const [adminsRes, doctorsRes] = await Promise.all([
        fetch(`${API_URL}/api/admins/list?org_code=${orgCode}`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/admins/doctors?org_code=${orgCode}`, { headers: getAuthHeaders() }),
      ]);

      const adminsData: AdminsListResponse = adminsRes.ok ? await adminsRes.json() : { admins: [] };
      const doctorsData: DoctorsListResponse = doctorsRes.ok ? await doctorsRes.json() : { doctors: [] };

      const adminRows: StaffRow[] = (adminsData.admins || []).map((a: AdminListItem) => ({
        id: a.id,
        org_code: a.org_code,
        first_name: a.first_name,
        last_name: a.last_name,
        username: a.username,
        email: a.email,
        position: "ผู้ดูแลระบบ",
        role: "admin" as const,
      }));

      const doctorRows: StaffRow[] = (doctorsData.doctors || []).map((d: DoctorListItem) => ({
        id: d.doctor_id,
        org_code: d.org_code,
        first_name: d.first_name,
        last_name: d.last_name,
        username: d.username,
        email: d.email,
        position: d.position || null,
        role: "doctor" as const,
      }));

      setStaffList([...adminRows, ...doctorRows]);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAllUsersData(orgCode: string) {
    try {
      const res = await fetch(`${API_URL}/api/admins/list-all-users`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data: UsersListResponse = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (e) {
      console.error("โหลดข้อมูล users ไม่สำเร็จ", e);
    }
  }

  async function fetchPendingApplications(orgCode: string) {
    try {
      const result = await getPendingApplications(orgCode);
      if (result.success) {
        setPendingApplications(result.data);
      }
    } catch (e) {
      console.error("โหลด pending applications ไม่สำเร็จ", e);
    }
  }

  async function fetchSupportRequests(orgCode: string) {
    try {
      const res = await fetch(`${API_URL}/api/admins/support-requests?org_code=${orgCode}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data: SupportRequestsResponse = await res.json();
        setSupportRequests(data.requests || []);
      }
    } catch (e) {
      console.error("โหลดข้อมูลแจ้งปัญหาไม่สำเร็จ", e);
    }
  }

  async function handleResolveRequest(requestId: number) {
    if (!confirm("ยืนยันว่าติดต่อกลับและแก้ไขปัญหาคำร้องเรียนนี้เรียบร้อยแล้ว?")) return;

    setResolvingRequestId(requestId);
    try {
      const res = await fetch(`${API_URL}/api/admins/support-requests/${requestId}/resolve`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        alert("✅ อัปเดตสถานะคำร้องเรียนสำเร็จ");
        setSupportRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        alert("❌ ไม่สามารถอัปเดตสถานะได้");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setResolvingRequestId(null);
    }
  }

  async function handleCheckUsername() {
    const username = form.username.trim();
    if (!username) {
      alert("กรุณากรอก Username");
      return;
    }
    setCheckingUsername(true);
    setUsernameStatus("idle");
    setUsernameErrorDetail("");
    try {
      const res = await fetch(`${API_URL}/api/admins/doctors/check-username?username=${username}`, { headers: getAuthHeaders() });
      const data: { is_available?: boolean; detail?: string } = await res.json();
      if (res.ok && data.is_available === true) {
        setUsernameStatus("ok");
      } else {
        setUsernameStatus("error");
        setUsernameErrorDetail(data.detail || "Username นี้ถูกใช้งานแล้ว");
      }
    } catch {
      setUsernameStatus("error");
      setUsernameErrorDetail("เกิดข้อผิดพลาดในการตรวจสอบ");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const result = validateThaiID(form.citizen_id);
    if (!result.isValid) {
      setFieldErrors(p => ({ ...p, citizen_id: result.message }));
      return;
    }
    const cd = form.citizen_id.replace(/\D/g, "");
    if (cd.length !== 13) {
      alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
      return;
    }
    if (citizenIdValidation.status !== "ok") {
      alert("กรุณากรอกเลขบัตรประชาชนให้ถูกต้องก่อน");
      return;
    }
    if (!form.email) {
      alert("กรุณากรอกอีเมล");
      return;
    }
    if (usernameStatus !== "ok") {
      alert("กรุณาตรวจสอบ Username ก่อน");
      return;
    }
    if (!adminOrgCode) {
      alert("ไม่พบรหัสหน่วยงาน");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admins/register`, {
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
      if (!res.ok) {
        const d: { detail?: string } = await res.json();
        alert(d.detail || "เพิ่มผู้ดูแลระบบไม่สำเร็จ");
        return;
      }
      alert("✅ เพิ่มผู้ดูแลระบบสำเร็จ! ระบบได้ส่งอีเมลคำเชิญให้ตั้งรหัสผ่านเรียบร้อยแล้ว");
      setForm({ first_name: "", last_name: "", citizen_id: "", username: "", email: "" });
      setFieldErrors({});
      setCitizenIdValidation({ status: "idle", message: "" });
      setUsernameStatus("idle");
      setUsernameErrorDetail("");
      fetchAllStaff(adminOrgCode);
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEditStaff(row: StaffRow) {
    setEditingStaff(row);
    setEditStaffForm({
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email || "",
      position: row.position || "",
    });
  }

  function handleCloseEditStaff() {
    setEditingStaff(null);
    setEditStaffForm({ first_name: "", last_name: "", email: "", position: "" });
  }

  async function handleSaveEditStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editStaffForm.first_name.trim() || !editStaffForm.last_name.trim() || !editStaffForm.email.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setEditStaffLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admins/doctors/${editingStaff.id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          org_code: adminOrgCode,
          first_name: editStaffForm.first_name.trim(),
          last_name: editStaffForm.last_name.trim(),
          email: editStaffForm.email.trim(),
          username: editingStaff.username,
          position: editStaffForm.position.trim(),
        }),
      });

      if (!res.ok) {
        const d: { detail?: string } = await res.json();
        alert(d.detail || "แก้ไขข้อมูลไม่สำเร็จ");
        return;
      }

      alert("✅ แก้ไขข้อมูลสำเร็จ");
      handleCloseEditStaff();
      fetchAllStaff(adminOrgCode);
    } catch (e) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      console.error(e);
    } finally {
      setEditStaffLoading(false);
    }
  }

  function handleOpenEditUser(user: UserRow) {
    setEditingUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
    });
  }

  function handleCloseEditUser() {
    setEditingUser(null);
    setEditUserForm({ name: "", email: "" });
  }

  async function handleSaveEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    const body: Record<string, string> = {};
    if (editUserForm.name.trim()) body.name = editUserForm.name.trim();
    if (editUserForm.email.trim()) body.email = editUserForm.email.trim();

    if (Object.keys(body).length === 0) {
      alert("กรุณากรอกข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 ช่อง");
      return;
    }

    setEditUserLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d: { detail?: string } = await res.json();
        alert(d.detail || "แก้ไขข้อมูลไม่สำเร็จ");
        return;
      }
      alert("✅ แก้ไขข้อมูลสำเร็จ");
      handleCloseEditUser();
      fetchAllUsersData(adminOrgCode);
    } catch (e) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setEditUserLoading(false);
    }
  }

  function handleOpenAdminProfile() {
    setShowAdminProfileModal(true);
  }

  function handleCloseAdminProfile() {
    setShowAdminProfileModal(false);
  }

  async function handleSaveAdminProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!adminProfileForm.first_name.trim() || !adminProfileForm.last_name.trim() || !adminProfileForm.email.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setAdminProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admins/profile/${adminId}`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          first_name: adminProfileForm.first_name.trim(),
          last_name: adminProfileForm.last_name.trim(),
          email: adminProfileForm.email.trim(),
        }),
      });

      if (!res.ok) {
        const d: { detail?: string } = await res.json();
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

  async function handleDeleteStaff(row: StaffRow) {
    if (row.role === "admin" && row.id === adminId) {
      alert("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }

    if (!confirm(`ยืนยันลบ "${row.first_name} ${row.last_name}" ออกจากระบบ?`)) return;

    const url = row.role === "admin"
      ? `${API_URL}/api/admins/${row.id}`
      : `${API_URL}/api/admins/doctors/${row.id}`;

    try {
      const res = await fetch(url, { method: "DELETE", headers: getAuthHeaders() });
      if (!res.ok) {
        const d: { detail?: string } = await res.json().catch(() => ({}));
        alert(d.detail || "ลบไม่สำเร็จ");
        return;
      }
      setStaffList(s => s.filter(x => !(x.id === row.id && x.role === row.role)));
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }

  async function handleDeleteUser(user: UserRow) {
    if (!confirm(`ยืนยันลบ "${user.name}" ออกจากระบบ?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const d: { detail?: string } = await res.json().catch(() => ({}));
        alert(d.detail || "ลบไม่สำเร็จ");
        return;
      }
      setAllUsers(u => u.filter(x => x.id !== user.id));
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  }

  const filteredStaff = staffList.filter(s =>
    s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const avatarColors = ["#3b82f6", "#6366f1", "#0ea5e9", "#8b5cf6", "#2563eb"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 20px 48px" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        {/* ✅ HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg,#3b82f6,#2563eb)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, boxShadow: "0 4px 14px rgba(59,130,246,0.35)"
            }}>🏥</div>
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
            <button
              onClick={handleOpenAdminProfile}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#64748b", fontSize: 18, fontWeight: 500,
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.color = "#3b82f6";
                e.currentTarget.style.background = "#eff6ff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.background = "#fff";
              }}
              title="แก้ไขข้อมูลส่วนตัว">
              ⚙️
            </button>
            <button
              onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff",
                color: "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer",
                transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#fca5a5";
                e.currentTarget.style.color = "#ef4444";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.color = "#64748b";
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              ออกจากระบบ
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}>

          {/* ✅ ADD ADMIN FORM [ENTIRE SECTION STAYS THE SAME - omitted for brevity] */}

          {/* ✅ MAIN CONTENT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ✅ PENDING DOCTOR APPLICATIONS - NOW TABLE FORMAT */}
            {pendingApplications.length > 0 && (
              <div style={{ borderRadius: 18, padding: "20px", background: "#fff", border: "1.5px solid #fbbf24", boxShadow: "0 2px 12px rgba(251,191,36,0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 18, borderRadius: 99, background: "#f59e0b" }} />
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>🔔 คำขอรอการอนุมัติ</h2>
                  <span style={{ marginLeft: "auto", fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "#fef3c7", color: "#b45309", fontWeight: 600, border: "1px solid #fcd34d" }}>{pendingApplications.length} คน</span>
                </div>

                {/* ✅ TABLE FORMAT */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fffbeb", borderBottom: "1.5px solid #fcd34d" }}>
                        {["#", "ชื่อ-นามสกุล", "ตำแหน่ง", "อีเมล", "สถานะ Email", "จัดการ"].map((h, i) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: i === 0 || i === 5 ? "center" : "left", fontWeight: 600, color: "#92400e", whiteSpace: "nowrap", fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingApplications.map((app, i) => {
                        const color = avatarColors[i % avatarColors.length];
                        return (
                          <tr key={app.id} style={{ borderBottom: "1px solid #fef3c7", transition: "background 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#cbd5e1", fontSize: 12 }}>{i + 1}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                  {app.first_name[0]}{app.last_name[0]}
                                </div>
                                <span
                                  onClick={() => setSelectedApplication(app)}
                                  style={{ color: "#1e293b", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}>
                                  {app.first_name} {app.last_name}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px", color: "#64748b" }}>
                              {app.position || "ไม่ระบุ"}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 12 }}>
                              {app.email}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 600, whiteSpace: "nowrap",
                                background: app.email_verified ? "#f0fdf4" : "#fef2f2",
                                color: app.email_verified ? "#16a34a" : "#dc2626",
                                border: `1px solid ${app.email_verified ? "#bbf7d0" : "#fecaca"}`,
                              }}>
                                {app.email_verified ? "✅ ยืนยันแล้ว" : "⏳ รอยืนยัน"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <button
                                onClick={() => setSelectedApplication(app)}
                                style={{ padding: "5px 12px", borderRadius: 7, border: "1.5px solid #fbbf24", background: "#fffbeb", color: "#b45309", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
                                onMouseLeave={e => e.currentTarget.style.background = "#fffbeb"}>
                                ตรวจสอบ
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ✅ STAFF LIST [STAYS THE SAME - omitted for brevity] */}
            {/* ✅ USERS LIST [STAYS THE SAME - omitted for brevity] */}
            {/* ✅ SUPPORT REQUESTS [STAYS THE SAME - omitted for brevity] */}

          </div>
        </div>
      </div>

      {/* ✅ MODAL: PENDING APPLICATION DETAILS */}
      {selectedApplication && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setSelectedApplication(null)}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, maxWidth: 500, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                {selectedApplication.first_name[0]}{selectedApplication.last_name[0]}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {selectedApplication.first_name} {selectedApplication.last_name}
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                  {selectedApplication.position || "ตำแหน่งไม่ระบุ"}
                </p>
              </div>
            </div>

            {/* Details Section */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, padding: "16px", background: "#f8fafc", borderRadius: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block" }}>อีเมล</label>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{selectedApplication.email}</p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block" }}>เลขบัตรประชาชน</label>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{selectedApplication.citizen_id}</p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block" }}>สถานะ Email</label>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    fontSize: 11, padding: "4px 12px", borderRadius: 99, fontWeight: 600, display: "inline-block",
                    background: selectedApplication.email_verified ? "#f0fdf4" : "#fef2f2",
                    color: selectedApplication.email_verified ? "#16a34a" : "#dc2626",
                    border: `1px solid ${selectedApplication.email_verified ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {selectedApplication.email_verified ? "✅ ยืนยันแล้ว" : "⏳ รอยืนยัน"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={async () => {
                  if (!confirm(`ยืนยันการอนุมัติ "${selectedApplication.first_name} ${selectedApplication.last_name}" หรือไม่?`)) return;
                  setApprovingId(selectedApplication.id);
                  try {
                    const result = await approveDoctorApplication(selectedApplication.id);
                    if (result.success) {
                      alert("✅ อนุมัติแพทย์สำเร็จ");
                      setPendingApplications(p => p.filter(x => x.id !== selectedApplication.id));
                      setSelectedApplication(null);
                      if (adminOrgCode) fetchAllStaff(adminOrgCode);
                    } else {
                      alert("❌ อนุมัติไม่สำเร็จ: " + result.error);
                    }
                  } catch (e) {
                    alert("เกิดข้อผิดพลาด: " + (e instanceof Error ? e.message : "Unknown error"));
                  } finally {
                    setApprovingId(null);
                  }
                }}
                disabled={approvingId === selectedApplication.id || rejectingId === selectedApplication.id}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: approvingId === selectedApplication.id ? "#cbd5e1" : "#10b981",
                  cursor: approvingId === selectedApplication.id || rejectingId === selectedApplication.id ? "not-allowed" : "pointer",
                  opacity: approvingId === selectedApplication.id || rejectingId === selectedApplication.id ? 0.7 : 1, transition: "all 0.2s"
                }}>
                {approvingId === selectedApplication.id ? "กำลัง..." : "✅ อนุมัติ"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`ยืนยันการปฏิเสธ "${selectedApplication.first_name} ${selectedApplication.last_name}" หรือไม่?`)) return;
                  setRejectingId(selectedApplication.id);
                  try {
                    const result = await rejectDoctorApplication(selectedApplication.id);
                    if (result.success) {
                      alert("✅ ปฏิเสธแพทย์สำเร็จ");
                      setPendingApplications(p => p.filter(x => x.id !== selectedApplication.id));
                      setSelectedApplication(null);
                    } else {
                      alert("❌ ปฏิเสธไม่สำเร็จ: " + result.error);
                    }
                  } catch (e) {
                    alert("เกิดข้อผิดพลาด: " + (e instanceof Error ? e.message : "Unknown error"));
                  } finally {
                    setRejectingId(null);
                  }
                }}
                disabled={approvingId === selectedApplication.id || rejectingId === selectedApplication.id}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600,
                  color: "#fff", background: rejectingId === selectedApplication.id ? "#cbd5e1" : "#ef4444",
                  cursor: approvingId === selectedApplication.id || rejectingId === selectedApplication.id ? "not-allowed" : "pointer",
                  opacity: approvingId === selectedApplication.id || rejectingId === selectedApplication.id ? 0.7 : 1, transition: "all 0.2s"
                }}>
                {rejectingId === selectedApplication.id ? "กำลัง..." : "❌ ปฏิเสธ"}
              </button>
              <button
                onClick={() => setSelectedApplication(null)}
                disabled={approvingId === selectedApplication.id || rejectingId === selectedApplication.id}
                style={{
                  flex: 0.8, padding: "10px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontWeight: 600,
                  color: "#64748b", background: "#f8fafc", cursor: "pointer", transition: "all 0.2s",
                  opacity: approvingId === selectedApplication.id || rejectingId === selectedApplication.id ? 0.5 : 1
                }}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ OTHER MODALS [EDIT STAFF, EDIT USER, EDIT ADMIN PROFILE - ALL STAY THE SAME] */}
    </div>
  );
}