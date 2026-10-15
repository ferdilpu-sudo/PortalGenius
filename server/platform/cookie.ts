export const SESSION_COOKIE='__Host-pg_session';
export function getCookie(request:Request,name:string):string|null {
  const cookie=request.headers.get('Cookie')??'';
  for(const part of cookie.split(';')) {
    const i=part.indexOf('=');
    if(i<0||part.slice(0,i).trim()!==name)continue;
    const value=part.slice(i+1).trim();
    return /^[A-Za-z0-9_-]{40,128}$/.test(value)?value:null;
  }
  return null;
}
export function sessionCookie(handle:string):string {
  return SESSION_COOKIE+'='+handle+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800';
}
export function deleteSessionCookie():string {
  return SESSION_COOKIE+'=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
