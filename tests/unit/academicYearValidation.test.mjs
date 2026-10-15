import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAcademicYear,isUUID } from '../../contracts/master/academicYearValidation.ts';
import { hasAdminAccess } from '../../contracts/auth/roles.ts';
test('academic year accepts complete inclusive local date boundaries',()=>{
  assert.deepEqual(validateAcademicYear({label:' 2026/2027 ',startDate:'2026-07-01',endDate:'2027-06-30'}),{
    label:'2026/2027',startDate:'2026-07-01',endDate:'2027-06-30'
  });
});
test('academic year rejects impossible/overlap-invalid dates and empty labels',()=>{
  for(const value of [
    {label:'2026',startDate:'2026-02-30',endDate:'2026-12-31'},
    {label:'2026',startDate:'2026-07-01',endDate:'2026-06-30'},
    {label:'  ',startDate:'2026-07-01',endDate:'2027-06-30'},
    {label:'2026',startDate:'abc',endDate:'2027-06-30'},
    {label:'2026',startDate:'1999-01-01',endDate:'2001-01-01'}
  ])assert.equal(validateAcademicYear(value),null);
});
test('only admin who has completed password change can manage academic year',()=>{
  const base={id:'test',displayName:'Test',roles:['teacher'],mustChangePassword:false};
  assert.equal(hasAdminAccess(base),false);
  assert.equal(hasAdminAccess({...base,roles:['admin'],mustChangePassword:true}),false);
  assert.equal(hasAdminAccess({...base,roles:['teacher','admin']}),true);
  assert.equal(hasAdminAccess(null),false);
});
test('mutation idempotency key must be UUID',()=>{
  assert.equal(isUUID('b1a971d2-6c94-4e9a-8a12-96c5ff117e54'),true);
  assert.equal(isUUID(null),false);
  assert.equal(isUUID('fake-key'),false);
});
