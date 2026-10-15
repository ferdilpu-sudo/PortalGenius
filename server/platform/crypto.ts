const encoder=new TextEncoder();
export function base64url(bytes:Uint8Array):string {
  let raw='';
  for(const byte of bytes)raw+=String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function fromBase64url(value:string):Uint8Array {
  if(!/^[\w-]+$/.test(value))throw new Error('INVALID_BASE64');
  const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export function newSessionHandle():string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
export async function digestHandle(handle:string):Promise<string> {
  const raw=await crypto.subtle.digest('SHA-256',encoder.encode(handle));
  return Array.from(new Uint8Array(raw),n=>n.toString(16).padStart(2,'0')).join('');
}
async function derivedKey(secret:string,purpose:'session-encryption'|'csrf'|'login-throttle'):Promise<CryptoKey> {
  const raw=fromBase64url(secret);
  if(raw.byteLength!==32)throw new Error('CONFIG_WEAK_SESSION_KEY');
  const root=await crypto.subtle.importKey('raw',raw as BufferSource,'HKDF',false,['deriveKey']);
  const alg=purpose==='session-encryption'
    ? {name:'AES-GCM',length:256} as const
    : {name:'HMAC',hash:'SHA-256',length:256} as const;
  return crypto.subtle.deriveKey(
    {name:'HKDF',hash:'SHA-256',salt:encoder.encode('PortalGenius-v1'),info:encoder.encode(purpose)},
    root,alg,false,purpose==='session-encryption'?['encrypt','decrypt']:['sign','verify']
  );
}
export async function encryptTokens(secret:string,userId:string,value:unknown):Promise<string> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derivedKey(secret,'session-encryption');
  const data=await crypto.subtle.encrypt(
    {name:'AES-GCM',iv,additionalData:encoder.encode(userId)},key,encoder.encode(JSON.stringify(value))
  );
  return base64url(iv)+'.'+base64url(new Uint8Array(data));
}
export async function decryptTokens<T>(secret:string,userId:string,encrypted:string):Promise<T> {
  const parts=encrypted.split('.');
  if(parts.length!==2)throw new Error('CORRUPT_SESSION');
  const key=await derivedKey(secret,'session-encryption');
  const bytes=await crypto.subtle.decrypt(
    {name:'AES-GCM',iv:fromBase64url(parts[0]),additionalData:encoder.encode(userId)},
    key,fromBase64url(parts[1]) as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
export async function hmacString(secret:string,purpose:'csrf'|'login-throttle',value:string):Promise<string> {
  const key=await derivedKey(secret,purpose);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))));
}
export async function verifyCsrf(secret:string,handle:string,provided:string|null):Promise<boolean> {
  if(!provided)return false;
  const expected=await hmacString(secret,'csrf',handle);
  if(provided.length!==expected.length)return false;
  try {
    return await crypto.subtle.verify('HMAC',await derivedKey(secret,'csrf'),
      fromBase64url(provided) as BufferSource,encoder.encode(handle));
  }catch{return false;}
}
