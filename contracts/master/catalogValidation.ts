export type CatalogInput={code:string;name:string};
export function validateCatalog(input:unknown):CatalogInput|null {
 if(!input||typeof input!=='object')return null;
 const v=input as Record<string,unknown>;
 if(typeof v.code!=='string'||typeof v.name!=='string')return null;
 const code=v.code.trim().toUpperCase(),name=v.name.trim();
 if(!/^[A-Z0-9_-]{2,32}$/.test(code)||name.length<1||name.length>120||/[\x00-\x1F]/.test(name))return null;
 return {code,name};
}
