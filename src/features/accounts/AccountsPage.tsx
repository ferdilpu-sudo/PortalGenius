import {useMasterCollection} from '../master/useMasterCollection';
import type {AccountSummary} from '../../../server/accounts/accountsRepository';
const roleNames:Record<string,string>={admin:'Administrator',teacher:'Guru',counselor:'Konselor',principal:'Kepala Sekolah'};
export function AccountsPage(){
 const {rows,loading,error}=useMasterCollection<AccountSummary>('accounts');
 return <section aria-labelledby="accounts-title">
  <p className="form-eyebrow">PENGGUNA DAN HAK AKSES</p><h1 id="accounts-title">Akun</h1>
  <p className="academic-description">Informasi login menggunakan username. Password dan alias autentikasi tidak ditampilkan.</p>
  <div className="welcome-panel"><h2>Daftar akun</h2>
   {loading?<p role="status">Memuat daftar akun...</p>:
    rows.length===0?<p className="academic-empty">Belum ada akun.</p>:
    <ul className="academic-list">{rows.map(row=><li key={row.id}>
     <div><strong>{row.displayName}</strong><p className="account-detail">{row.username??'Username belum tersedia'} · {row.roles.map(role=>roleNames[role]??role).join(', ')||'Belum memiliki peran'}</p></div>
     <span>{row.active?'Aktif':'Nonaktif'}{row.mustChangePassword?' · wajib ganti password':''}</span>
    </li>)}</ul>}
   {error?<p role="alert" className="form-error">{error}</p>:null}
  </div>
 </section>;
}
