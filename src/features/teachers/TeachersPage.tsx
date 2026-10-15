import {useMasterCollection} from '../master/useMasterCollection';
import type {TeacherSummary} from '../../../server/teachers/teachersRepository';
export function TeachersPage(){
 const {rows,loading,error}=useMasterCollection<TeacherSummary>('teachers');
 return <section aria-labelledby="teachers-title">
  <p className="form-eyebrow">MASTER AKADEMIK</p><h1 id="teachers-title">Guru</h1>
  <p className="academic-description">Daftar pengajar dan keterkaitan akun; perubahan akun baru dibuka setelah pengujian keamanan multi-peran.</p>
  <div className="welcome-panel"><h2>Daftar guru</h2>
   {loading?<p role="status">Memuat daftar guru...</p>:
    rows.length===0?<p className="academic-empty">Belum ada guru terdaftar.</p>:
    <ul className="academic-list">{rows.map(row=><li key={row.id}>
     <strong>{row.code}</strong><span>{row.displayName??'Akun belum ditautkan'}{row.archivedAt?' (diarsip)':''}</span>
    </li>)}</ul>}
   {error?<p role="alert" className="form-error">{error}</p>:null}
  </div>
 </section>;
}
