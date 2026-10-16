import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const localFixture=readFileSync(new URL('../../scripts/qa/localSessionFixtures.sql',import.meta.url),'utf8');
test('local-only SQL fixture uses balanced PostgreSQL body quote tags',()=>{
 const functions=[...localFixture.matchAll(/create function public\.(pg_qa_[a-z_]+)\(/g)].map(m=>m[1]);
 assert.deepEqual(functions,[
  'pg_qa_bind_staff','pg_qa_replace_tokens','pg_qa_hold_lease','pg_qa_unbind_staff'
 ]);
 const bodies=[...localFixture.matchAll(/\bas (\$[a-zA-Z_0-9]*\$)[\s\S]*?\bend \1;/g)];
 assert.equal(bodies.length,functions.length,
  'every QA SQL function must have complete matching dollar-quoted body delimiters');
 assert.doesNotMatch(localFixture,/\bas \$(?!\$|[A-Za-z_0-9]+\$)/,
  'a bare $ is not a valid PostgreSQL dollar-quoted function body');
});
test('QA SQL is isolated and server-only, not a production migration',()=>{
 assert.match(localFixture,/Never apply this file to hosted Supabase projects/);
 assert.match(localFixture,/revoke all on function/);
 assert.match(localFixture,/grant execute on function[\s\S]*to service_role;/);
 assert.doesNotMatch(localFixture,/pg_auth_session_revoke\(.*\) from public/i);
});
