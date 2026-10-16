import type {PageContext} from '../../../../server/platform/context.ts';
import {verifyEnv} from '../../../../server/platform/env.ts';
import {getCookie,SESSION_COOKIE} from '../../../../server/platform/cookie.ts';
import {restoreSession} from '../../../../server/auth/restoreSession.ts';
import {hasAdminAccess} from '../../../../contracts/auth/roles.ts';
import {isProvisioningEnabled,isStaffPasswordResetEnabled} from '../../../../server/accounts/provisioningGate.ts';
import {failure,success,unavailable} from '../../../../server/platform/responses.ts';

/** Admin-only, read-only feature availability. Never returns environment secrets. */
export async function onRequestGet({request,env}:PageContext):Promise<Response>{
 const id=crypto.randomUUID();
 try{
  const handle=getCookie(request,SESSION_COOKIE);
  if(!handle)return failure(id,401,'NOT_AUTHENTICATED','Silakan masuk.');
  const cfg=verifyEnv(env);
  const session=await restoreSession(cfg,handle);
  if(!session)return failure(id,401,'NOT_AUTHENTICATED','Sesi tidak berlaku.');
  if(!hasAdminAccess(session.profile))
   return failure(id,403,'FORBIDDEN','Akses hanya administrator.');
  return success(id,{
   canCreateStaff:isProvisioningEnabled(cfg),
   canResetStaff:isStaffPasswordResetEnabled(cfg)
  });
 }catch{return unavailable(id);}
}
