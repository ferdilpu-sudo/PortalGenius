import { loginService } from '../../../../server/auth/loginService.ts';
import { sessionCookie } from '../../../../server/platform/cookie.ts';
import { verifyEnv } from '../../../../server/platform/env.ts';
import type { PageContext } from '../../../../server/platform/context.ts';
import { failure, jsonResponse, unavailable } from '../../../../server/platform/responses.ts';
import { isTrustedMutation, readSmallJson } from '../../../../server/platform/requestGuard.ts';
export async function onRequestPost({request,env}:PageContext):Promise<Response> {
  const requestId=crypto.randomUUID();
  try {
    const config=verifyEnv(env);
    if(!isTrustedMutation(request,config.APP_ORIGIN))
      return failure(requestId,403,'ORIGIN_DENIED','Permintaan tidak diizinkan.');
    const body=await readSmallJson(request);
    const ip=request.headers.get('CF-Connecting-IP')??(config.APP_ENV==='local'?'localhost':'unknown');
    const data=await loginService(config,body,ip);
    if(!data)return failure(requestId,401,'INVALID_CREDENTIALS','Username atau password tidak sesuai.');
    const response=jsonResponse(requestId,200,{data:{profile:data.profile,csrf:data.csrf},meta:{requestId}});
    response.headers.append('Set-Cookie',sessionCookie(data.handle));
    return response;
  } catch(e) {
    if(e instanceof Error&&e.message==='LOGIN_RATE_LIMIT')
      return failure(requestId,429,'TRY_LATER','Terlalu banyak percobaan. Silakan coba nanti.');
    if(e instanceof SyntaxError||(e instanceof Error&&/^(INVALID_CONTENT_TYPE|BODY_TOO_LARGE)/.test(e.message)))
      return failure(requestId,422,'INVALID_INPUT','Periksa data yang dimasukkan.');
    return unavailable(requestId);
  }
}
