import { getCookie, SESSION_COOKIE } from '../../../../server/platform/cookie.ts';
import { verifyEnv } from '../../../../server/platform/env.ts';
import type { PageContext } from '../../../../server/platform/context.ts';
import { failure, success, unavailable } from '../../../../server/platform/responses.ts';
import { restoreSession } from '../../../../server/auth/restoreSession.ts';
export async function onRequestGet({request,env}:PageContext):Promise<Response> {
  const id=crypto.randomUUID();
  const handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk untuk melanjutkan.');
  try {
    const data=await restoreSession(verifyEnv(env),handle);
    if(!data)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku. Silakan masuk kembali.');
    return success(id,{profile:data.profile,csrf:data.csrf});
  }catch{return unavailable(id);}
}
