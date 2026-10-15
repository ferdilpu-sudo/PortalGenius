import { useState, type FormEvent } from 'react';
import { login } from './authApi';
import type { SessionData } from './authTypes';
export function LoginPage({onLogin}:{onLogin:(session:SessionData)=>void}) {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);setError('');
    try {onLogin(await login(username,password));}
    catch(e) {setError(e instanceof Error?e.message:'Gagal menghubungi server.');}
    finally {setPending(false);}
  }
  return <div className="login-layout">
    <aside className="login-intro" aria-label="Tentang PortalGenius">
      <div className="brand brand-light"><span className="brand-symbol">PG</span>PortalGenius</div>
      <div className="intro-content">
        <p className="eyebrow">PORTAL ADMINISTRASI AKADEMIK</p>
        <h1>Administrasi tertata.<br/>Pembelajaran terpantau.</h1>
        <p>Ruang kerja terpadu bagi tenaga pendidik untuk mengelola jurnal, nilai, dan perkembangan siswa.</p>
        <div className="intro-divider"/><p>Satu sistem untuk jenjang SD, SMP, dan SMA.</p>
      </div>
      <p className="intro-footer">PortalGenius · Sistem internal lembaga</p>
    </aside>
    <main className="login-content" id="main-content"><div className="login-card">
      <div className="mobile-brand brand"><span className="brand-symbol">PG</span>PortalGenius</div>
      <p className="form-eyebrow">AKSES PENGGUNA</p>
      <h2>Selamat datang</h2>
      <p className="form-subheading">Masuk menggunakan username dan password yang diberikan administrator.</p>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}
            placeholder="Masukkan username" minLength={3} maxLength={32} required/>
        </div>
        <div className="field"><label htmlFor="password">Password</label>
          <div className="password-wrap">
            <input id="password" name="password" type={visible?'text':'password'} autoComplete="current-password"
              value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password" required/>
            <button className="password-toggle" type="button" onClick={()=>setVisible(!visible)}>{visible?'Sembunyikan':'Lihat'}</button>
          </div>
        </div>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={pending||!username.trim()||!password} type="submit">
          {pending?'Memverifikasi akun...':'Masuk ke PortalGenius'}
        </button>
      </form>
      <div className="login-help"><p>Lupa password atau akun belum aktif?<br/><strong>Hubungi administrator lembaga.</strong></p></div>
      <p className="legal-caption">Akses terbatas untuk pengguna yang berwenang.</p>
    </div></main>
  </div>;
}
