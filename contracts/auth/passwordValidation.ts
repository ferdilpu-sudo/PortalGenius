export type PasswordChange={currentPassword:string;newPassword:string};
export function validatePasswordChange(input:unknown):PasswordChange|null {
  if (!input||typeof input!=='object')return null;
  const v=input as Record<string,unknown>;
  if(typeof v.currentPassword!=='string'||typeof v.newPassword!=='string')return null;
  if(v.currentPassword.length<1||v.currentPassword.length>128)return null;
  if(v.newPassword.length<12||v.newPassword.length>128||v.currentPassword===v.newPassword)return null;
  return {currentPassword:v.currentPassword,newPassword:v.newPassword};
}
