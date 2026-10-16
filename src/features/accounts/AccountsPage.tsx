import {useEffect,useState} from 'react';
import {useMasterCollection} from '../master/useMasterCollection';
import {fetchMaster} from '../master/masterApi';
import type {AccountSummary} from '../../../server/accounts/accountsRepository';
import {loadStaffCapabilities,type StaffCapability} from './accountsApi';
import {StaffCreatePanel} from './StaffCreatePanel';

const roleNames:Record<string,string>={admin:'Administrator',teacher:'Guru',counselor:'Konselor',principal:'Kepala Sekolah'};

export function AccountsPage({csrf}:{csrf:string}){
 const {rows,setRows,loading,error,setError}=useMasterCollection<AccountSummary>('accounts');
 const [capabilities,setCapabilities]=useState<StaffCapability|null>(null);
 const [capabilityError,setCapabilityError]=useState('');
 useEffect(()=>{
  let active=true;
  void loadStaffCapabilities().then(data=>{if(active)setCapabilities(data);})
   .catch(()=>{if(active)setCapabilityError('Status pembuatan akun belum tersedia.');});
  return ()=>{active=false;};
 },[]);
 function reloadAccounts(){
  void fetchMaster<AccountSummary>('accounts').then(setRows)
   .catch(()=>setError('Akun berhasil diproses, tetapi daftar belum dapat dimuat ulang.'));
 }
 return <section aria-labelledby="accounts-title">
  <p className="form-eyebrow">PENGGUNA DAN HAK AKSES</p><h1 id="accounts-title">Akun</h1>
  <p className="academic-description">Login menggunakan username dan password. Identitas Auth internal tidak ditampilkan.</p>
  <div className="account-management-layout">
   <div className="welcome-panel account-list-panel"><h2>Daftar akun</h2>
    {loading?<p role="status">Memuat daftar akun...</p>:
     rows.length===0?<p className="academic-empty">Belum ada akun.</p>:
     <ul className="academic-list">{rows.map(row=><li key={row.id}>
      <div><strong>{row.displayName}</strong>
       <p className="account-detail">{row.username??'Username belum tersedia'} · {row.roles.map(role=>roleNames[role]??role).join(', ')||'Belum memiliki peran'}</p></div>
      <span>{row.active?'Aktif':'Nonaktif'}{row.mustChangePassword?' · wajib ganti password':''}</span>
     </li>)}</ul>}
    {error?<p role="alert" className="form-error">{error}</p>:null}
   </div>
   {capabilityError?<p role="status" className="account-help">{capabilityError}</p>:
    capabilities?<StaffCreatePanel csrf={csrf} enabled={capabilities.canCreateStaff} onCreated={reloadAccounts}/>:
    <p role="status">Memeriksa izin pembuatan akun...</p>}
  </div>
 </section>;
}
