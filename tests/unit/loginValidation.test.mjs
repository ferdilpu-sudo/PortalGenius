import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUsername, validateCredentials } from '../../contracts/auth/loginValidation.ts';
test('username normalized without email',()=>{
  assert.equal(normalizeUsername('  Guru.Satu  '),'guru.satu');
  assert.deepEqual(validateCredentials({username:'Guru.Satu',password:'abcdefghijkl'}),{
    username:'guru.satu',password:'abcdefghijkl'
  });
});
test('invalid input fails closed',()=>{
  assert.equal(validateCredentials({username:'ab',password:'abcdefghijkl'}),null);
  assert.equal(validateCredentials({username:'guru',password:'123'}),null);
  assert.equal(validateCredentials({username:'root',password:'abcdefghijkl'}),null);
});
