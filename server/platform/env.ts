import {PRODUCTION_PAGES_ORIGIN,PRODUCTION_SUPABASE_REF} from './hostedQaBoundary.ts';
export type Env={
  SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string;SUPABASE_SECRET_KEY?:string;
  SESSION_ENCRYPTION_KEY?:string;SESSION_KEY_VERSION?:string;
  APP_ORIGIN?:string;APP_ENV?:string;AUTH_ALIAS_DOMAIN?:string;ACCOUNT_PROVISIONING_ENABLED?:string;ACCOUNT_PROVISIONING_RELEASE?:string;
  EXPECTED_SUPABASE_PROJECT_REF?:string;
};
export type VerifiedEnv=Required<Omit<Env,'AUTH_ALIAS_DOMAIN'|'ACCOUNT_PROVISIONING_ENABLED'|'ACCOUNT_PROVISIONING_RELEASE'>> & Pick<Env,'AUTH_ALIAS_DOMAIN'|'ACCOUNT_PROVISIONING_ENABLED'|'ACCOUNT_PROVISIONING_RELEASE'>;
export function verifyEnv(env:Env):VerifiedEnv {
  const required=[
    'SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY',
    'SESSION_ENCRYPTION_KEY','SESSION_KEY_VERSION','APP_ORIGIN',
    'APP_ENV','EXPECTED_SUPABASE_PROJECT_REF'
  ] as const;
  for(const key of required) if(!env[key])throw new Error('CONFIG_MISSING_'+key);
  const cfg=env as VerifiedEnv;
  const url=new URL(cfg.SUPABASE_URL);
  // This exact loopback-only exception enables isolated Windows Docker QA.
  // Production/staging cannot resolve arbitrary HTTP destinations through it.
  const localQa=cfg.APP_ENV==='local'&&
    cfg.EXPECTED_SUPABASE_PROJECT_REF==='LOCAL_QA_ONLY'&&
    cfg.SUPABASE_URL==='http://127.0.0.1:55321';
  if(!localQa&&(url.protocol!=='https:'||
    url.hostname!==cfg.EXPECTED_SUPABASE_PROJECT_REF+'.supabase.co'||url.pathname!=='/'))
    throw new Error('CONFIG_PROJECT_REF_MISMATCH');
  const appUrl=new URL(cfg.APP_ORIGIN);
  if(appUrl.origin!==cfg.APP_ORIGIN)throw new Error('CONFIG_APP_ORIGIN_INVALID');
  if(cfg.APP_ENV!=='local'&&appUrl.protocol!=='https:')throw new Error('CONFIG_REQUIRE_HTTPS');
  // A Cloudflare Preview may inherit the Production project bindings.
  // The canonical Production origin can never be labelled staging, and
  // the production runtime may not silently point to an unrelated project.
  if(cfg.APP_ORIGIN===PRODUCTION_PAGES_ORIGIN&&cfg.APP_ENV!=='production')
    throw new Error('CONFIG_PRODUCTION_ENV_MISMATCH');
  // This project intentionally has no hosted staging database. Treat any
  // staging deployment that points at the real PortalGenius database as a
  // configuration error, even for read-only application handlers.
  if(cfg.APP_ENV==='staging'&&
    cfg.EXPECTED_SUPABASE_PROJECT_REF===PRODUCTION_SUPABASE_REF)
    throw new Error('CONFIG_STAGING_PRODUCTION_BINDING_BLOCKED');
  if(cfg.APP_ENV==='production'&&(
   cfg.APP_ORIGIN!==PRODUCTION_PAGES_ORIGIN||
   cfg.EXPECTED_SUPABASE_PROJECT_REF!==PRODUCTION_SUPABASE_REF
  ))throw new Error('CONFIG_PRODUCTION_IDENTITY_MISMATCH');
  if(!['local','staging','production'].includes(cfg.APP_ENV))throw new Error('CONFIG_APP_ENV_INVALID');
  if(!/^[1-9][0-9]*$/.test(cfg.SESSION_KEY_VERSION))throw new Error('CONFIG_KEY_VERSION_INVALID');
  return cfg;
}
