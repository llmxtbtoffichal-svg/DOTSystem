export type OfficerRank = string;
export type OfficerStatus = 'active' | 'suspended' | 'deleted';

export interface OfficerRankRecord {
  id: string;
  label: string;
  rank_key: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type ServiceStatus = 'paid' | 'unpaid';
export type ServiceType = 'normal' | 'impound';

export type Department =
  | 'civil_maintenance'
  | 'vehicle_rescue'
  | 'electrical'
  | 'traffic_management'
  | 'emergency_assistance';

export interface Officer {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  rank: OfficerRank;
  department: Department;
  status: OfficerStatus;
  is_on_duty: boolean;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRate {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecord {
  id: string;
  roblox_username: string;
  discord_username: string;
  service_rate_id: string | null;
  service_name: string;
  amount: number;
  status: ServiceStatus;
  service_type: ServiceType;
  officer_id: string | null;
  officer_name: string;
  notes: string;
  evidence_url: string | null;
  service_date: string;
  created_at: string;
  updated_at: string;
}

export interface DutyLog {
  id: string;
  officer_id: string | null;
  officer_name: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  forced_by: string | null;
  forced_by_name: string | null;
  checkout_method: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
  delete_reason: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  performed_by: string | null;
  performed_by_name: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  duty_system_enabled: boolean;
  login_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
}

export interface License {
  id: string;
  roblox_username: string;
  discord_username: string | null;
  license_type: string;
  license_number: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issued_by: string | null;
  issued_by_name: string | null;
  notes: string | null;
  citizen_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  complainant_name: string | null;
  complainant_contact: string | null;
  officer_name: string | null;
  category: string | null;
  description: string | null;
  discord_username: string | null;
  incident_datetime: string | null;
  details: string | null;
  evidence_url: string | null;
  status: string;
  created_at: string;
}

export type EmergencyReportType = 'accident' | 'breakdown' | 'towing' | 'other';
export type EmergencyReportStatus = 'pending' | 'responding' | 'resolved' | 'dismissed';

export interface EmergencyReport {
  id: string;
  discord_username: string;
  report_type: EmergencyReportType;
  details: string;
  location: string;
  image_url: string | null;
  status: EmergencyReportStatus;
  responded_by: string | null;
  responded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export const EMERGENCY_TYPE_LABELS: Record<EmergencyReportType, string> = {
  accident: 'อุบัติเหตุจราจร',
  breakdown: 'รถเสีย',
  towing: 'ต้องการรถยก',
  other: 'อื่นๆ',
};

export const EMERGENCY_STATUS_LABELS: Record<EmergencyReportStatus, string> = {
  pending: 'รอดำเนินการ',
  responding: 'กำลังเข้าช่วยเหลือ',
  resolved: 'จัดการเรียบร้อย',
  dismissed: 'ยกเลิก',
};

export type VehicleType = 'sedan' | 'suv' | 'pickup' | 'motorcycle' | 'truck' | 'van' | 'other';

export interface Vehicle {
  id: string;
  license_plate: string;
  owner_name: string | null;
  vehicle_type: VehicleType;
  color: string | null;
  brand_model: string | null;
  vehicle_category: string | null;
  citizen_id: string | null;
  is_impounded: boolean;
  impound_reason: string | null;
  impound_location: string | null;
  impounded_at: string | null;
  impounded_by: string | null;
  impounded_by_name: string | null;
  released_at: string | null;
  released_by: string | null;
  released_by_name: string | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type CitizenStatus = 'normal' | 'watched' | 'suspended';

export interface Citizen {
  id: string;
  roblox_username: string;
  discord_username: string | null;
  status: CitizenStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CITIZEN_STATUS_LABELS: Record<CitizenStatus, string> = {
  normal: 'ปกติ',
  watched: 'เฝ้าระวัง',
  suspended: 'ระงับสิทธิ์',
};

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  personal: 'รถส่วนตัว',
  public: 'รถสาธารณะ',
  transport: 'รถขนส่ง',
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  sedan: 'รถเก๋ง',
  suv: 'รถ SUV',
  pickup: 'รถกระบะ',
  motorcycle: 'รถจักรยานยนต์',
  truck: 'รถบรรทุก',
  van: 'รถตู้',
  other: 'อื่นๆ',
};

// Legacy fallback labels — used only before ranks are loaded from DB
export const RANK_LABELS: Record<string, string> = {
  commissioner: 'หัวหน้ากรมขนส่ง',
  inspector: 'ผู้คุมสอบกรมขนส่ง',
  officer: 'พนักงาน',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  civil_maintenance: 'โยธาซ่อมบำรุง',
  vehicle_rescue: 'กู้ภัยรถยก',
  electrical: 'การไฟฟ้า',
  traffic_management: 'จัดการจราจร',
  emergency_assistance: 'ช่วยเหลือฉุกเฉิน',
};

export const DEPARTMENTS: Department[] = [
  'civil_maintenance',
  'vehicle_rescue',
  'electrical',
  'traffic_management',
  'emergency_assistance',
];

// The commissioner rank identifier — always stored as this string in officers.rank
export const COMMISSIONER_RANK = 'commissioner';
