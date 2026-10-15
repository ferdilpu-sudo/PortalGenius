import type {AccountProfile} from '../../server/auth/sessionRepository.ts';
export function canReadStudentSummary(profile:AccountProfile|null):boolean{
 return !!profile&&!profile.mustChangePassword&&
  profile.roles.some(role=>role==='admin'||role==='teacher'||role==='counselor');
}
