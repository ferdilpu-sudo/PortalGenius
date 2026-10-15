import type {Env} from '../platform/env.ts';
// Fail closed: even a mistakenly configured Cloudflare secret cannot activate
// account provisioning on the primary production hostname.
// Production enablement requires a separately reviewed code change.
export function isProvisioningEnabled(env:Env):boolean{
 if(env.ACCOUNT_PROVISIONING_ENABLED!=='enabled'||env.APP_ENV!=='staging')return false;
 if(!env.APP_ORIGIN)return false;
 try{
  const url=new URL(env.APP_ORIGIN);
  return url.protocol==='https:'&&url.hostname.endsWith('.pages.dev')&&
   url.hostname!=='portalgenius.pages.dev'&&url.pathname==='/'&&url.origin===env.APP_ORIGIN;
 }catch{return false;}
}
