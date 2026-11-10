export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    emailVerified?: boolean | null;
  };
}

export function createFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null,
  authContext?: { userId?: string | null; emailVerified?: boolean | null }
): Error {
  const payload: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: authContext?.userId ?? null,
      emailVerified: authContext?.emailVerified ?? null,
    },
  };
  return new Error(JSON.stringify(payload));
}
