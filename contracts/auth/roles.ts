import type { AccountProfile } from '../../server/auth/sessionRepository.ts';
export function hasAdminAccess(profile:AccountProfile|null):boolean {
  return !!profile&&!profile.mustChangePassword&&profile.roles.includes('admin');
}
