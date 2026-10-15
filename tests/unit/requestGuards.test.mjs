import assert from 'node:assert/strict';
import test from 'node:test';
import { isTrustedMutation, readSmallJson } from '../../server/platform/requestGuard.ts';
import { verifyEnv } from '../../server/platform/env.ts';
test('mutation origin matches exactly; hostile/missing origins blocked',()=>{
  const origin='https://portalgenius.example.org';
  const req=headers=>new Request(origin+'/api/v1/auth/logout',{method:'POST',headers});
  assert.equal(isTrustedMutation(req({'Origin':origin}),origin),true);
  assert.equal(isTrustedMutation(req({'Origin':origin+'.evil.test'}),origin),false);
  assert.equal(isTrustedMutation(req({}),origin),false);
  assert.equal(isTrustedMutation(req({'Referer':origin+'/dashboard'}),origin),true);
  assert.equal(isTrustedMutation(req({'Referer':'https://phishing.test'}),origin),false);
});
test('JSON body parser rejects wrong type, oversized payload and bad JSON',async()=>{
  const req=(content,type='application/json')=>new Request('https://example.org',{
    method:'POST',headers:{'Content-Type':type},body:content
  });
  assert.deepEqual(await readSmallJson(req('{"ok":true}')),{ok:true});
  await assert.rejects(()=>readSmallJson(req('{"ok":true}','text/plain')));
  await assert.rejects(()=>readSmallJson(req('x'.repeat(4200))));
  await assert.rejects(()=>readSmallJson(req('not-json')));
});
test('environment must target dedicated Supabase project and HTTPS hosted',()=>{
  const good={
    SUPABASE_URL:'https://vpglikrkvsnoyjvluigs.supabase.co',
    SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable-key',
    SUPABASE_SECRET_KEY:'synthetic-secret-key',
    SESSION_ENCRYPTION_KEY:'synthetic-session-key',
    SESSION_KEY_VERSION:'1',APP_ORIGIN:'https://portalgenius.example.org',
    APP_ENV:'staging',AUTH_ALIAS_DOMAIN:'accounts.example.org',
    EXPECTED_SUPABASE_PROJECT_REF:'vpglikrkvsnoyjvluigs'
  };
  assert.equal(verifyEnv(good).APP_ENV,'staging');
  assert.equal(verifyEnv({...good,AUTH_ALIAS_DOMAIN:undefined}).APP_ENV,'staging');
  assert.throws(()=>verifyEnv({...good,SUPABASE_URL:'https://qfkjcjzwhewsbblgumco.supabase.co'}));
  assert.throws(()=>verifyEnv({...good,APP_ORIGIN:'http://portalgenius.example.org'}));
  assert.throws(()=>verifyEnv({...good,SESSION_KEY_VERSION:'0'}));
});
