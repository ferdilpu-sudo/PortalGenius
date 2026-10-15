import {normalizeUsername} from '../auth/loginValidation.ts';
export type ProvisionRole='teacher'|'counselor'|'principal';
export type ProvisionRequest={
 username:string;displayName:string;authEmail:string;role:ProvisionRole
};
export function validateProvisionRequest(value:unknown):ProvisionRequest|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(typeof v.username!=='string'||typeof v.displayName!=='string'||
    typeof v.authEmail!=='string'||typeof v.role!=='string')return null;
 const username=normalizeUsername(v.username);
 const displayName=v.displayName.trim();
 const authEmail=v.authEmail.trim().toLowerCase();
 if(!/^[a-z0-9._-]{3,32}$/.test(username)||['root','system','adminroot'].includes(username))
  return null;
 if(displayName.length<1||displayName.length>120||/[\x00-\x1f]/.test(displayName))return null;
 if(authEmail.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(authEmail))return null;
 if(!(['teacher','counselor','principal'] as string[]).includes(v.role))return null;
 // Supabase Auth email is an internal provider identity, not an app login field.
 // Never allow an operator to set privileges or a password in JSON input.
 if('password' in v||'admin' in v||'active' in v||'mustChangePassword' in v)return null;
 return {username,displayName,authEmail,role:v.role as ProvisionRole};
}
