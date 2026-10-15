import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAdminEmail} from '../../scripts/bootstrap-admin-input.mjs';
test('admin auth accepts operator-owned complete email',()=>{
  assert.equal(validateAdminEmail('  Admin.School+PG@Gmail.com  '),'admin.school+pg@gmail.com');
  assert.equal(validateAdminEmail('staff@school.sch.id'),'staff@school.sch.id');
});
test('admin auth rejects domain-only or invalid email',()=>{
  for(const v of [undefined,'','gmail.com','school.sch.id','staff@localhost','@gmail.com','bad email@gmail.com','staff@example.invalid']){
    assert.equal(validateAdminEmail(v),null,String(v));
  }
});
