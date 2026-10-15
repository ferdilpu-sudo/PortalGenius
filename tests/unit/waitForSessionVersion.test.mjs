import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForSessionVersion} from '../../server/auth/waitForSessionVersion.ts';

test('parallel refresh reader observes committed higher version',async()=>{
  let count=0;const waited=[];
  const result=await waitForSessionVersion(
    async()=>({session:{version:++count>=3?8:7}}),7,
    async(ms)=>{waited.push(ms);}
  );
  assert.equal(result?.session.version,8);
  assert.deepEqual(waited,[60,120,240]);
});
test('revoked or expired session stops reader without returning state',async()=>{
  let waited=0;
  const result=await waitForSessionVersion(async()=>null,1,async()=>{waited++;});
  assert.equal(result,null);assert.equal(waited,1);
});
test('stuck refresh lease has a bounded retry window',async()=>{
  let reads=0;
  await assert.rejects(
    waitForSessionVersion(async()=>{reads++;return {session:{version:5}};},5,async()=>{}),
    /SESSION_REFRESH_BUSY/
  );
  assert.equal(reads,5);
});
