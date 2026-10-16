// Shared, predictable scope for source-only lint and whitespace checks.
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
const roots=['contracts','server','functions','src','scripts','tests'];
const accepted=/\.(?:js|mjs|ts|tsx)$/;
export function sourceFiles(){
 const files=[];
 function scan(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory()){
    if(!['node_modules','dist','.git','.output','coverage'].includes(entry.name))scan(path);
   }else if(entry.isFile()&&accepted.test(entry.name))files.push(path);
  }
 }
 for(const dir of roots)scan(dir);
 for(const path of ['vite.config.ts'])files.push(path);
 return [...new Set(files)].sort();
}
