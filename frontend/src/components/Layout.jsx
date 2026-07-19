import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, ShieldCheck, Sun, Moon, ChevronDown, Activity, MapPin, X, FileText, User, Building2, FileKey } from 'lucide-react';
import api from '../api';

export default function Layout({ role }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    api.getNotifications().then(res => {
      const list = Array.isArray(res) ? res : [];
      setUnreadCount(list.filter(n => !n.read).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length < 2) { setSearchResults(null); return; }
      setSearching(true);
      try {
        const res = await api.searchGlobal(searchQuery.trim());
        setSearchResults(res);
      } catch { setSearchResults(null); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar_collapsed', !prev);
      return !prev;
    });
  };

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;

  const subroleDisplay = {
    admin: { label: 'ADMINISTRATOR', badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    auditor: { label: 'CLAIMS AUDITOR', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    manager: { label: 'RISK MANAGER', badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
    doctor: { label: 'MEDICAL DOCTOR', badge: 'bg-teal-500/10 text-teal-500 border-teal-500/20' }
  };

  const userSubrole = user.subrole || (role === 'insurance' ? 'admin' : 'doctor');
  const roleCfg = subroleDisplay[userSubrole] || subroleDisplay.admin;

  return (
    <div className="flex min-h-screen overflow-hidden bg-bg text-textPrimary transition-all duration-300">
      <Sidebar role={role} collapsed={collapsed} toggleCollapse={toggleCollapse} />
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/85 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between gap-4 w-full">
            <div className="flex-1 hidden md:block max-w-md relative" ref={searchRef}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary/60" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search claims, patients, providers..."
                  className="w-full rounded-xl border border-border/60 bg-bg/50 py-2 pl-9 pr-8 text-xs text-textPrimary placeholder:text-textSecondary/50 outline-none focus:border-primary/40 focus:bg-surface transition-all"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary">
                    <X size={14} />
                  </button>
                )}
              </div>
              {searchOpen && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {searchResults.claims?.length > 0 && (
                    <div className="p-2"><p className="text-[9px] font-black uppercase tracking-wider text-textSecondary px-2 py-1">Claims</p>
                    {searchResults.claims.map(c => (
                      <button key={c.id} onClick={() => { navigate(`/insurance/claims/${c.id}`); setSearchOpen(false); setSearchQuery(''); setSearchResults(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-bg/50 rounded-lg text-left">
                        <FileText size={12} className="text-primary" /> <span className="font-mono font-bold">#{c.id}</span> <span className="text-textSecondary">${c.value?.toFixed(0)}</span>
                      </button>
                    ))}</div>
                  )}
                  {searchResults.patients?.length > 0 && (
                    <div className="p-2"><p className="text-[9px] font-black uppercase tracking-wider text-textSecondary px-2 py-1">Patients</p>
                    {searchResults.patients.map(c => (
                      <button key={c.id} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-bg/50 rounded-lg text-left">
                        <User size={12} className="text-indigo-500" /> <span className="font-bold">{c.label}</span> <span className="text-textSecondary">{c.extra}</span>
                      </button>
                    ))}</div>
                  )}
                  {searchResults.providers?.length > 0 && (
                    <div className="p-2"><p className="text-[9px] font-black uppercase tracking-wider text-textSecondary px-2 py-1">Providers</p>
                    {searchResults.providers.map(c => (
                      <button key={c.id} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-bg/50 rounded-lg text-left">
                        <Building2 size={12} className="text-amber-500" /> <span className="font-bold">{c.label}</span> <span className="text-textSecondary">{c.extra}</span>
                      </button>
                    ))}</div>
                  )}
                  {searchResults.policies?.length > 0 && (
                    <div className="p-2"><p className="text-[9px] font-black uppercase tracking-wider text-textSecondary px-2 py-1">Policies</p>
                    {searchResults.policies.map(c => (
                      <button key={c.id} className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-bg/50 rounded-lg text-left">
                        <FileKey size={12} className="text-green-500" /> <span className="font-mono font-bold">{c.label}</span>
                      </button>
                    ))}</div>
                  )}
                  {!searchResults.claims?.length && !searchResults.patients?.length && !searchResults.providers?.length && !searchResults.policies?.length && (
                    <div className="p-6 text-center text-xs text-textSecondary">No results found</div>
                  )}
                </div>
              )}
              {searching && searchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl p-6 text-center text-xs text-textSecondary">Searching...</div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-bold text-success sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                LIVE
              </div>
              <button 
                onClick={() => setDark(!dark)} 
                className="rounded-xl border border-border/80 bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all"
                aria-label="Toggle theme"
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button 
                onClick={() => navigate('/insurance/notifications')} 
                className="rounded-xl border border-border/80 bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary hover:shadow-[0_0_12px_rgba(99,102,241,0.15)] transition-all relative"
                aria-label="Notifications"
              >
                <Bell size={17} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[8px] font-black text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface px-3 py-2 shadow-sm hover:border-primary/30 transition-all cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-black text-white shadow-sm">
                  {(user?.name || user?.username || 'US').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="max-w-[150px] truncate text-xs font-black text-textPrimary">{user?.name || 'Insurance Admin'}</p>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${roleCfg.badge}`}>
                    {roleCfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
          <footer className="mt-10 border-t border-border/70 py-6 text-center">
            <p className="text-xs font-bold text-textPrimary">Healthcare Fraud Detection Platform <span className="text-primary">v2.0</span></p>
            <p className="text-[10px] text-textSecondary mt-1">&copy; 2026 Health Secure AI. All rights reserved.</p>
            <p className="text-[9px] text-textSecondary/60 mt-0.5">Powered by React + FastAPI + XGBoost &bull; Enterprise Security Suite</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
