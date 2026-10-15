import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canReadStudentSummary} from '../../contracts/auth/studentAccess.ts';
import {jakartaDate} from '../../contracts/shared/jakartaDate.ts';
import {onRequestGet as students} from '../../functions/api/v1/students.ts';
import {onRequestGet as accounts} from '../../functions/api/v1/accounts.ts';
import {onRequestGet as teachers} from '../../functions/api/v1/teachers.ts';
import {onRequestGet as assignments} from '../../functions/api/v1/assignments.ts';
const base={id:'synthetic',displayName:'Synthetic',mustChangePassword:false,roles:[]};
test('student projection permits teacher/counselor/admin, blocks principal-only',()=>{
 for(const role of ['teacher','counselor','admin'])assert.equal(canReadStudentSummary({...base,roles:[role]}),true);
 assert.equal(canReadStudentSummary({...base,roles:['principal']}),false);
 assert.equal(canReadStudentSummary({...base,roles:['teacher'],mustChangePassword:true}),false);
 assert.equal(canReadStudentSummary(null),false);
});
test('Jakarta date uses UTC+7 across midnight',()=>{
 assert.equal(jakartaDate(new Date('2026-10-15T16:59:00Z')),'2026-10-15');
 assert.equal(jakartaDate(new Date('2026-10-15T17:01:00Z')),'2026-10-16');
});
test('student and privileged master endpoints deny anonymous callers',async()=>{
 for(const route of [students,accounts,teachers,assignments]){
  const request=new Request('https://portalgenius.pages.dev/api/v1/students');
  const response=await route({request,env:{}});
  assert.equal(response.status,401);
  assert.equal((await response.json()).error.code,'NOT_AUTHENTICATED');
 }
});
