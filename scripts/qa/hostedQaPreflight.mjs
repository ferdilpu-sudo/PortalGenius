// READ ONLY. Never creates users, signs in, updates Auth, or mutates data.
// Usage: QA_PAGES_ORIGIN=https://<isolated-preview>.pages.dev
// QA_SUPABASE_PROJECT_REF=<isolated 20-char ref>
// QA_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... node --experimental-strip-types scripts/qa/hostedQaPreflight.mjs
import {pathToFileURL} from 'node:url';
import {hostedQaIdentity,HOSTED_QA_PATH} from '../../server/platform/hostedQaBoundary.ts';

export async function runHostedQaPreflight(config,fetchImpl=fetch){
 const env={
  APP_ENV:'staging',
  APP_ORIGIN:config.pagesOrigin,
  SUPABASE_URL:'https://'+config.supabaseRef+'.supabase.co',
  EXPECTED_SUPABASE_PROJECT_REF:config.supabaseRef
 };
 const expected=hostedQaIdentity(env,config.pagesOrigin+HOSTED_QA_PATH);
 if(!expected||typeof config.publishableKey!=='string'||
  !/^sb_publishable_[A-Za-z0-9_]+$/.test(config.publishableKey)){
  throw new Error('HOSTED_QA_TARGET_BLOCKED');
 }
 const pages=await fetchImpl(expected.appOrigin+HOSTED_QA_PATH,{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{'Cache-Control':'no-store'}
 });
 if(pages.status!==200)throw new Error('HOSTED_QA_PAGES_BINDING_BLOCKED');
 let body;
 try{body=await pages.json();}catch{throw new Error('HOSTED_QA_PAGES_BINDING_BLOCKED');}
 if(body?.data?.appOrigin!==expected.appOrigin||
  body?.data?.projectRef!==expected.projectRef)throw new Error('HOSTED_QA_PAGES_BINDING_BLOCKED');
 const auth=await fetchImpl(env.SUPABASE_URL+'/auth/v1/settings',{
  method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
  headers:{apikey:config.publishableKey,'Cache-Control':'no-store'}
 });
 if(auth.status!==200)throw new Error('HOSTED_QA_AUTH_SETTINGS_BLOCKED');
 let settings;
 try{settings=await auth.json();}catch{throw new Error('HOSTED_QA_AUTH_SETTINGS_BLOCKED');}
 if(settings?.disable_signup!==true)throw new Error('HOSTED_QA_SIGNUP_NOT_DISABLED');
 return {isolatedBinding:true,signupDisabled:true,scope:'READ_ONLY_PRECHECK'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 runHostedQaPreflight({
  pagesOrigin:process.env.QA_PAGES_ORIGIN,
  supabaseRef:process.env.QA_SUPABASE_PROJECT_REF,
  publishableKey:process.env.QA_SUPABASE_PUBLISHABLE_KEY
 }).then(()=>{
  console.log('HOSTED_QA_READ_ONLY_PRECHECK_PASS: isolated binding and signup-off visible');
  console.log('HOSTED_QA_MUTATION_GATES_NOT_RUN: synthetic E2E still blocked');
 }).catch(error=>{
  const code=error instanceof Error&&/^HOSTED_QA_[A-Z_]+$/.test(error.message)?
   error.message:'HOSTED_QA_NETWORK_OR_RESPONSE_BLOCKED';
  console.error(code);
  process.exitCode=1;
 });
}
