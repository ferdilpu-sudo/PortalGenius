import {useState} from 'react';
import type { AccountProfile } from '../auth/authTypes';
import { AcademicYearsPage } from '../academicYears/AcademicYearsPage';
const roleLabels:Record<string,string>={admin:'Administrator',teacher:'Guru',counselor:'Konselor',principal:'Kepala Sekolah'};
export function DashboardPage({profile,csrf,onLogout,sessionError}:{
  profile:AccountProfile;csrf:string;onLogout:()=>Promise<void>;sessionError:string
}) {
  const [page,setPage]=useState<'home'|'academic-years'>('home');
  const isAdmin=profile.roles.includes('admin');
  const yearsVisible=isAdmin&&page==='academic-years';
  return <div className="workspace">
    <aside className="workspace-nav"><div className="brand"><span className="brand-symbol">PG</span>PortalGenius</div>
      <nav aria-label="Navigasi utama">
        <button type="button" className={page==='home'?'nav-current':'nav-button'}
          onClick={()=>setPage('home')} aria-current={page==='home'?'page':undefined}>Beranda</button>
        {isAdmin?<button type="button" className={yearsVisible?'nav-current':'nav-button'}
          onClick={()=>setPage('academic-years')} aria-current={yearsVisible?'page':undefined}>Tahun ajaran</button>:null}
      </nav>
      <p className="nav-note">Modul lain akan tersedia setelah pengujian hak akses masing-masing.</p>
    </aside>
    <div className="workspace-main"><header className="workspace-header">
      <span>Portal Akademik / {yearsVisible?'Tahun Ajaran':'Beranda'}</span>
      <button type="button" className="text-button" onClick={()=>void onLogout()}>Keluar</button>
    </header>
      <main className="workspace-body">
        {sessionError&&<p className="form-error" role="alert">{sessionError}</p>}
        {yearsVisible?<AcademicYearsPage csrf={csrf}/>:
          <><p className="form-eyebrow">BERANDA</p>
            <h1>Selamat datang, {profile.displayName}</h1>
            <p>Peran aktif: {profile.roles.map(r=>roleLabels[r]??r).join(', ') || 'Belum ditentukan'}</p>
            <section className="welcome-panel"><h2>Portal akademik</h2>
              <p>Data induk dan modul akademik dibangun secara bertahap. Menu yang tersedia mengikuti peran akun.</p>
            </section>
          </>}
      </main>
    </div>
  </div>;
}
