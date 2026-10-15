import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePasswordChange } from '../../contracts/auth/passwordValidation.ts';
test('password change requires a different strong password',()=>{
  assert.equal(validatePasswordChange({currentPassword:'old',newPassword:'short'}),null);
  assert.equal(validatePasswordChange({currentPassword:'samepassword123',newPassword:'samepassword123'}),null);
  assert.deepEqual(validatePasswordChange({currentPassword:'old',newPassword:'verylongpassword123'}),{
    currentPassword:'old',newPassword:'verylongpassword123'
  });
});
