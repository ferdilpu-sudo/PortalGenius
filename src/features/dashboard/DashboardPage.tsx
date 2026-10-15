import type { AccountProfile } from '../auth/authTypes';
const roleLabels:Record<string,string>={admin:'Administrator',teacher:'Guru',counselor:'Konselor',principal:'Kepala Sekolah'};
export function DashboardPage({profile,onLogout,sessionError}:{profile:AccountProfile;onLogout:()=>Promise<void>;sessionError:string}) {
  return <div className="workspace">
    <aside className="workspace-nav"><div className="brand"><span className="brand-symbol">PG</span>PortalGenius</div>
      <nav aria-label="Navigasi utama"><a className="nav-current" href="#beranda" aria-current="page">Beranda</a></nav>
      <p className="nav-note">Modul akademik akan menyusul setelah gate keamanan selesai.</p>
    </aside>
    <div className="workspace-main"><header className="workspace-header"><span>Portal Akademik / Beranda</span>
      <button type="button" className="text-button" onClick={()=>void onLogout()}>Keluar</button></header>
      <main id="beranda" className="workspace-body"><p className="form-eyebrow">BERANDA</p>
        <h1>Selamat datang, {profile.displayName}</h1>
        {sessionError&&<p className="form-error" role="alert">{sessionError}</p>}
        <p>Peran aktif: {profile.roles.map(r=>roleLabels[r]??r).join(', ') || 'Belum ditentukan'}</p>
        <section className="welcome-panel"><h2>Fondasi PortalGenius</h2>
          <p>Identitas Anda telah dikenali. Modul data akademik akan diaktifkan setelah pengujian hak akses selesai.</p>
        </section>
      </main></div>
  </div>;
}
