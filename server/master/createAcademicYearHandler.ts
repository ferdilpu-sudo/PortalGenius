import type { PageContext } from '../platform/context.ts';
import { verifyEnv } from '../platform/env.ts';
import { getCookie, SESSION_COOKIE } from '../platform/cookie.ts';
import { restoreSession } from '../auth/restoreSession.ts';
import { hasAdminAccess } from '../../contracts/auth/roles.ts';
import { isTrustedMutation, readSmallJson } from '../platform/requestGuard.ts';
import { verifyCsrf } from '../platform/crypto.ts';
import { privilegedClient } from '../platform/supabase.ts';
import { failure, success, unavailable } from '../platform/responses.ts';
import { validateAcademicYear,isUUID } from '../../contracts/master/academicYearValidation.ts';
import { createAcademicYear } from './academicYearsRepository.ts';

export async function onRequestPost({request,env}:PageContext):Promise<Response> {
  const id=crypto.randomUUID();
  try {
    const cfg=verifyEnv(env);
    if(!isTrustedMutation(request,cfg.APP_ORIGIN))
      return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
    const handle=getCookie(request,SESSION_COOKIE);
    if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
    if(!await verifyCsrf(cfg.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
      return failure(id,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
    const session=await restoreSession(cfg,handle);
    if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
    if(!hasAdminAccess(session.profile))
      return failure(id,403,'FORBIDDEN','Akses hanya untuk administrator.');
    const key=request.headers.get('Idempotency-Key');
    if(!isUUID(key))return failure(id,422,'INVALID_IDEMPOTENCY_KEY','Kunci permintaan tidak sesuai.');
    const input=validateAcademicYear(await readSmallJson(request));
    if(!input)return failure(id,422,'INVALID_YEAR','Periksa nama dan tanggal tahun ajaran.');
    const result=await createAcademicYear(privilegedClient(cfg),{
      actorId:session.profile.id,...input,key:key!,requestId:id
    });
    return success(id,result,201);
  }catch(e) {
    if(e instanceof Error&&e.message==='ACADEMIC_YEAR_CONFLICT')
      return failure(id,409,'CONFLICT','Tahun ajaran bertabrakan atau kunci permintaan digunakan untuk data lain.');
    if(e instanceof Error&&e.message==='FORBIDDEN')
      return failure(id,403,'FORBIDDEN','Akses ditolak.');
    if(e instanceof Error&&
      (e.message==='ACADEMIC_YEAR_INVALID'||e.message==='INVALID_CONTENT_TYPE'||e.message==='BODY_TOO_LARGE'))
      return failure(id,422,'INVALID_YEAR','Periksa data tahun ajaran.');
    if(e instanceof SyntaxError)
      return failure(id,422,'INVALID_JSON','Format permintaan tidak sesuai.');
    return unavailable(id);
  }
}
