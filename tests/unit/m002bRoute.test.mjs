import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet as getTerms,onRequestPost as postTerms} from '../../functions/api/v1/terms.ts';
import {onRequestGet as getPrograms} from '../../functions/api/v1/programs.ts';
import {onRequestGet as getSubjects} from '../../functions/api/v1/subjects.ts';
import {onRequestGet as getClasses} from '../../functions/api/v1/classes.ts';
const env={};
test('all M002B list endpoints reject missing session before touching secrets',async()=>{
 for(const run of [getTerms,getPrograms,getSubjects,getClasses]){
  const result=await run({request:new Request('https://portalgenius.pages.dev/api/v1/terms'),env});
  assert.equal(result.status,401);
  assert.equal((await result.json()).error.code,'NOT_AUTHENTICATED');
 }
});
test('M002B term mutation validates environment, origin, session',async()=>{
 const config={SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'fake',SUPABASE_SECRET_KEY:'fake',SESSION_ENCRYPTION_KEY:'fake',
 SESSION_KEY_VERSION:'1',APP_ORIGIN:'https://portalgenius.pages.dev',
 APP_ENV:'staging',EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs'};
 const bad=await postTerms({request:new Request(config.APP_ORIGIN+'/api/v1/terms',{
 method:'POST',headers:{Origin:'https://untrusted.invalid'}}),env:config});
 assert.equal(bad.status,403);
 const absent=await postTerms({request:new Request(config.APP_ORIGIN+'/api/v1/terms',{
 method:'POST',headers:{Origin:config.APP_ORIGIN}}),env:config});
 assert.equal(absent.status,401);
});

test('M002B early rejection remains safe when Preview secrets are unavailable',async()=>{
 const preview='https://feat-m002b-semesters-catalog.portalgenius.pages.dev';
 const wrong=await postTerms({request:new Request(preview+'/api/v1/terms',{
  method:'POST',headers:{Origin:'https://attacker.invalid'}
 }),env:{}});
 assert.equal(wrong.status,403);
 const noCookie=await postTerms({request:new Request(preview+'/api/v1/terms',{
  method:'POST',headers:{Origin:preview}
 }),env:{}});
 assert.equal(noCookie.status,401);
 // This does not prove authenticated Preview mutations work.
});
