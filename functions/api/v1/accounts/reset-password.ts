import type {PageContext} from '../../../../server/platform/context.ts';
import {verifyEnv} from '../../../../server/platform/env.ts';
import {getCookie,SESSION_COOKIE} from '../../../../server/platform/cookie.ts';
import {isTrustedMutation,readSmallJson} from '../../../../server/platform/requestGuard.ts';
import {verifyCsrf} from '../../../../server/platform/crypto.ts';
import {restoreSession} from '../../../../server/auth/restoreSession.ts';
import {hasAdminAccess} from '../../../../contracts/auth/roles.ts';
import {isProvisioningEnabled} from '../../../../server/accounts/provisioningGate.ts';
import {validateResetPasswordRequest} from '../../../../contracts/accounts/resetPasswordValidation.ts';
import {isUUID} from '../../../../contracts/master/academicYearValidation.ts';
import {privilegedClient} from '../../../../server/platform/supabase.ts';
import {staffPasswordResetGateway} from '../../../../server/accounts/staffPasswordResetGateway.ts';
import {resetStaffPassword} from '../../../../server/accounts/resetStaffPassword.ts';
import {failure,success,unavailable} from '../../../../server/platform/responses.ts';
export async function onRequestPost({request,env}:PageContext):Promise<Response>{
 const id=crypto.randomUUID();
 try{
  const origin=new URL(request.url).origin;
  if(!isTrustedMutation(request,origin))
   return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
  const handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
  const cfg=verifyEnv(env);
  if(!isTrustedMutation(request,cfg.APP_ORIGIN))
   return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
  if(!await verifyCsrf(cfg.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
   return failure(id,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
  const session=await restoreSession(cfg,handle);
  if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
  if(!hasAdminAccess(session.profile))
   return failure(id,403,'FORBIDDEN','Akses khusus administrator.');
  if(!isProvisioningEnabled(cfg))
   return failure(id,423,'ACCOUNT_RESETS_LOCKED','Reset password belum diaktifkan.');
  const operationId=request.headers.get('Idempotency-Key');
  if(!isUUID(operationId))
   return failure(id,422,'INVALID_OPERATION_KEY','Kunci reset tidak valid.');
  const input=validateResetPasswordRequest(await readSmallJson(request));
  if(!input)return failure(id,422,'INVALID_TARGET','Data akun tidak valid.');
  const result=await resetStaffPassword(
    staffPasswordResetGateway(privilegedClient(cfg)),session.profile.id,
    input.targetId,operationId!,id);
  return success(id,result);
 }catch(e){
  if(e instanceof Error&&e.message==='RESET_FORBIDDEN')
   return failure(id,403,'RESET_FORBIDDEN','Reset tidak diizinkan pada akun ini.');
  if(e instanceof Error&&e.message==='RESET_PENDING')
   return failure(id,409,'RESET_PENDING','Reset sebelumnya perlu ditinjau.');
  if(e instanceof Error&&e.message==='RESET_INVALID')
   return failure(id,422,'INVALID_TARGET','Data reset tidak sesuai.');
  if(e instanceof Error&&e.message==='RESET_REVIEW_REQUIRED')
   return failure(id,503,'RESET_REVIEW_REQUIRED','Hasil reset tidak dapat dipastikan. Hubungi administrator teknis.');
  if(e instanceof SyntaxError||e instanceof Error&&['BODY_TOO_LARGE','INVALID_CONTENT_TYPE'].includes(e.message))
   return failure(id,422,'INVALID_INPUT','Format permintaan tidak sesuai.');
  return unavailable(id);
 }
}
