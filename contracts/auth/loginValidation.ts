export type Credentials = {username:string;password:string};
export function normalizeUsername(value:string):string {return value.trim().toLowerCase();}
export function validateCredentials(input:unknown):Credentials|null {
  if (!input||typeof input!=='object')return null;
  const value=input as Record<string,unknown>;
  if(typeof value.username!=='string'||typeof value.password!=='string')return null;
  const username=normalizeUsername(value.username);
  if(!/^[a-z0-9._-]{3,32}$/.test(username)||/^(adminroot|system|root)$/.test(username))return null;
  if(value.password.length<12||value.password.length>128)return null;
  return {username,password:value.password};
}
