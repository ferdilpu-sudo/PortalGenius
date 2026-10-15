export type AccountRole = 'admin' | 'teacher' | 'counselor' | 'principal';
export type AccountProfile = { id: string; displayName: string; mustChangePassword: boolean; roles: AccountRole[] };
export type SessionData = { profile: AccountProfile; csrf: string };
