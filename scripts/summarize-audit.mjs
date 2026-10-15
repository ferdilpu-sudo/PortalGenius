import {readFileSync} from 'node:fs';
const path=process.argv[2]??'npm-audit-report.json';
const result=JSON.parse(readFileSync(path,'utf8'));
const counts=result.metadata?.vulnerabilities??{};
console.log('NPM_AUDIT_COUNTS '+JSON.stringify(counts));
console.log('AFFECTED_PACKAGES_BEGIN');
for(const [name,value] of Object.entries(result.vulnerabilities??{})){
  const fix=value.fixAvailable;
  const advisories=(value.via??[]).filter(item=>typeof item==='object').map(item=>({
    name:item.name, title:item.title,url:item.url, range:item.range,severity:item.severity
  }));
  console.log(JSON.stringify({
    name,severity:value.severity,isDirect:value.isDirect,range:value.range,
    via:advisories,
    fixAvailable:fix,
    nodes:value.nodes
  }));
}
console.log('AFFECTED_PACKAGES_END');
if(result.error){console.error('NPM_AUDIT_ERROR '+JSON.stringify(result.error));process.exitCode=1;}
