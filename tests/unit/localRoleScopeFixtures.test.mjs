import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const roleSql=readFileSync(new URL('../../scripts/qa/localRoleScopeFixtures.sql',import.meta.url),'utf8');
const runner=readFileSync(new URL('../../scripts/qa/localRoleE2E.mjs',import.meta.url),'utf8');
const windows=readFileSync(new URL('../../scripts/qa-local-auth.ps1',import.meta.url),'utf8');
test('local role SQL fixture has balanced function delimiters and service-only RPCs',()=>{
 const fns=[...roleSql.matchAll(/create function public\.(pg_qa_[a-z_]+)\(/g)].map(x=>x[1]);
 assert.deepEqual(fns,['pg_qa_seed_role_scopes','pg_qa_clear_role_scopes']);
 assert.equal([...roleSql.matchAll(/\$qa\$/g)].length,4);
 assert.match(roleSql,/revoke all on function[\s\S]*from public,anon,authenticated;/);
 assert.match(roleSql,/grant execute on function[\s\S]*to service_role;/);
 assert.match(roleSql,/Never copy into supabase\/migrations/);
 assert.match(roleSql,/LOCAL_QA_SEED_NOT_EMPTY_OR_INVALID/);
 assert.match(roleSql,/LOCAL_QA_REFUSE_NON_FIXTURE_DATA/);
 assert.match(roleSql,/get stacked diagnostics v_code = returned_sqlstate;/i);
 assert.match(roleSql,/LOCAL_ROLE_QA_STAGE_%_SQLSTATE_%/);
 for(const stage of ['ASSIGNMENT_STUDENTS','COUNSELOR_ASSIGNMENTS',
  'TEACHING_ASSIGNMENTS','STUDENTS','TEACHERS','TERMS','SUBJECTS',
  'ACADEMIC_YEARS','VERIFY_EMPTY'])
  assert.ok(roleSql.includes("v_step:='"+stage+"'"),stage);
});
test('role E2E uses all six synthetic roles and guarded student scope assertions',()=>{
 for(const identifier of [
  'qa_admin','qa_teacher_a','qa_teacher_b',
  'qa_counselor_a','qa_counselor_b','qa_principal',
  'LOCAL_ROLE_QA_CLEANUP_PASS','LOCAL_ROLE_E2E_QA_PASS',
  'SCOPE_MISMATCH_','PRINCIPAL_STUDENTS_NOT_DENIED',
  'ANON_DIRECT_TABLE_ALLOWED','AUTHENTICATED_DIRECT_TABLE_ALLOWED','ACTOR_SPOOF'
 ])assert.ok(runner.includes(identifier),identifier);
 for(const marker of [
  'LOCAL_ROLE_QA_CLEANUP_DIAGNOSTIC',
  'SCOPES_CLEAR','SCOPES_CLEAR_STAGE_',
  'ACCOUNT_CLEANUP_SKIPPED_SCOPE_DEPENDENCY','_UNBIND',
  '_AUTH_DELETE_SKIPPED_UNBIND_DEPENDENCY','LOCAL_ROLE_QA_CLEANUP_FAILED'
 ])assert.ok(runner.includes(marker),marker);
 assert.doesNotMatch(runner,/console\.error\(.*?\.message.*?\)/,
   'cleanup must never log provider or database error messages');
 const cleanup=runner.indexOf('LOCAL_ROLE_QA_CLEANUP_PASS');
 const result=runner.indexOf('LOCAL_ROLE_E2E_QA_PASS');
 assert.ok(cleanup>0&&cleanup<result,'completion marker must follow cleanup');
});
test('role QA copies real projection migrations only in opt-in disposable Docker mode',()=>{
 assert.match(windows,/param\(\[switch\]\$SessionE2E, \[switch\]\$RoleE2E\)/);
 assert.match(windows,/if \(\$RoleE2E\) \{ \$SessionE2E = \$true \}/);
 for(const file of [
  '20261015183000_m002_academic_catalog_foundation.sql',
  '20261015125808_m002c_identity_relations.sql',
  '20261015125814_m002c_scoped_student_projection.sql',
  '20261015125821_m002c_admin_read_projections.sql',
  'localRoleScopeFixtures.sql'
 ])assert.ok(windows.includes(file),file);
 assert.match(windows,/LOCAL_ROLE_QA_START/);
 assert.match(windows,/supabase\\migrations/);
 assert.doesNotMatch(windows,/Invoke-LocalCli\s+@\('link'/);
});
