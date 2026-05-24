import type { UserRole } from '../constants/enums.js';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface OnboardingTokenPayload {
  sub: string;
  matric_number: string;
  type: 'onboarding';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  role: UserRole;
}

export interface UserRecord {
  id: string;
  matric_number: string;
  email: string;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  display_name: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  department_id: string | null;
  level: string | null;
  level_of_entry: string | null;
  year_of_admission: number | null;
  expected_graduation_year: number | null;
  actual_graduation_year: number | null;
  academic_status: string;
  admission_type: string;
  linkedin_url: string | null;
  github_url: string | null;
  other_social_links: Record<string, unknown>;
  email_visible: boolean;
  wallet_balance: number;
  is_email_verified: boolean;
  is_active: boolean;
  notification_prefs: Record<string, unknown> | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicUserProfile {
  id: string;
  display_name: string | null;
  first_name: string;
  last_name: string;
  bio: string | null;
  profile_photo_url: string | null;
  role: UserRole;
  level: string | null;
  expected_graduation_year: number | null;
  actual_graduation_year: number | null;
  linkedin_url: string | null;
  github_url: string | null;
  email?: string;
}

export interface MeResponse extends PublicUserProfile {
  matric_number: string;
  email: string;
  email_visible: boolean;
  wallet_balance: number;
  is_email_verified: boolean;
  academic_status: string;
  admission_type: string;
  year_of_admission: number | null;
  notification_prefs: Record<string, unknown>;
  unread_notifications_count: number;
  unread_messages_count: number;
}
