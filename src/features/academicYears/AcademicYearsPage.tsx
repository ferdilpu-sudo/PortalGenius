import { useEffect,useRef,useState,type FormEvent } from 'react';
import {createAcademicYear,loadAcademicYears,type AcademicYear} from './academicYearsApi';

export function AcademicYearsPage({csrf}:{csrf:string}) {
  const [years,setYears]=useState<AcademicYear[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [label,setLabel]=useState('');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const requestKey=useRef(crypto.randomUUID());

  useEffect(()=>{
    let mounted=true;
    void loadAcademicYears().then(rows=>{if(mounted)setYears(rows);})
      .catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Data tidak tersedia.');})
      .finally(()=>{if(mounted)setLoading(false);});
    return ()=>{mounted=false;};
  },[]);

  function onEdit(update:()=>void) {
    update();requestKey.current=crypto.randomUUID();
    if(error)setError('');
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(saving)return;
    setSaving(true);setError('');
    try {
      const created=await createAcademicYear({label,startDate,endDate},csrf,requestKey.current);
      setYears(rows=>[created,...rows].sort((a,b)=>b.startDate.localeCompare(a.startDate)));
      setLabel('');setStartDate('');setEndDate('');
      requestKey.current=crypto.randomUUID();
    }catch(e){
      setError(e instanceof Error?e.message:'Gagal menyimpan tahun ajaran.');
      // Keep the idempotency key for safe retry if the network failed.
    }finally {setSaving(false);}
  }

  return <section className="academic-years" aria-labelledby="academic-year-title">
    <p className="form-eyebrow">MASTER AKADEMIK</p>
    <h1 id="academic-year-title">Tahun ajaran</h1>
    <p className="academic-description">Kelola periode tahun ajaran sebelum membuat semester, kelas, dan penugasan guru.</p>
    <div className="academic-layout">
      <div className="welcome-panel academic-form-panel">
        <h2>Tambah tahun ajaran</h2>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="academic-label">Nama tahun ajaran</label>
            <input id="academic-label" value={label} maxLength={40} minLength={3}
              placeholder="Contoh: 2026/2027" required
              onChange={e=>onEdit(()=>setLabel(e.target.value))}/></div>
          <div className="field"><label htmlFor="academic-start">Tanggal mulai</label>
            <input id="academic-start" type="date" value={startDate} required
              onChange={e=>onEdit(()=>setStartDate(e.target.value))}/></div>
          <div className="field"><label htmlFor="academic-end">Tanggal selesai</label>
            <input id="academic-end" type="date" value={endDate} min={startDate||undefined} required
              onChange={e=>onEdit(()=>setEndDate(e.target.value))}/></div>
          <p className="academic-helper">Periode tidak boleh bertumpang tindih dengan tahun ajaran lain.</p>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving?'Menyimpan...':'Simpan tahun ajaran'}
          </button>
        </form>
      </div>
      <div className="welcome-panel academic-list-panel">
        <h2>Daftar tahun ajaran</h2>
        {loading?<p role="status">Memuat data tahun ajaran...</p>
        :error&&years.length===0?<p className="form-error" role="alert">{error}</p>
        :years.length===0?<p className="academic-empty">Belum ada tahun ajaran. Tambahkan periode pertama melalui formulir.</p>
        :<ul className="academic-list">{years.map(year=><li key={year.id}>
          <strong>{year.label}</strong>
          <span>{year.startDate} hingga {year.endDate}</span>
        </li>)}</ul>}
        {error&&years.length>0?<p className="form-error" role="alert">{error}</p>:null}
      </div>
    </div>
  </section>;
}
