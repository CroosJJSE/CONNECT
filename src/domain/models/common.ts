export type CurrencyCode = 'LKR' | 'USD';

export type MemberRole = 'member' | 'steward' | 'admin';

export type MembershipStatus = 'pending' | 'active' | 'rejected';

export type AccessState = 'unknown' | MembershipStatus;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
