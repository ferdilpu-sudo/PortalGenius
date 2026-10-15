import {useRef,useState,type FormEvent} from 'react';
import {postMaster} from './masterApi';
import {useMasterCollection} from './useMasterCollection';
import type {CatalogKind,CatalogRow} from './masterTypes';
export function CatalogPage({kind,csrf}:{kind:CatalogKind;csrf:string}){
 const resource=kind==='program'?'programs':'subjects';
 const title=kind==='program'?'Program pembelajaran':'Mata pelajaran';
 const {rows,setRows,loading,error,setError}=useMasterCollection<CatalogRow>(resource);
 const [code,setCode]=useState('');
 const [name,setName]=useState('');
 const [saving,setSaving]=useState(false);
 const key=useRef(crypto.randomUUID());
 function edit(change:()=>void){change();key.current=crypto.randomUUID();setError('');}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving)return;
  setSaving(true);setError('');
  try{
   const result=await postMaster<CatalogRow,unknown>(resource,{code,name},csrf,key.current);
   setRows(current=>[...current,result].sort((a,b)=>a.code.localeCompare(b.code)));
   setCode('');setName('');key.current=crypto.randomUUID();
  }catch(e){setError(e instanceof Error?e.message:'Gagal menyimpan.');}
  finally{setSaving(false);}
 }
 return <section aria-labelledby="catalog-title">
  <p className="form-eyebrow">MASTER AKADEMIK</p><h1 id="catalog-title">{title}</h1>
  <p className="academic-description">Kode dan nama digunakan pada penugasan serta laporan. Data yang disimpan akan menjadi katalog lembaga.</p>
  <div className="academic-layout">
   <div className="welcome-panel academic-form-panel"><h2>Tambah {title.toLowerCase()}</h2>
    <form onSubmit={submit}>
     <div className="field"><label htmlFor="catalog-code">Kode unik</label>
      <input id="catalog-code" value={code} maxLength={32} minLength={2} required
       placeholder={kind==='program'?'Contoh: REGULAR':'Contoh: IPS'}
       onChange={e=>edit(()=>setCode(e.target.value))}/></div>
     <div className="field"><label htmlFor="catalog-name">Nama</label>
      <input id="catalog-name" value={name} maxLength={120} required
       placeholder={kind==='program'?'Nama program':'Nama mata pelajaran'}
       onChange={e=>edit(()=>setName(e.target.value))}/></div>
     <p className="academic-helper">Kode akan disimpan menggunakan huruf kapital. Gunakan kode yang tidak berubah.</p>
     <button className="primary-button" type="submit" disabled={saving}>{saving?'Menyimpan...':'Simpan data'}</button>
    </form>
   </div>
   <div className="welcome-panel academic-list-panel"><h2>Daftar {title.toLowerCase()}</h2>
    {loading?<p role="status">Memuat katalog...</p>
    :rows.length===0?<p className="academic-empty">Belum ada data dalam katalog ini.</p>
    :<ul className="academic-list">{rows.map(row=><li key={row.id}>
      <strong>{row.code}</strong><span>{row.name}</span></li>)}</ul>}
    {error?<p role="alert" className="form-error">{error}</p>:null}
   </div>
  </div>
 </section>;
}
