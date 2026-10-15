import assert from 'node:assert/strict';
import test from 'node:test';
import {onRequestGet,onRequestPost} from '../../functions/api/v1/academic-years.ts';

const env={
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key',
  SUPABASE_SECRET_KEY:'synthetic-server-key',
  SESSION_ENCRYPTION_KEY:'synthetic-key-not-used-without-cookie',
  SESSION_KEY_VERSION:'1',
  APP_ORIGIN:'https://portalgenius.pages.dev',
  APP_ENV:'staging',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs'
};
test('academic year GET denies request with no session before DB access',async()=>{
  const request=new Request('https://portalgenius.pages.dev/api/v1/academic-years');
  const response=await onRequestGet({request,env});
  assert.equal(response.status,401);
  assert.equal((await response.json()).error.code,'NOT_AUTHENTICATED');
});
test('academic year mutation denies foreign origin before reading cookie',async()=>{
  const request=new Request('https://portalgenius.pages.dev/api/v1/academic-years',{
    method:'POST',
    headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},
    body:JSON.stringify({label:'2026/2027',startDate:'2026-07-01',endDate:'2027-06-30'})
  });
  const response=await onRequestPost({request,env});
  assert.equal(response.status,403);
  assert.equal((await response.json()).error.code,'ORIGIN_DENIED');
});
test('academic year mutation requires login for trusted origin',async()=>{
  const request=new Request('https://portalgenius.pages.dev/api/v1/academic-years',{
    method:'POST',headers:{Origin:env.APP_ORIGIN}
  });
  const response=await onRequestPost({request,env});
  assert.equal(response.status,401);
  assert.equal((await response.json()).error.code,'NOT_AUTHENTICATED');
});
