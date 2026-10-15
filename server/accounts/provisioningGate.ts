import type {Env} from '../platform/env.ts';
// Explicit opt-in for test deployment. This is OFF on Cloudflare by default.
export function isProvisioningEnabled(env:Env):boolean{
 return env.ACCOUNT_PROVISIONING_ENABLED==='enabled'&&env.APP_ENV==='staging';
}
