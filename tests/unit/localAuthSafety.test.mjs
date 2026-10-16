import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertLocalQaUrl} from '../../scripts/qa/localAuthProbe.mjs';
test('local Auth QA refuses every hosted endpoint, including Supabase production',()=>{
 for (const url of [
  'https://vpglikrkvsnoyjvluigs.supabase.co',
  'https://qfkjcjzwhewsbblgumco.supabase.co',
  'http://localhost:54321', 'http://127.0.0.1:54321',
  'http://127.0.0.1:55321.attacker.invalid',
  'https://127.0.0.1:55321','http://127.0.0.1:55321/other',
  'http://127.0.0.1:55321?redirect=https://example.com','not-a-url'
 ])assert.throws(()=>assertLocalQaUrl(url),/LOCAL_QA_REMOTE_URL_REJECTED/);
 assert.equal(assertLocalQaUrl('http://127.0.0.1:55321'),'http://127.0.0.1:55321');
});
