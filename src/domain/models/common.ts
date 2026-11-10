export type CurrencyCode = 'LKR' | 'USD';

export type MemberRole = 'member' | 'steward' | 'admin';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
