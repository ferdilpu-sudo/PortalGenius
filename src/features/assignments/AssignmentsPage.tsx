import {useMasterCollection} from '../master/useMasterCollection';
import type {AssignmentSummary} from '../../../server/assignments/assignmentsRepository';
export function AssignmentsPage(){
 const {rows,loading,error}=useMasterCollection<AssignmentSummary>('assignments');
 return <section aria-labelledby="assignments-title">
  <p className="form-eyebrow">HAK AKSES BERDASARKAN PENUGASAN</p><h1 id="assignments-title">Penugasan guru</h1>
  <p className="academic-description">Penugasan menentukan siswa yang boleh dilihat guru. Penugasan yang kedaluwarsa tidak memberi akses saat ini.</p>
  <div className="welcome-panel"><h2>Daftar penugasan</h2>
   {loading?<p role="status">Memuat daftar penugasan...</p>:
    rows.length===0?<p className="academic-empty">Belum ada penugasan guru.</p>:
    <ul className="academic-list">{rows.map(row=><li key={row.id}>
     <div><strong>{row.teacherCode} — {row.subjectName}</strong><p className="account-detail">{row.termName} · {row.validFrom} — {row.validTo??'Tanpa tanggal akhir'}</p></div>
     <span>{row.studentCount} siswa{row.archivedAt?' · diarsip':''}</span>
    </li>)}</ul>}
   {error?<p role="alert" className="form-error">{error}</p>:null}
  </div>
 </section>;
}
