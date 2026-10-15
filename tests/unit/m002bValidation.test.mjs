import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTerm} from '../../contracts/master/termValidation.ts';
import {validateCatalog} from '../../contracts/master/catalogValidation.ts';
import {validateClass} from '../../contracts/master/classValidation.ts';
const yearId='eac57649-42e3-46e9-8aa9-e44577166835';
test('term accepts valid year, dates and name',()=>{
 assert.deepEqual(validateTerm({yearId,name:'  Semester Ganjil ',startDate:'2026-07-01',endDate:'2026-12-31'}),
 {yearId,name:'Semester Ganjil',startDate:'2026-07-01',endDate:'2026-12-31'});
});
test('term rejects invalid references, reversed or impossible dates',()=>{
 for(const v of [{yearId:'?',name:'Ganjil',startDate:'2026-07-01',endDate:'2026-12-31'},
 {yearId,name:'Ganjil',startDate:'2026-09-01',endDate:'2026-01-01'},
 {yearId,name:'Ganjil',startDate:'2026-02-30',endDate:'2026-12-31'}])
 assert.equal(validateTerm(v),null);
});
test('catalog code normalized; blank or punctuation code denied',()=>{
 assert.deepEqual(validateCatalog({code:' ips_01 ',name:' IPS Terpadu '}),{code:'IPS_01',name:'IPS Terpadu'});
 assert.equal(validateCatalog({code:'IPS.JS',name:'Ilmu'}),null);
 assert.equal(validateCatalog({code:'ok',name:''}),null);
});
test('class level restricts exact grade bands and valid UUID',()=>{
 assert.deepEqual(validateClass({yearId,level:'smp',grade:9,name:' IX A '}),{
 yearId,level:'smp',grade:9,name:'IX A'});
 for(const [level,grade] of [['sd',7],['smp',6],['sma',9],['smp',9.5]])
 assert.equal(validateClass({yearId,level,grade,name:'A'}),null);
});
