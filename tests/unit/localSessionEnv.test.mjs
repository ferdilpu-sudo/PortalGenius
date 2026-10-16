import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyEnv} from '../../server/platform/env.ts';
const local={
 SUPABASE_URL:'http://127.0.0.1:55321',APP_ENV:'local',
 EXPECTED_SUPABASE_PROJECT_REF:'LOCAL_QA_ONLY',APP_ORIGIN:'http://127.0.0.1:55325',
 SUPABASE_PUBLISHABLE_KEY:'synthetic-pub',SUPABASE_SECRET_KEY:'synthetic-secret',
 SESSION_ENCRYPTION_KEY:'synthetic-encryption',SESSION_KEY_VERSION:'1'
};
test('exactly pinned local QA provider is accepted only with local marker',()=>{
 assert.equal(verifyEnv({...local}).SUPABASE_URL,'http://127.0.0.1:55321');
 for(const override of [
  {APP_ENV:'production'}, {APP_ENV:'staging'},
  {EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs'},
  {SUPABASE_URL:'http://localhost:55321'},
  {SUPABASE_URL:'http://127.0.0.1:55322'},
  {SUPABASE_URL:'http://127.0.0.1:55321.attacker.invalid'},
  {SUPABASE_URL:'http://127.0.0.1:55321/path'},
  {SUPABASE_URL:'https://127.0.0.1:55321'},
  {SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co'}
 ])assert.throws(()=>verifyEnv({...local,...override}),/CONFIG_PROJECT_REF_MISMATCH|Invalid URL/);
});
test('production still requires project-specific HTTPS Supabase host',()=>{
 const prod={...local,APP_ENV:'production',APP_ORIGIN:'https://portalgenius.pages.dev',
  SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
  EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs'};
 assert.equal(verifyEnv(prod).SUPABASE_URL,prod.SUPABASE_URL);
 assert.throws(()=>verifyEnv({...prod,SUPABASE_URL:'http://127.0.0.1:55321'}),/CONFIG_PROJECT_REF_MISMATCH/);
});
