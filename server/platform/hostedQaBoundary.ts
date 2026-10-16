import type {Env} from './env.ts';

// Public production identifiers: NEVER substitute a guessed Preview binding.
// If Production moves, update these alongside wrangler.toml and their test.
export const PRODUCTION_PAGES_ORIGIN='https://portalgenius.pages.dev';
export const PRODUCTION_SUPABASE_REF='vpglikrkvsnoyjvluigs';
export const HOSTED_QA_PATH='/api/v1/qa/environment';

export type HostedQaIdentity={appOrigin:string;projectRef:string};

// Strict, read-only proof of which public environment identifiers the
// deployed Pages handler actually received. Never authorizes mutation.
export function hostedQaIdentity(env:Env,requestUrl:string):HostedQaIdentity|null{
 if(env.APP_ENV!=='staging'||!env.APP_ORIGIN||!env.SUPABASE_URL||
  !env.EXPECTED_SUPABASE_PROJECT_REF)return null;
 const ref=env.EXPECTED_SUPABASE_PROJECT_REF;
 if(!/^[a-z0-9]{20}$/.test(ref)||ref===PRODUCTION_SUPABASE_REF)return null;
 try{
  const pages=new URL(env.APP_ORIGIN);
  const supabase=new URL(env.SUPABASE_URL);
  const request=new URL(requestUrl);
  if(pages.protocol!=='https:'||
   !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pages\.dev$/.test(pages.hostname)||
   pages.origin!==env.APP_ORIGIN||pages.origin===PRODUCTION_PAGES_ORIGIN||
   pages.username||pages.password||pages.port||pages.search||pages.hash||
   supabase.protocol!=='https:'||
   supabase.hostname!==ref+'.supabase.co'||supabase.origin!==env.SUPABASE_URL.replace(/\/$/,'')||
   supabase.username||supabase.password||supabase.port||supabase.pathname!=='/'||
   supabase.search||supabase.hash||
   request.origin!==pages.origin||request.pathname!==HOSTED_QA_PATH||
   request.search||request.hash)return null;
  return {appOrigin:pages.origin,projectRef:ref};
 }catch{return null;}
}
