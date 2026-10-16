import type {Env} from '../platform/env.ts';
import {PRODUCTION_PAGES_ORIGIN,PRODUCTION_SUPABASE_REF} from '../platform/hostedQaBoundary.ts';

function isStagingPreview(env:Env):boolean{
 if(env.APP_ENV!=='staging'||!env.APP_ORIGIN)return false;
 try{
  const url=new URL(env.APP_ORIGIN);
  return url.protocol==='https:'&&url.hostname.endsWith('.pages.dev')&&
   url.hostname!=='portalgenius.pages.dev'&&url.pathname==='/'&&
   url.origin===env.APP_ORIGIN;
 }catch{return false;}
}
function isKnownProduction(env:Env):boolean{
 return env.APP_ENV==='production'&&
  env.APP_ORIGIN===PRODUCTION_PAGES_ORIGIN&&
  env.EXPECTED_SUPABASE_PROJECT_REF===PRODUCTION_SUPABASE_REF&&
  env.SUPABASE_URL==='https://'+PRODUCTION_SUPABASE_REF+'.supabase.co';
}

/**
 * No flags are committed to wrangler.toml. Production account creation
 * requires TWO explicit runtime opt-ins and the exact production identity.
 * This function alone does not authenticate an actor; routes still demand
 * an active admin session, same Origin, CSRF and an idempotency key.
 */
export function isProvisioningEnabled(env:Env):boolean{
 if(env.ACCOUNT_PROVISIONING_ENABLED!=='enabled')return false;
 if(isStagingPreview(env))return true;
 return isKnownProduction(env)&&env.ACCOUNT_PROVISIONING_RELEASE==='reviewed-v1';
}

/**
 * Production password reset stays OFF until an approved, tested recovery
 * protocol for unknown/pending Auth updates exists. A creation release must
 * never accidentally activate reset through a shared feature gate.
 */
export function isStaffPasswordResetEnabled(env:Env):boolean{
 return isStagingPreview(env)&&isProvisioningEnabled(env);
}
