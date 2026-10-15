import {useState} from 'react';
import type { AccountProfile } from '../auth/authTypes';
import { AcademicYearsPage } from '../academicYears/AcademicYearsPage';
import { TermsPage } from '../master/TermsPage';
import { CatalogPage } from '../master/CatalogPage';
import { ClassesPage } from '../master/ClassesPage';
const roleLabels:Record<string,string>={admin:'Administrator',teacher:'Guru',counselor:'Konselor',principal:'Kepala Sekolah'};
type Page='home'|'academic-years'|'terms'|'programs'|'subjects'|'classes';
const labels:Record<Page,string>={home:'Beranda','academic-years':'Tahun Ajaran',
 terms:'Semester',programs:'Program',subjects:'Mata Pelajaran',classes:'Kelas'};
const adminPages:Page[]=['academic-years','terms','programs','subjects','classes'];
export function DashboardPage({profile,csrf,onLogout,sessionError}:{
  profile:AccountProfile;csrf:string;onLogout:()=>Promise<void>;sessionError:string
}) {
 const [page,setPage]=useState<Page>('home');
 const isAdmin=profile.roles.includes('admin');
 const activePage=isAdmin?page:'home';
 return <div className="workspace">
  <aside className="workspace-nav"><div className="brand"><span className="brand-symbol">PG</span>PortalGenius</div>
   <nav aria-label="Navigasi utama">
    {(['home',...(isAdmin?adminPages:[])] as Page[]).map(key=><button type="button" key={key}
      className={activePage===key?'nav-current':'nav-button'}
      aria-current={activePage===key?'page':undefined} onClick={()=>setPage(key)}>{labels[key]}</button>)}
   </nav>
   <p className="nav-note">Menu pengelolaan hanya ditampilkan untuk akun yang berwenang.</p>
  </aside>
  <div className="workspace-main"><header className="workspace-header">
   <span>Portal Akademik / {labels[activePage]}</span>
   <button type="button" className="text-button" onClick={()=>void onLogout()}>Keluar</button>
  </header><main className="workspace-body">
   {sessionError&&<p className="form-error" role="alert">{sessionError}</p>}
   {activePage==='academic-years'?<AcademicYearsPage csrf={csrf}/>:
    activePage==='terms'?<TermsPage csrf={csrf}/>:
    activePage==='programs'?<CatalogPage kind="program" csrf={csrf}/>:
    activePage==='subjects'?<CatalogPage kind="subject" csrf={csrf}/>:
    activePage==='classes'?<ClassesPage csrf={csrf}/>:
    <><p className="form-eyebrow">BERANDA</p>
      <h1>Selamat datang, {profile.displayName}</h1>
      <p>Peran aktif: {profile.roles.map(r=>roleLabels[r]??r).join(', ')||'Belum ditentukan'}</p>
      <section className="welcome-panel"><h2>Portal akademik</h2>
       <p>Master akademik dikelola secara bertahap. Data siswa, guru, dan penugasan belum dibuka.</p>
      </section></>}
  </main></div>
 </div>;
}
