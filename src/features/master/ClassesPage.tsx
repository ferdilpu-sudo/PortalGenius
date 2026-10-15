import {useEffect,useRef,useState,type FormEvent} from 'react';
import {loadAcademicYears,type AcademicYear} from '../academicYears/academicYearsApi';
import {useMasterCollection} from './useMasterCollection';
import {postMaster} from './masterApi';
import type {SchoolClass} from './masterTypes';
export function ClassesPage({csrf}:{csrf:string}){
 const {rows,setRows,loading,error,setError}=useMasterCollection<SchoolClass>('classes');
 const [years,setYears]=useState<AcademicYear[]>([]);
 const [yearsLoading,setYearsLoading]=useState(true);
 const [yearError,setYearError]=useState('');
 const [yearId,setYearId]=useState('');
 const [level,setLevel]=useState<'sd'|'smp'|'sma'>('sd');
 const [grade,setGrade]=useState(1);
 const [name,setName]=useState('');
 const [saving,setSaving]=useState(false);
 const key=useRef(crypto.randomUUID());
 useEffect(()=>{
  let active=true;void loadAcademicYears().then(data=>{if(active)setYears(data);})
   .catch(e=>{if(active)setYearError(e instanceof Error?e.message:'Tahun ajaran tidak tersedia.');})
   .finally(()=>{if(active)setYearsLoading(false);});
  return ()=>{active=false;};
 },[]);
 const grades=level==='sd'?[1,2,3,4,5,6]:level==='smp'?[7,8,9]:[10,11,12];
 function edit(change:()=>void){change();key.current=crypto.randomUUID();setError('');}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving)return;
  setSaving(true);setError('');
  try{
   const result=await postMaster<SchoolClass,unknown>('classes',{yearId,level,grade,name},csrf,key.current);
   setRows(current=>[...current,result].sort((a,b)=>a.grade-b.grade||a.name.localeCompare(b.name)));
   setName('');key.current=crypto.randomUUID();
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan kelas.');}
  finally{setSaving(false);}
 }
 return <section aria-labelledby="classes-title">
  <p className="form-eyebrow">MASTER AKADEMIK</p><h1 id="classes-title">Kelas</h1>
  <p className="academic-description">Kelompokkan kelas menurut tahun ajaran dan jenjang SD, SMP, atau SMA.</p>
  <div className="academic-layout">
   <div className="welcome-panel academic-form-panel"><h2>Tambah kelas</h2>
    {yearsLoading?<p role="status">Memuat pilihan tahun ajaran...</p>:
    yearError?<p className="form-error" role="alert">{yearError}</p>:
    years.length===0?<p className="academic-empty">Buat tahun ajaran terlebih dahulu sebelum menambah kelas.</p>:
    <form onSubmit={submit}>
     <div className="field"><label htmlFor="class-year">Tahun ajaran</label>
      <select id="class-year" value={yearId} required onChange={e=>edit(()=>setYearId(e.target.value))}>
       <option value="">Pilih tahun ajaran</option>
       {years.map(y=><option key={y.id} value={y.id}>{y.label}</option>)}
      </select></div>
     <div className="field"><label htmlFor="class-level">Jenjang</label>
      <select id="class-level" value={level} onChange={e=>edit(()=>{
       const next=e.target.value as typeof level;
       setLevel(next);setGrade(next==='sd'?1:next==='smp'?7:10);
      })}>
       <option value="sd">SD</option><option value="smp">SMP</option><option value="sma">SMA</option>
      </select></div>
     <div className="field"><label htmlFor="class-grade">Tingkat</label>
      <select id="class-grade" value={grade} onChange={e=>edit(()=>setGrade(Number(e.target.value)))}>
       {grades.map(n=><option key={n} value={n}>Kelas {n}</option>)}
      </select></div>
     <div className="field"><label htmlFor="class-name">Nama rombel</label>
      <input id="class-name" value={name} maxLength={80} required placeholder="Contoh: IX A"
       onChange={e=>edit(()=>setName(e.target.value))}/></div>
     <button type="submit" className="primary-button" disabled={saving}>{saving?'Menyimpan...':'Simpan kelas'}</button>
    </form>}
   </div>
   <div className="welcome-panel academic-list-panel"><h2>Daftar kelas</h2>
    {loading?<p role="status">Memuat kelas...</p>
    :rows.length===0?<p className="academic-empty">Belum ada kelas.</p>:
    <ul className="academic-list">{rows.map(row=><li key={row.id}>
      <strong>{row.level.toUpperCase()} {row.grade} · {row.name}</strong>
      <span>{years.find(y=>y.id===row.yearId)?.label??'Tahun ajaran'}</span>
     </li>)}</ul>}
    {error?<p className="form-error" role="alert">{error}</p>:null}
   </div>
  </div>
 </section>;
}
