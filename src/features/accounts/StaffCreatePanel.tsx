import {useRef,useState,type FormEvent} from 'react';
import type {ProvisionRequest} from '../../../contracts/accounts/provisionValidation.ts';
import {AccountRequestError,createStaffAccount,type StaffCreation} from './accountsApi';

const roleLabels:{value:ProvisionRequest['role'];label:string}[]=[
 {value:'teacher',label:'Guru'},
 {value:'counselor',label:'Konselor'},
 {value:'principal',label:'Kepala Sekolah'}
];

export function StaffCreatePanel({csrf,enabled,onCreated}:{
 csrf:string;enabled:boolean;onCreated:()=>void
}){
 const [username,setUsername]=useState('');
 const [displayName,setDisplayName]=useState('');
 const [role,setRole]=useState<ProvisionRequest['role']>('teacher');
 const [submitting,setSubmitting]=useState(false);
 const [locked,setLocked]=useState(false);
 const [error,setError]=useState('');
 const [created,setCreated]=useState<StaffCreation|null>(null);
 const key=useRef(crypto.randomUUID());
 function edit(action:()=>void){
  action();key.current=crypto.randomUUID();setError('');
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!enabled||submitting||locked||created)return;
  setSubmitting(true);setError('');
  try{
   const result=await createStaffAccount({username,displayName,role},csrf,key.current);
   setCreated(result);onCreated();
  }catch(e){
   const knownValidation=e instanceof AccountRequestError&&
    ['INVALID_ACCOUNT','INVALID_IDEMPOTENCY_KEY'].includes(e.code);
   if(!knownValidation)setLocked(true);
   setError(e instanceof Error?e.message:'Pembuatan akun tidak dapat dipastikan.');
  }finally{setSubmitting(false);}
 }
 return <div className="welcome-panel account-create-panel">
  <h2>Tambah akun staf</h2>
  {!enabled?<p role="status" className="account-help">Pembuatan akun belum diaktifkan pada server. Data akun yang sudah ada tetap bisa dilihat.</p>:
  created?<div role="status" className="account-created">
   <h3>Akun {created.account.username} tercatat</h3>
   {created.temporaryPassword?
    <><p>Password sementara ditampilkan satu kali. Salin melalui saluran internal yang aman, jangan disimpan di dokumen bersama.</p>
     <output className="account-temporary-password">{created.temporaryPassword}</output>
     <p>Pengguna wajib mengganti password pada login pertama.</p></>:
    <p>Akun sudah tercatat sebelumnya; password lama tidak dikeluarkan ulang. Periksa hasil pada daftar akun.</p>}
   <button type="button" className="primary-button" onClick={()=>{
    setCreated(null);setUsername('');setDisplayName('');setRole('teacher');
    key.current=crypto.randomUUID();setError('');
   }}>Selesai</button>
  </div>:
  locked?<><p role="alert" className="form-error">{error}</p>
   <p>Untuk mencegah akun ganda, periksa daftar akun dan minta peninjauan administrator teknis sebelum membuat permintaan baru.</p></>:
  <form onSubmit={submit}>
   <div className="field"><label htmlFor="staff-username">Username</label>
    <input id="staff-username" value={username} required minLength={3} maxLength={32}
     autoComplete="off" pattern="[A-Za-z0-9._-]{3,32}" placeholder="Contoh: guru_001"
     onChange={e=>edit(()=>setUsername(e.target.value))}/></div>
   <div className="field"><label htmlFor="staff-name">Nama tampilan</label>
    <input id="staff-name" value={displayName} required maxLength={120}
     autoComplete="off" onChange={e=>edit(()=>setDisplayName(e.target.value))}/></div>
   <div className="field"><label htmlFor="staff-role">Peran</label>
    <select id="staff-role" value={role} onChange={e=>edit(()=>setRole(e.target.value as ProvisionRequest['role']))}>
     {roleLabels.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
    </select></div>
   <p className="account-help">Tidak memerlukan email. Sistem membuat password sementara dan identitas Auth internal.</p>
   {error?<p role="alert" className="form-error">{error}</p>:null}
   <button type="submit" className="primary-button" disabled={submitting}>
    {submitting?'Membuat akun...':'Buat akun staf'}
   </button>
  </form>}
 </div>;
}
