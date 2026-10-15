import { getCookie,deleteSessionCookie,SESSION_COOKIE } from '../../../../server/platform/cookie.ts';
import { digestHandle,verifyCsrf } from '../../../../server/platform/crypto.ts';
import { verifyEnv } from '../../../../server/platform/env.ts';
import type { PageContext } from '../../../../server/platform/context.ts';
import { failure,success,unavailable } from '../../../../server/platform/responses.ts';
import { isTrustedMutation } from '../../../../server/platform/requestGuard.ts';
import { privilegedClient } from '../../../../server/platform/supabase.ts';
import { revokeSession } from '../../../../server/auth/sessionRepository.ts';
export async function onRequestPost({request,env}:PageContext):Promise<Response> {
  const id=crypto.randomUUID();
  try {
    const config=verifyEnv(env);
    if(!isTrustedMutation(request,config.APP_ORIGIN))return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
    const handle=getCookie(request,SESSION_COOKIE);
    if(handle&&!await verifyCsrf(config.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
      return failure(id,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
    if(handle)await revokeSession(privilegedClient(config),await digestHandle(handle));
    const response=success(id,{loggedOut:true});
    response.headers.append('Set-Cookie',deleteSessionCookie());
    return response;
  }catch{return unavailable(id);}
}
