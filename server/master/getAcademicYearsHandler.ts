import type { PageContext } from '../platform/context.ts';
import { verifyEnv } from '../platform/env.ts';
import { getCookie, SESSION_COOKIE } from '../platform/cookie.ts';
import { restoreSession } from '../auth/restoreSession.ts';
import { hasAdminAccess } from '../../contracts/auth/roles.ts';
import { privilegedClient } from '../platform/supabase.ts';
import { failure, success, unavailable } from '../platform/responses.ts';
import { listAcademicYears } from './academicYearsRepository.ts';

export async function onRequestGet({request,env}:PageContext):Promise<Response> {
  const id=crypto.randomUUID();
  const handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
  try {
    const cfg=verifyEnv(env);
    const session=await restoreSession(cfg,handle);
    if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
    if(!hasAdminAccess(session.profile))
      return failure(id,403,'FORBIDDEN','Akses hanya untuk administrator.');
    const years=await listAcademicYears(privilegedClient(cfg));
    return success(id,years);
  }catch{return unavailable(id);}
}
