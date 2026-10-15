import assert from 'node:assert/strict';
import test from 'node:test';
import { base64url, decryptTokens, digestHandle, encryptTokens, hmacString, newSessionHandle, verifyCsrf } from '../../server/platform/crypto.ts';
import { deleteSessionCookie, getCookie, SESSION_COOKIE, sessionCookie } from '../../server/platform/cookie.ts';
const key=base64url(Uint8Array.from({length:32},(_,i)=>i+1));
test('session handle has stable cryptographic length and SHA-256 digest',async()=>{
  const a=newSessionHandle(),b=newSessionHandle();
  assert.equal(a.length,43);
  assert.notEqual(a,b);
  assert.match(await digestHandle(a),/^[0-9a-f]{64}$/);
});
test('session AES-GCM authenticates user ID and rejects tampering',async()=>{
  const user='00000000-0000-4000-8000-000000000001';
  const encrypted=await encryptTokens(key,user,{accessToken:'synthetic-token',refreshToken:'synthetic-refresh'});
  const decrypted=await decryptTokens(key,user,encrypted);
  assert.deepEqual(decrypted,{accessToken:'synthetic-token',refreshToken:'synthetic-refresh'});
  await assert.rejects(()=>decryptTokens(key,'another-user',encrypted));
  const bad=encrypted.slice(0,-1)+(encrypted.endsWith('A')?'B':'A');
  await assert.rejects(()=>decryptTokens(key,user,bad));
});
test('CSRF uses distinct context and rejects false tokens',async()=>{
  const handle=newSessionHandle();
  const csrf=await hmacString(key,'csrf',handle);
  const throttle=await hmacString(key,'login-throttle',handle);
  assert.notEqual(csrf,throttle);
  assert.equal(await verifyCsrf(key,handle,csrf),true);
  assert.equal(await verifyCsrf(key,handle,throttle),false);
  assert.equal(await verifyCsrf(key,handle,null),false);
});
test('cookies use __Host Secure HttpOnly and clearing semantics',()=>{
  const value=newSessionHandle(),cookie=sessionCookie(value);
  assert.match(cookie,/^__Host-pg_session=/);
  assert.match(cookie,/; HttpOnly; Secure; SameSite=Lax; Path=\//);
  assert.doesNotMatch(cookie,/Domain=/);
  const req=new Request('https://example.org',{headers:{Cookie:`other=x; ${SESSION_COOKIE}=${value}`}});
  assert.equal(getCookie(req,SESSION_COOKIE),value);
  assert.match(deleteSessionCookie(),/Max-Age=0/);
});
