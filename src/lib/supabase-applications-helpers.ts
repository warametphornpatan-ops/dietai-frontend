// lib/supabase-applications-helpers.ts
import { supabase } from './supabase';

export type DoctorApplication = {
  id: number;
  org_code: string;
  citizen_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password_hash: string;
  position: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  email_verified: boolean;
  otp_token: string | null;
  otp_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================
// 📝 SAVE DOCTOR APPLICATION (บันทึก pending application)
// ============================================================

export async function saveDoctorApplication({
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
      .from('doctor_applications')
      .insert({
        org_code,
        citizen_id,
        first_name,
        last_name,
        email,
        username,
        password_hash,
        position,
        status: 'pending',
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as DoctorApplication };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save application failed',
    };
  }
}

// ============================================================
// 📧 SEND OTP (ส่ง OTP - ทำใน backend)
// ============================================================

export async function sendOtpEmail(email: string) {
  try {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error('Failed to send OTP');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Send OTP failed',
    };
  }
}

// ============================================================
// ✅ VERIFY EMAIL OTP (ยืนยัน OTP + update email_verified)
// ============================================================

export async function verifyEmailOtp(email: string, otp: string) {
  try {
    // ✅ Step 1: ตรวจสอบ OTP ว่ำถูกต้องหรือไม่ (ตรวจสอบกับ backend)
    const verifyRes = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!verifyRes.ok) {
      throw new Error('OTP verification failed');
    }

    // ✅ Step 2: Update email_verified = true ใน doctor_applications
    const { data, error } = await supabase
      .from('doctor_applications')
      .update({
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as DoctorApplication };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OTP verification failed',
    };
  }
}

// ============================================================
// 🔔 GET PENDING APPLICATIONS (แอดมิน ดู pending applications)
// ============================================================

export async function getPendingApplications(orgCode: string) {
  try {
    const { data, error } = await supabase
      .from('doctor_applications')
      .select('*')
      .eq('org_code', orgCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: (data || []) as DoctorApplication[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch applications',
      data: [] as DoctorApplication[],
    };
  }
}

// ============================================================
// ✅ APPROVE APPLICATION (อนุมัติ + move ไป doctors table)
// ============================================================

export async function approveDoctorApplication(applicationId: number) {
  try {
    // ✅ Step 1: ดึง application data
    const { data: appData, error: fetchError } = await supabase
      .from('doctor_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;

    // ✅ Step 2: Insert ไป doctors table
    const { data: doctorData, error: insertError } = await supabase
      .from('doctors')
      .insert({
        org_code: appData.org_code,
        citizen_id: appData.citizen_id,
        first_name: appData.first_name,
        last_name: appData.last_name,
        email: appData.email,
        username: appData.username,
        password_hash: appData.password_hash,
        position: appData.position,
        status: 'approved',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ✅ Step 3: ลบจาก doctor_applications
    const { error: deleteError } = await supabase
      .from('doctor_applications')
      .delete()
      .eq('id', applicationId);

    if (deleteError) throw deleteError;

    return { success: true, data: doctorData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Approval failed',
    };
  }
}

// ============================================================
// ❌ REJECT APPLICATION (ปฏิเสธ + ลบออก)
// ============================================================

export async function rejectDoctorApplication(applicationId: number, reason?: string) {
  try {
    // ✅ Option 1: Delete เลย (ไม่เก็บประวัติ)
    const { error } = await supabase
      .from('doctor_applications')
      .delete()
      .eq('id', applicationId);

    if (error) throw error;

    // ✅ Option 2: Update status เป็น rejected (เก็บประวัติ)
    // const { error } = await supabase
    //   .from('doctor_applications')
    //   .update({
    //     status: 'rejected',
    //     rejection_reason: reason,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', applicationId);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rejection failed',
    };
  }
}

// ============================================================
// 📊 GET APPLICATION STATS
// ============================================================

export async function getApplicationStats(orgCode: string) {
  try {
    const { data, error } = await supabase
      .from('doctor_applications')
      .select('status')
      .eq('org_code', orgCode);

    if (error) throw error;

    const stats = {
      pending: data?.filter(d => d.status === 'pending').length || 0,
      rejected: data?.filter(d => d.status === 'rejected').length || 0,
      total: data?.length || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    };
  }
}

// ============================================================
// 🔍 GET APPLICATION BY ID
// ============================================================

export async function getDoctorApplicationById(applicationId: number) {
  try {
    const { data, error } = await supabase
      .from('doctor_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error) throw error;
    return { success: true, data: data as DoctorApplication };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Application not found',
    };
  }
}

// ============================================================
// 🔍 CHECK USERNAME AVAILABILITY (ตรวจสอบ username ว่างหรือไม่)
// ============================================================

export async function checkUsernameAvailabilityInApplications(username: string) {
  try {
    const { data: appData, error: appError } = await supabase
      .from('doctor_applications')
      .select('id')
      .eq('username', username)
      .single();

    if (appData) {
      // username มีอยู่ใน applications
      return { success: true, available: false };
    }

    if (appError?.code !== 'PGRST116') {
      // PGRST116 = no rows found (good)
      throw appError;
    }

    // ตรวจสอบใน doctors table ด้วย
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('id')
      .eq('username', username)
      .single();

    if (doctorData) {
      return { success: true, available: false };
    }

    if (doctorError?.code !== 'PGRST116') {
      throw doctorError;
    }

    return { success: true, available: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Check failed',
      available: false,
    };
  }
}