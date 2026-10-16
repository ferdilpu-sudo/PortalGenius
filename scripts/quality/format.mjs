// Enforces repository-wide source-file whitespace, not a full code formatter.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {sourceFiles} from './sourceFiles.mjs';

export function formatFindings(content){
 const errors=[];
 if(content.includes('\r'))errors.push('line-endings-must-be-LF');
 if(content.charCodeAt(0)===0xfeff)errors.push('no-UTF8-BOM');
 if(content.length>0&&!content.endsWith('\n'))errors.push('missing-final-newline');
 if(/\t/.test(content))errors.push('tabs-disallowed');
 if(/[\t ]+$/m.test(content))errors.push('trailing-whitespace');
 return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let count=0;
 for(const filename of sourceFiles()){
  const failures=formatFindings(readFileSync(filename,'utf8'));
  for(const rule of failures){console.error(`FORMAT_FAIL ${filename} ${rule}`);count++;}
 }
 if(count){console.error(`SOURCE_WHITESPACE_FORMAT_BLOCKED: ${count} findings`);process.exitCode=1;}
 else console.log('SOURCE_WHITESPACE_FORMAT_PASS: LF, indentation tabs, trailing spaces, final newlines');
}
