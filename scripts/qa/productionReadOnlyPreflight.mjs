// PortalGenius single-project production READ-ONLY safety check.
// Never creates/logs in/deletes users or changes Auth or database records.
// Usage: node --experimental-strip-types scripts/qa/productionReadOnlyPreflight.mjs
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {PRODUCTION_PAGES_ORIGIN,PRODUCTION_SUPABASE_REF} from '../../server/platform/hostedQaBoundary.ts';

const SUPABASE_ORIGIN='https://'+PRODUCTION_SUPABASE_REF+'.supabase.co';
const PUBLIC_API_HEALTH='/api/v1/health';
const AUTH_SETTINGS='/auth/v1/settings';

export function parseProductionBinding(toml){
 if(typeof toml!=='string')throw new Error('PRODUCTION_CONFIG_BLOCKED');
 const section=toml.match(/(?:^|\n)\[vars\]\s*\n([^]*?)(?=\n\[|$)/);
 if(!section)throw new Error('PRODUCTION_CONFIG_BLOCKED');
 function single(name){
  const matches=[...section[1].matchAll(new RegExp('^\\s*'+name+'\\s*=\\s*"([^"\\r\\n]*)"\\s*$','gm'))];
  return matches.length===1?matches[0][1]:null;
 }
 const appOrigin=single('APP_ORIGIN');
 const supabaseUrl=single('SUPABASE_URL');
 const projectRef=single('EXPECTED_SUPABASE_PROJECT_REF');
 const appEnv=single('APP_ENV');
 const publicKey=single('SUPABASE_PUBLISHABLE_KEY');
 const releaseFlags=/^\s*(?:ACCOUNT_PROVISIONING_ENABLED|ACCOUNT_PROVISIONING_RELEASE)\s*=/m.test(section[1]);
 if(appOrigin!==PRODUCTION_PAGES_ORIGIN||supabaseUrl!==SUPABASE_ORIGIN||
  projectRef!==PRODUCTION_SUPABASE_REF||appEnv!=='production'||releaseFlags||
  typeof publicKey!=='string'||!/^sb_publishable_[A-Za-z0-9_]+$/.test(publicKey))
  throw new Error('PRODUCTION_CONFIG_BLOCKED');
 return {appOrigin,supabaseUrl,projectRef,publicKey};
}

export async function runProductionReadOnlyPreflight(config,fetchImpl=fetch){
 if(!config||config.appOrigin!==PRODUCTION_PAGES_ORIGIN||
  config.supabaseUrl!==SUPABASE_ORIGIN||
  config.projectRef!==PRODUCTION_SUPABASE_REF||
  typeof config.publicKey!=='string'||
  !/^sb_publishable_[A-Za-z0-9_]+$/.test(config.publicKey))
  throw new Error('PRODUCTION_TARGET_BLOCKED');
 const health=await fetchImpl(PRODUCTION_PAGES_ORIGIN+PUBLIC_API_HEALTH,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{Accept:'application/json','Cache-Control':'no-store'}
 });
 if(health.status!==200)throw new Error('PRODUCTION_API_HEALTH_BLOCKED');
 let payload;
 try{payload=await health.json();}
 catch{throw new Error('PRODUCTION_API_HEALTH_BLOCKED');}
 if(payload?.data?.service!=='PortalGenius API'||payload?.data?.status!=='ok')
  throw new Error('PRODUCTION_API_HEALTH_BLOCKED');
 const auth=await fetchImpl(SUPABASE_ORIGIN+AUTH_SETTINGS,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{apikey:config.publicKey,Accept:'application/json','Cache-Control':'no-store'}
 });
 if(auth.status!==200)throw new Error('PRODUCTION_AUTH_SETTINGS_BLOCKED');
 let settings;
 try{settings=await auth.json();}
 catch{throw new Error('PRODUCTION_AUTH_SETTINGS_BLOCKED');}
 if(settings?.disable_signup!==true)
  throw new Error('PRODUCTION_PUBLIC_SIGNUP_NOT_DISABLED');
 return {apiReachable:true,publicSignupDisabled:true,scope:'READ_ONLY_PRODUCTION'};
}

if(process.argv[1]&&resolve(process.argv[1])===pathToFileURL(import.meta.url).pathname){
 // Do not print configuration, network payloads or the publishable key.
 try{
  const config=parseProductionBinding(readFileSync('wrangler.toml','utf8'));
  await runProductionReadOnlyPreflight(config);
  console.log('PRODUCTION_READ_ONLY_PREFLIGHT_PASS: API health and Auth signup-off');
  console.log('PRODUCTION_NO_MUTATION: backup, deployment binding and onboarding still unverified');
 }catch(error){
  const code=error instanceof Error&&/^PRODUCTION_[A-Z_]+$/.test(error.message)?
   error.message:'PRODUCTION_READ_ONLY_NETWORK_BLOCKED';
  console.error(code);
  process.exitCode=1;
 }
}
