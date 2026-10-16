import type {Env} from '../platform/env.ts';
import {PRODUCTION_PAGES_ORIGIN,PRODUCTION_SUPABASE_REF} from '../platform/hostedQaBoundary.ts';

/**
 * PortalGenius uses one hosted database. Preview builds can share Production
 * bindings, so APP_ENV='staging' and a Pages preview hostname are NEVER
 * evidence of isolation or permission to write.
 */
function isExactProductionTarget(env:Env):boolean{
 return env.APP_ENV==='production'&&
  env.APP_ORIGIN===PRODUCTION_PAGES_ORIGIN&&
  env.EXPECTED_SUPABASE_PROJECT_REF===PRODUCTION_SUPABASE_REF&&
  env.SUPABASE_URL==='https://'+PRODUCTION_SUPABASE_REF+'.supabase.co';
}

/**
 * Account creation is OFF by default and only has an explicitly reviewed
 * Production release path. Both runtime flags must be set deliberately;
 * neither is committed to wrangler.toml. Caller authorization, Origin, CSRF
 * and idempotency remain mandatory in the BFF POST handler.
 */
export function isProvisioningEnabled(env:Env):boolean{
 return isExactProductionTarget(env)&&
  env.ACCOUNT_PROVISIONING_ENABLED==='enabled'&&
  env.ACCOUNT_PROVISIONING_RELEASE==='reviewed-v1';
}

/**
 * There is no approved reconciliation mutation for unknown Auth password
 * updates. Refuse every reset request on Production, Preview and local.
 */
export function isStaffPasswordResetEnabled(_env:Env):boolean{
 return false;
}
