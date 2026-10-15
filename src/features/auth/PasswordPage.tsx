import { useState, type FormEvent } from 'react';
import { updatePassword } from './authApi';
export function PasswordPage({csrf,onComplete,onLogout,sessionError}:{csrf:string;onComplete:()=>void;onLogout:()=>Promise<void>;sessionError:string}) {
  const [current,setCurrent]=useState('');
  const [next,setNext]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();setError('');
    if (next.length<12 || next.length>128) {setError('Password baru harus 12–128 karakter.');return;}
    if (next!==confirm || next===current) {setError('Konfirmasi tidak sesuai atau password belum berubah.');return;}
    setBusy(true);
    try {await updatePassword(csrf,current,next);onComplete();}
    catch(e) {setError(e instanceof Error?e.message:'Gagal mengganti password.');}
    finally {setBusy(false);}
  }
  return <main className="login-content password-page"><div className="login-card">
    <div className="brand"><span className="brand-symbol">PG</span>PortalGenius</div>
    <p className="form-eyebrow">KEAMANAN AKUN</p><h1>Ganti password</h1>
    <p className="form-subheading">Ganti password sementara sebelum mengakses sistem, lalu masuk kembali.</p>
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="current">Password saat ini</label><input id="current" type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)}/></div>
      <div className="field"><label htmlFor="next">Password baru</label><input id="next" type="password" autoComplete="new-password" minLength={12} required value={next} onChange={e=>setNext(e.target.value)}/></div>
      <div className="field"><label htmlFor="confirm">Ulangi password baru</label><input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button" disabled={busy||!current||!next||!confirm}>{busy?'Menyimpan...':'Simpan password baru'}</button>
    </form>
    <button type="button" className="text-button" onClick={()=>void onLogout()}>Keluar tanpa mengganti password</button>
    {sessionError&&<p className="form-error" role="alert">{sessionError}</p>}
  </div></main>;
}
