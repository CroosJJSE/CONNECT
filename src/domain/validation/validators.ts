import type { ValidationResult } from '../models/common';
import type { PostAudienceType } from '../models/post';
import type { SharingMode } from '../models/sharing';
import type { TransactionType } from '../models/finance';

export const VALIDATION_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]{1,128}$/,
  POST_MAX_LENGTH: 3000,
  COMMENT_MAX_LENGTH: 1000,
  SHARING_TITLE_MAX_LENGTH: 120,
  SHARING_DESC_MAX_LENGTH: 1200,
  EVENT_TITLE_MAX_LENGTH: 140,
  EVENT_DESC_MAX_LENGTH: 2000,
  EVENT_LOCATION_MAX_LENGTH: 180,
  TASK_TITLE_MAX_LENGTH: 160,
  TX_TITLE_MAX_LENGTH: 120,
  MAX_COMMUNITIES_PER_POST: 10,
} as const;

export function isValidEntityId(id: string): boolean {
  return VALIDATION_LIMITS.ID_REGEX.test(id);
}

export function validatePostInput(params: {
  content: string;
  audienceType: PostAudienceType;
  communityIds: string[];
}): ValidationResult {
  const errors: string[] = [];
  const trimmed = params.content.trim();

  if (!trimmed) {
    errors.push('Post content cannot be empty.');
  } else if (trimmed.length > VALIDATION_LIMITS.POST_MAX_LENGTH) {
    errors.push(`Post content must be at most ${VALIDATION_LIMITS.POST_MAX_LENGTH} characters.`);
  }

  if (params.audienceType === 'communities') {
    if (params.communityIds.length === 0) {
      errors.push('Select at least one community for a community post.');
    } else if (params.communityIds.length > VALIDATION_LIMITS.MAX_COMMUNITIES_PER_POST) {
      errors.push(`Select at most ${VALIDATION_LIMITS.MAX_COMMUNITIES_PER_POST} communities.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSharingItemInput(params: {
  title: string;
  description: string;
  mode: SharingMode;
  durationDays?: number;
}): ValidationResult {
  const errors: string[] = [];
  const title = params.title.trim();
  const desc = params.description.trim();

  if (title.length < 2) {
    errors.push('Item title must be at least 2 characters.');
  } else if (title.length > VALIDATION_LIMITS.SHARING_TITLE_MAX_LENGTH) {
    errors.push(`Item title must be under ${VALIDATION_LIMITS.SHARING_TITLE_MAX_LENGTH} characters.`);
  }

  if (desc.length > VALIDATION_LIMITS.SHARING_DESC_MAX_LENGTH) {
    errors.push(`Description must be under ${VALIDATION_LIMITS.SHARING_DESC_MAX_LENGTH} characters.`);
  }

  if (params.mode === 'lend' && (!params.durationDays || params.durationDays < 1 || params.durationDays > 365)) {
    errors.push('Lending duration must be between 1 and 365 days.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateSharingRequestInput(params: {
  title: string;
  description: string;
  requiredDuration: string;
}): ValidationResult {
  const errors: string[] = [];
  if (params.title.trim().length < 2) {
    errors.push('Request title must be at least 2 characters.');
  }
  if (params.description.trim().length < 4) {
    errors.push('Please describe what you need.');
  }
  if (!params.requiredDuration.trim()) {
    errors.push('Specify the required duration or timeframe.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateSkillOfferInput(params: {
  title: string;
  description: string;
  availability: string;
}): ValidationResult {
  const errors: string[] = [];
  if (params.title.trim().length < 2) {
    errors.push('Skill or service title must be at least 2 characters.');
  }
  if (params.description.trim().length < 4) {
    errors.push('Describe how you can help.');
  }
  if (!params.availability.trim()) {
    errors.push('Provide your general availability.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateEventInput(params: {
  title: string;
  location: string;
  dateStr: string;
  startTime: string;
  endTime: string;
}): ValidationResult {
  const errors: string[] = [];
  if (params.title.trim().length < 3) {
    errors.push('Event title must be at least 3 characters.');
  }
  if (!params.location.trim()) {
    errors.push('Location is required.');
  }
  if (!params.dateStr) {
    errors.push('Event date is required.');
  }
  if (!params.startTime || !params.endTime) {
    errors.push('Start and end times are required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTransactionInput(params: {
  title: string;
  amount: number;
  type: TransactionType;
}): ValidationResult {
  const errors: string[] = [];
  if (!params.title.trim()) {
    errors.push('Transaction description is required.');
  } else if (params.title.trim().length > VALIDATION_LIMITS.TX_TITLE_MAX_LENGTH) {
    errors.push(`Description must be under ${VALIDATION_LIMITS.TX_TITLE_MAX_LENGTH} characters.`);
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    errors.push('Amount must be greater than zero.');
  }
  return { valid: errors.length === 0, errors };
}
