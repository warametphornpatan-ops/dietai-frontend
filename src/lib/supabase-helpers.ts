// lib/supabase-helpers.ts
import { supabase } from './supabase';
import type { Doctor, DoctorStatus } from '@/types/supabase';

// ============================================================
// 📝 DOCTOR REGISTRATION (ลงทะเบียนแพทย์ใหม่)
// ============================================================

export async function registerDoctorPending({
  org_code,
  citizen_id,
  first_name,
  last_name,
  email,
  username,
  password_hash,
  position,
}: {
  org_code: string;
  citizen_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password_hash: string;
  position: string;
}) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        org_code,
        citizen_id,
        first_name,
        last_name,
        email,
        username,
        password_hash,
        position,
        status: 'pending', // ✅ ต้องเป็น pending
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

// ============================================================
// 🔔 PENDING DOCTORS (แพทย์รอการอนุมัติ)
// ============================================================

export async function getPendingDoctors(orgCode: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('org_code', orgCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as Doctor[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending doctors',
      data: [] as Doctor[],
    };
  }
}

export async function getPendingDoctorById(doctorId: number) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .eq('status', 'pending')
      .single();

    if (error) throw error;
    return { success: true, data: data as Doctor };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Doctor not found',
    };
  }
}

// ============================================================
// ✅ APPROVE DOCTOR (อนุมัติแพทย์)
// ============================================================

export async function approveDoctorById(doctorId: number) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .update({
        status: 'approved' as DoctorStatus,
      })
      .eq('id', doctorId)
      .eq('status', 'pending') // ต้องเป็น pending
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as Doctor };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Approval failed',
    };
  }
}

// ============================================================
// ❌ REJECT DOCTOR (ปฏิเสธแพทย์)
// ============================================================

export async function rejectDoctorById(doctorId: number, reason?: string) {
  try {
    interface UpdatePayload {
      status: DoctorStatus;
      rejection_reason?: string;
    }

    const updateData: UpdatePayload = {
      status: 'rejected' as DoctorStatus,
    };

    // ถ้ามี rejection_reason column เพิ่มได้
    if (reason) {
      updateData.rejection_reason = reason;
    }

    const { data, error } = await supabase
      .from('doctors')
      .update(updateData)
      .eq('id', doctorId)
      .eq('status', 'pending') // ต้องเป็น pending
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as Doctor };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rejection failed',
    };
  }
}

// ============================================================
// 🔐 LOGIN VERIFICATION (ตรวจสอบ status ตอน login)
// ============================================================

export async function verifyDoctorCanLogin(username: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, status, first_name, last_name')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Doctor not found');
      }
      throw error;
    }

    if (data.status !== 'approved') {
      throw new Error(
        data.status === 'pending'
          ? 'ข้อมูลของคุณยังไม่ได้รับการอนุมัติ'
          : 'ข้อมูลของคุณถูกปฏิเสธ',
      );
    }

    return {
      success: true,
      data: {
        doctor_id: data.id,
        name: `${data.first_name} ${data.last_name}`,
        canLogin: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login verification failed',
    };
  }
}

// ============================================================
// 📊 STATISTICS (สถิติแพทย์)
// ============================================================

export async function getDoctorStats(orgCode: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('status')
      .eq('org_code', orgCode);

    if (error) throw error;

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: data?.length || 0,
    };

    data?.forEach((doc) => {
      if (doc.status === 'pending') stats.pending++;
      else if (doc.status === 'approved') stats.approved++;
      else if (doc.status === 'rejected') stats.rejected++;
    });

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    };
  }
}

// ============================================================
// 🔍 SEARCH & FILTER
// ============================================================

export async function searchDoctors({
  orgCode,
  status,
  searchTerm,
}: {
  orgCode: string;
  status?: DoctorStatus;
  searchTerm?: string;
}) {
  try {
    let query = supabase
      .from('doctors')
      .select('*')
      .eq('org_code', orgCode);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by search term locally
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return {
        success: true,
        data: (data || []).filter(
          (doc) =>
            doc.first_name.toLowerCase().includes(term) ||
            doc.last_name.toLowerCase().includes(term) ||
            doc.email.toLowerCase().includes(term) ||
            doc.username.toLowerCase().includes(term),
        ) as Doctor[],
      };
    }

    return { success: true, data: (data || []) as Doctor[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      data: [] as Doctor[],
    };
  }
}

// ============================================================
// 📋 GET ALL APPROVED DOCTORS (ดึงแพทย์ที่อนุมัติแล้ว)
// ============================================================

export async function getApprovedDoctors(orgCode: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('org_code', orgCode)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as Doctor[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch approved doctors',
      data: [] as Doctor[],
    };
  }
}

// ============================================================
// ✏️ UPDATE DOCTOR PROFILE (แพทย์แก้ไขข้อมูลตัวเอง)
// ============================================================

export async function updateDoctorProfile(
  doctorId: number,
  updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    position?: string;
  },
) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .update(updates)
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as Doctor };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

// ============================================================
// 🔄 CHECK USERNAME AVAILABILITY (ตรวจสอบ username ว่างหรือไม่)
// ============================================================

export async function checkUsernameAvailability(username: string) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select('id')
      .eq('username', username)
      .single();

    // ถ้า error เกิด และเป็น PGRST116 = ไม่พบ = username ว่าง
    if (error?.code === 'PGRST116') {
      return { success: true, available: true };
    }

    if (error && error.code !== 'PGRST116') throw error;

    // ถ้าหา user ได้ = username ถูกใช้แล้ว
    return { success: true, available: !data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Check failed',
      available: false,
    };
  }
}