// Independent AST-based security lint; not a typecheck and not an ESLint clone.
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {sourceFiles} from './sourceFiles.mjs';

export function lintSource(filename,source){
 const kind=filename.endsWith('.tsx')?ts.ScriptKind.TSX:
  filename.endsWith('.ts')?ts.ScriptKind.TS:ts.ScriptKind.JS;
 const file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,kind);
 const failures=[];
 function report(node,rule){
  const where=file.getLineAndCharacterOfPosition(node.getStart(file));
  failures.push({rule,line:where.line+1,column:where.character+1});
 }
 function visit(node){
  if(ts.isDebuggerStatement(node))report(node,'no-debugger');
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='eval')
   report(node,'no-eval');
  if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='Function')
   report(node,'no-function-constructor');
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&
   ['setTimeout','setInterval'].includes(node.expression.text)&&
   node.arguments.length>0&&ts.isStringLiteral(node.arguments[0]))
   report(node,'no-string-timer');
  if(ts.isIdentifier(node)&&node.text==='dangerouslySetInnerHTML')
   report(node,'no-unsafe-html');
  ts.forEachChild(node,visit);
 }
 visit(file);
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,kind,source);
 while(scanner.scan()!==ts.SyntaxKind.EndOfFileToken){
  const token=scanner.getToken();
  if(token!==ts.SyntaxKind.SingleLineCommentTrivia&&
   token!==ts.SyntaxKind.MultiLineCommentTrivia)continue;
  if(!/@ts-(?:ignore|nocheck)\b/.test(scanner.getTokenText()))continue;
  const where=file.getLineAndCharacterOfPosition(scanner.getTokenPos());
  failures.push({rule:'no-typecheck-suppression',line:where.line+1,column:where.character+1});
 }
 return failures.sort((a,b)=>a.line-b.line||a.column-b.column);
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let failures=0;
 for(const filename of sourceFiles()){
  const source=readFileSync(filename,'utf8');
  for(const item of lintSource(filename,source)){
   console.error(`LINT_FAIL ${filename}:${item.line}:${item.column} ${item.rule}`);
   failures++;
  }
 }
 if(failures){console.error(`AST_SECURITY_LINT_BLOCKED: ${failures} findings`);process.exitCode=1;}
 else console.log('AST_SECURITY_LINT_PASS: independently parsed source AST');
}
