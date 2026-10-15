import { changePassword } from '../../../../server/auth/changePassword.ts';
import { restoreSession } from '../../../../server/auth/restoreSession.ts';
import { deleteSessionCookie,getCookie,SESSION_COOKIE } from '../../../../server/platform/cookie.ts';
import type { PageContext } from '../../../../server/platform/context.ts';
import { verifyCsrf } from '../../../../server/platform/crypto.ts';
import { verifyEnv } from '../../../../server/platform/env.ts';
import { failure,success,unavailable } from '../../../../server/platform/responses.ts';
import { isTrustedMutation,readSmallJson } from '../../../../server/platform/requestGuard.ts';
export async function onRequestPost({request,env}:PageContext):Promise<Response> {
  const id=crypto.randomUUID();
  try {
    const config=verifyEnv(env);
    if(!isTrustedMutation(request,config.APP_ORIGIN))return failure(id,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
    const handle=getCookie(request,SESSION_COOKIE);
    if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk kembali.');
    if(!await verifyCsrf(config.SESSION_ENCRYPTION_KEY,handle,request.headers.get('X-CSRF-Token')))
      return failure(id,403,'CSRF_DENIED','Permintaan tidak diizinkan.');
    const session=await restoreSession(config,handle);
    if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
    const result=await changePassword(config,session.profile,await readSmallJson(request));
    if(result==='invalid')return failure(id,422,'INVALID_PASSWORD','Password saat ini atau password baru tidak sesuai ketentuan.');
    const response=success(id,{changed:true});
    response.headers.append('Set-Cookie',deleteSessionCookie());
    return response;
  }catch(e) {
    if(e instanceof SyntaxError||(e instanceof Error&&/^(INVALID_CONTENT_TYPE|BODY_TOO_LARGE)/.test(e.message)))
      return failure(id,422,'INVALID_INPUT','Periksa data yang dimasukkan.');
    return unavailable(id);
  }
}
