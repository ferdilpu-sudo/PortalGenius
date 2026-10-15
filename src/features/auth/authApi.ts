import type { SessionData } from './authTypes';
type Envelope = { data?: SessionData; error?: { code: string; message: string } };
export async function loadSession(): Promise<SessionData | null> {
  try {
    const response=await fetch('/api/v1/auth/session',{credentials:'same-origin',cache:'no-store'});
    if (!response.ok) return null;
    return (await response.json() as Envelope).data ?? null;
  } catch { return null; }
}
export async function login(username:string,password:string):Promise<SessionData> {
  const response=await fetch('/api/v1/auth/login',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });
  const body=await response.json() as Envelope;
  if (!response.ok || !body.data) throw new Error(body.error?.message ?? 'Layanan masuk belum tersedia.');
  return body.data;
}
export async function logout(csrf:string):Promise<void> {
  const response=await fetch('/api/v1/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf}});
  if (!response.ok) throw new Error('LOGOUT_FAILED');
}
export async function updatePassword(csrf:string,currentPassword:string,newPassword:string):Promise<void> {
  const response=await fetch('/api/v1/auth/password',{
    method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
    body:JSON.stringify({currentPassword,newPassword})
  });
  if (!response.ok) {
    const body=await response.json() as Envelope;
    throw new Error(body.error?.message ?? 'Gagal mengubah password.');
  }
}
