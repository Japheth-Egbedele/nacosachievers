export const USER_ROLES = [
  'super_admin',
  'executive',
  'member',
  'alumni',
  'staff',
  'guest',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_LEVELS = ['100', '200', '300', '400', 'staff'] as const;
export type UserLevel = (typeof USER_LEVELS)[number];

export const ACADEMIC_STATUSES = [
  'active',
  'alumni',
  'suspended',
  'transferred_out',
] as const;
export type AcademicStatus = (typeof ACADEMIC_STATUSES)[number];

export const UPLOAD_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export const UPLOAD_KINDS = ['past_question', 'course_material'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const TRANSACTION_TYPES = [
  'credit',
  'debit',
  'transfer_in',
  'transfer_out',
  'redemption',
  'upload_reward',
  'career_submission_bounty',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'vault_approved',
  'vault_rejected',
  'credit_received',
  'transfer',
  'order_update',
  'announcement',
  'message',
  'event_reminder',
  'career_verified',
  'career_rejected',
  'yearbook_published',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const YB_EDITION_STATUSES = ['draft', 'published', 'archived'] as const;
export type YearbookEditionStatus = (typeof YB_EDITION_STATUSES)[number];

export const CAREER_POSTING_STATUSES = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'expired',
] as const;
export type CareerPostingStatus = (typeof CAREER_POSTING_STATUSES)[number];

export const WORK_MODES = ['onsite', 'remote', 'hybrid'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'adjunct',
  'visiting',
  'external',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const TEACHING_STATUSES = ['active', 'on_sabbatical', 'on_leave'] as const;
export type TeachingStatus = (typeof TEACHING_STATUSES)[number];
