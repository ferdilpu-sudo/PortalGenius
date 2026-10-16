import type {PageContext} from '../../../../server/platform/context.ts';
import {verifyEnv} from '../../../../server/platform/env.ts';
import {getCookie,SESSION_COOKIE} from '../../../../server/platform/cookie.ts';
import {isTrustedMutation,readSmallJson} from '../../../../server/platform/requestGuard.ts';
import {verifyCsrf} from '../../../../server/platform/crypto.ts';
import {restoreSession} from '../../../../server/auth/restoreSession.ts';
import {hasAdminAccess} from '../../../../contracts/auth/roles.ts';
import {isProvisioningEnabled} from '../../../../server/accounts/provisioningGate.ts';
import {validateProvisionRequest} from '../../../../contracts/accounts/provisionValidation.ts';
import {provisionGateway} from '../../../../server/accounts/provisionGateway.ts';
import {provisionAccount} from '../../../../server/accounts/provisionAccount.ts';
import {isUUID} from '../../../../contracts/master/academicYearValidation.ts';
import {privilegedClient} from '../../../../server/platform/supabase.ts';
import {failure,success,unavailable} from '../../../../server/platform/responses.ts';
export async function onRequestPost({request,env}:PageContext):Promise<Response>{
 const requestId=crypto.randomUUID();
 try{
  // Reject requests without a same-origin Origin/Referer or session first,
  // including on Preview where secrets may not have been configured.
  const origin=new URL(request.url).origin;
  if(!isTrustedMutation(request,origin))
   return failure(requestId,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
  const handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(requestId,401,'NOT_AUTHENTICATED','Silakan masuk.');
  const cfg=verifyEnv(env);
  if(!isTrustedMutation(request,cfg.APP_ORIGIN))
   return failure(requestId,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
  if(!await verifyCsrf(cfg.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
   return failure(requestId,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
  const session=await restoreSession(cfg,handle);
  if(!session)return failure(requestId,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
  if(!hasAdminAccess(session.profile))
   return failure(requestId,403,'FORBIDDEN','Akses hanya administrator.');
  if(!isProvisioningEnabled(cfg))
   return failure(requestId,423,'PROVISIONING_LOCKED','Pembuatan akun belum diaktifkan.');
  const key=request.headers.get('Idempotency-Key');
  if(!isUUID(key))return failure(requestId,422,'INVALID_IDEMPOTENCY_KEY','Kunci permintaan tidak valid.');
  const data=validateProvisionRequest(await readSmallJson(request));
  if(!data)return failure(requestId,422,'INVALID_ACCOUNT','Data akun tidak sesuai ketentuan.');
  const created=await provisionAccount(
   provisionGateway(privilegedClient(cfg)),session.profile.id,key!,requestId,data
  );
  return success(requestId,created,created.alreadyCompleted?200:201);
 }catch(e){
  if(e instanceof Error&&e.message==='PROVISION_CONFLICT')
   return failure(requestId,409,'CONFLICT','Identitas akun atau kunci permintaan sudah dipakai.');
  if(e instanceof Error&&e.message==='FORBIDDEN')
   return failure(requestId,403,'FORBIDDEN','Akses tidak diizinkan.');
  if(e instanceof Error&&e.message==='PROVISION_INVALID')
   return failure(requestId,422,'INVALID_ACCOUNT','Data akun tidak sesuai.');
  if(e instanceof Error&&e.message==='PROVISION_RECONCILIATION_REQUIRED')
   return failure(requestId,503,'PROVISIONING_REVIEW_REQUIRED',
    'Operasi perlu pemeriksaan administrator teknis sebelum diulang.');
  if(e instanceof SyntaxError||e instanceof Error&&
    ['INVALID_CONTENT_TYPE','BODY_TOO_LARGE'].includes(e.message))
   return failure(requestId,422,'INVALID_ACCOUNT','Format permintaan tidak sesuai.');
  return unavailable(requestId);
 }
}
