import {useEffect,useRef,useState,type FormEvent} from 'react';
import {loadAcademicYears,type AcademicYear} from '../academicYears/academicYearsApi';
import {useMasterCollection} from './useMasterCollection';
import {postMaster} from './masterApi';
import type {Term} from './masterTypes';
export function TermsPage({csrf}:{csrf:string}){
 const {rows,setRows,loading,error,setError}=useMasterCollection<Term>('terms');
 const [years,setYears]=useState<AcademicYear[]>([]);
 const [yearsLoading,setYearsLoading]=useState(true);
 const [yearError,setYearError]=useState('');
 const [yearId,setYearId]=useState('');
 const [name,setName]=useState('');
 const [startDate,setStartDate]=useState('');
 const [endDate,setEndDate]=useState('');
 const [saving,setSaving]=useState(false);
 const key=useRef(crypto.randomUUID());
 useEffect(()=>{
  let active=true;
  void loadAcademicYears().then(data=>{if(active)setYears(data);})
   .catch(e=>{if(active)setYearError(e instanceof Error?e.message:'Tahun ajaran tidak tersedia.');})
   .finally(()=>{if(active)setYearsLoading(false);});
  return ()=>{active=false;};
 },[]);
 const selected=years.find(y=>y.id===yearId);
 function edit(change:()=>void){change();key.current=crypto.randomUUID();setError('');}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  setSaving(true);setError('');
  try{
   const result=await postMaster<Term,unknown>('terms',{yearId,name,startDate,endDate},csrf,key.current);
   setRows(current=>[...current,result].sort((a,b)=>b.startDate.localeCompare(a.startDate)));
   setName('');setStartDate('');setEndDate('');key.current=crypto.randomUUID();
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan semester.');}
  finally{setSaving(false);}
 }
 return <section aria-labelledby="terms-title">
  <p className="form-eyebrow">MASTER AKADEMIK</p><h1 id="terms-title">Semester</h1>
  <p className="academic-description">Semester harus berada dalam rentang tahun ajaran dan tidak boleh tumpang tindih.</p>
  <div className="academic-layout">
   <div className="welcome-panel academic-form-panel"><h2>Tambah semester</h2>
    {yearsLoading?<p role="status">Memuat pilihan tahun ajaran...</p>:
    yearError?<p className="form-error" role="alert">{yearError}</p>:
    years.length===0?<p className="academic-empty">Buat tahun ajaran terlebih dahulu sebelum menambah semester.</p>:
    <form onSubmit={submit}>
     <div className="field"><label htmlFor="term-year">Tahun ajaran</label>
      <select id="term-year" value={yearId} required onChange={e=>edit(()=>{setYearId(e.target.value);setStartDate('');setEndDate('');})}>
       <option value="">Pilih tahun ajaran</option>
       {years.map(y=><option key={y.id} value={y.id}>{y.label}</option>)}
      </select></div>
     <div className="field"><label htmlFor="term-name">Nama semester</label>
      <input id="term-name" value={name} required maxLength={40} placeholder="Contoh: Ganjil"
       onChange={e=>edit(()=>setName(e.target.value))}/></div>
     <div className="field"><label htmlFor="term-start">Tanggal mulai</label>
      <input type="date" id="term-start" value={startDate} min={selected?.startDate} max={selected?.endDate} required
       onChange={e=>edit(()=>setStartDate(e.target.value))}/></div>
     <div className="field"><label htmlFor="term-end">Tanggal selesai</label>
      <input type="date" id="term-end" value={endDate} min={startDate||selected?.startDate} max={selected?.endDate} required
       onChange={e=>edit(()=>setEndDate(e.target.value))}/></div>
     <button type="submit" className="primary-button" disabled={saving}>{saving?'Menyimpan...':'Simpan semester'}</button>
    </form>}
   </div>
   <div className="welcome-panel academic-list-panel"><h2>Daftar semester</h2>
    {loading?<p role="status">Memuat semester...</p>
    :rows.length===0?<p className="academic-empty">Belum ada semester.</p>
    :<ul className="academic-list">{rows.map(row=><li key={row.id}>
      <strong>{row.name}</strong>
      <span>{years.find(y=>y.id===row.yearId)?.label??'Tahun ajaran'} · {row.startDate} — {row.endDate}</span>
     </li>)}</ul>}
    {error?<p className="form-error" role="alert">{error}</p>:null}
   </div>
  </div>
 </section>;
}
