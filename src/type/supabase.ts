export type DoctorStatus = 'pending' | 'approved' | 'rejected';

export type Doctor = {
  id: number;
  org_code: string;
  citizen_id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password_hash: string;
  position: string | null;
  status: DoctorStatus;
  user_id: string | null;
  created_at: string;
};

export type Admin = {
  admin_id: number;
  org_code: string;
  first_name: string;
  last_name: string;
  citizen_id: string;
  email: string;
  username: string;
  password_hash: string;
  user_id: string | null;
  created_at: string;
};