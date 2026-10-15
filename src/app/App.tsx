import { useEffect, useState } from 'react';
import { LoginPage } from '../features/auth/LoginPage';
import { PasswordPage } from '../features/auth/PasswordPage';
import { loadSession, logout } from '../features/auth/authApi';
import type { AccountProfile } from '../features/auth/authTypes';
import { DashboardPage } from '../features/dashboard/DashboardPage';
export function App() {
  const [profile,setProfile]=useState<AccountProfile|null>(null);
  const [csrf,setCsrf]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    void loadSession().then(session=>{
      if (!mounted || !session) return;
      setProfile(session.profile);setCsrf(session.csrf);
    }).finally(()=>{if(mounted)setLoading(false);});
    return ()=>{mounted=false;};
  },[]);
  async function signOut() {
    try {await logout(csrf);setProfile(null);setCsrf('');setError('');}
    catch {setError('Gagal mengakhiri sesi. Periksa koneksi.');}
  }
  if (loading) return <main role="status" className="boot-message">Memeriksa sesi...</main>;
  if (!profile) return <LoginPage onLogin={session=>{setProfile(session.profile);setCsrf(session.csrf);}} />;
  if (profile.mustChangePassword) return <PasswordPage csrf={csrf} onComplete={()=>{setProfile(null);setCsrf('');}} onLogout={signOut} sessionError={error} />;
  return <DashboardPage profile={profile} csrf={csrf} onLogout={signOut} sessionError={error} />;
}
