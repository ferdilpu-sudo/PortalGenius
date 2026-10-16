import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lintSource} from '../../scripts/quality/lint.mjs';
import {formatFindings} from '../../scripts/quality/format.mjs';
test('AST lint catches executable eval and debugger, not lookalike words in strings',()=>{
 assert.deepEqual(lintSource('safe.ts',"const note='debugger; eval(1)';\n"),[]);
 assert.deepEqual(lintSource('bad.ts','debugger; eval("unsafe");\n').map(x=>x.rule),
  ['no-debugger','no-eval']);
});
test('AST lint catches dynamic Function and string timers',()=>{
 assert.deepEqual(lintSource('bad.ts','new Function("return 1"); setTimeout("x()",0);\n').map(x=>x.rule),
  ['no-function-constructor','no-string-timer']);
});
test('AST lint fails on unsafe React injection and TS suppression',()=>{
 const issues=lintSource('bad.tsx','const props={dangerouslySetInnerHTML:{__html:"x"}};\n// @ts-ignore\n');
 assert.deepEqual(issues.map(x=>x.rule),['no-unsafe-html','no-typecheck-suppression']);
});
test('format checks detect real source violations and accept normalized whitespace',()=>{
 assert.deepEqual(formatFindings('const x=1;\n'),[]);
 assert.ok(formatFindings('const x = 1;  \r\n').includes('trailing-whitespace'));
 assert.ok(formatFindings('const x=1;').includes('missing-final-newline'));
 assert.ok(formatFindings('\tconst x=1;\n').includes('tabs-disallowed'));
});
