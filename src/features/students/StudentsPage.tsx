import {useMasterCollection} from '../master/useMasterCollection';
import type {StudentSummary} from '../../../server/students/studentsRepository';
export function StudentsPage(){
 const {rows,loading,error}=useMasterCollection<StudentSummary>('students');
 return <section aria-labelledby="students-title">
  <p className="form-eyebrow">MASTER AKADEMIK</p><h1 id="students-title">Siswa</h1>
  <p className="academic-description">Hanya siswa dalam cakupan penugasan akun yang dapat ditampilkan. Informasi wali dan tanggal lahir tidak tersedia pada daftar ini.</p>
  <div className="welcome-panel"><h2>Daftar siswa</h2>
   {loading?<p role="status">Memuat data siswa...</p>:
    rows.length===0?<p className="academic-empty">Belum ada siswa dalam cakupan akses Anda.</p>:
    <ul className="academic-list">{rows.map(row=><li key={row.id}>
     <strong>{row.fullName}</strong><span>NIS: {row.nis}</span></li>)}</ul>}
   {error?<p role="alert" className="form-error">{error}</p>:null}
  </div>
 </section>;
}
