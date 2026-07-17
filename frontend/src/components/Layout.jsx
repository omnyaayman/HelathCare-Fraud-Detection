import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Bell, Search, ShieldCheck } from 'lucide-react';

export default function Layout({ role }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;

  return (
    <div className="flex min-h-screen overflow-hidden bg-bg text-textPrimary">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/85 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden min-w-0 items-center gap-3 rounded-xl border border-border bg-bg/70 px-3 py-2 text-textSecondary shadow-sm lg:flex lg:w-[420px]">
              <Search size={16} />
              <span className="truncate text-xs">Search claims, patients, providers, policies</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-bold text-success sm:flex">
                <ShieldCheck size={14} />
                Secure session
              </div>
              <button onClick={() => navigate('/insurance/notifications')} className="rounded-xl border border-border bg-surface p-2 text-textSecondary hover:border-primary/40 hover:text-primary" aria-label="Notifications">
                <Bell size={17} />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">
                  {(user?.name || user?.username || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="max-w-[150px] truncate text-xs font-black text-textPrimary">{user?.name || 'Healthcare User'}</p>
                  <p className="text-[10px] uppercase tracking-widest text-textSecondary">{role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-8">
          <Outlet />
          <footer className="mt-10 border-t border-border/70 py-5 text-center text-xs text-textSecondary">
            Healthcare Fraud Detection Platform - Enterprise analytics powered by live backend data
          </footer>
        </main>
      </div>
    </div>
  );
}
