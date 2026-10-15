import type {PageContext} from '../../../server/platform/context.ts';
import {getCookie,SESSION_COOKIE} from '../../../server/platform/cookie.ts';
import {verifyEnv} from '../../../server/platform/env.ts';
import {failure,success,unavailable} from '../../../server/platform/responses.ts';
import {restoreSession} from '../../../server/auth/restoreSession.ts';
import {canReadStudentSummary} from '../../../contracts/auth/studentAccess.ts';
import {jakartaDate} from '../../../contracts/shared/jakartaDate.ts';
import {privilegedClient} from '../../../server/platform/supabase.ts';
import {listScopedStudents} from '../../../server/students/studentsRepository.ts';
export async function onRequestGet({request,env}:PageContext):Promise<Response>{
 const id=crypto.randomUUID(),handle=getCookie(request,SESSION_COOKIE);
 if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
 try{
  const cfg=verifyEnv(env),session=await restoreSession(cfg,handle);
  if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
  if(!canReadStudentSummary(session.profile))
   return failure(id,403,'FORBIDDEN','Tidak memiliki akses daftar siswa.');
  return success(id,await listScopedStudents(privilegedClient(cfg),session.profile.id,jakartaDate()));
 }catch{return unavailable(id);}
}
