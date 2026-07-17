import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, FileText, Search, Settings, Shield, Building2, LogOut, BarChart3, Users, Flag, Database, DollarSign, Brain, UserPlus, HeartPulse, Activity, AlertCircle, MonitorCog, TrendingUp, Map, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleConfigs = {
  provider: {
    label: 'Provider',
    icon: Building2,
    links: [
      { to: '/provider/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/provider/submit', label: 'Submit Claim', icon: FileText },
      { to: '/provider/claims', label: 'Track Claims', icon: Search },
    ],
  },
  insurance: {
    label: 'Insurance Company',
    icon: Shield,
    links: [
      { to: '/insurance/dashboard', label: 'Dashboard', icon: BarChart3 },
      { to: '/insurance/executive', label: 'Executive Analytics', icon: TrendingUp },
      { to: '/insurance/providers', label: 'Providers Registry', icon: Building2 },
      { to: '/insurance/patients', label: 'Patients Registry', icon: UserPlus },
      { to: '/insurance/policies', label: 'Policy Database', icon: Database },
      { to: '/insurance/review', label: 'Claims Audit', icon: Search },
      { to: '/insurance/flagged', label: 'Fraud Alerts', icon: Flag },
      { to: '/insurance/analytics', label: 'Advanced Analytics', icon: BarChart3 },
      { to: '/insurance/ai-insights', label: 'AI Insights', icon: Brain },
      { to: '/insurance/fraud-heatmap', label: 'Fraud Heatmap', icon: Map },
      { to: '/insurance/model', label: 'Model Management', icon: Brain },
      { to: '/insurance/settings', label: 'Settings', icon: Settings },
    ],
  },
};

export default function Sidebar({ role }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const config = roleConfigs[role];
  const RoleIcon = config.icon;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/20'
        : 'text-textSecondary hover:bg-primary/10 hover:text-primary'
    }`;

  const nav = (
    <nav className="mt-4 flex flex-col gap-1.5">
      {config.links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setOpen(false)}>
            <Icon size={16} />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  return (
    <>
      <button
        className="fixed left-3 top-3 z-50 rounded-xl border border-border bg-surface p-2 text-textSecondary shadow-lg md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-[280px] flex-col border-r border-border bg-surface/95 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
              <HeartPulse size={22} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-textPrimary">MediSure AI</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-textSecondary">
                <RoleIcon size={12} />
                {config.label}
              </div>
            </div>
          </div>
          {user && (
            <div className="mt-4 rounded-xl border border-border bg-bg/70 px-3 py-2">
              <div className="truncate text-xs font-bold text-textPrimary">{user.name || 'Signed in user'}</div>
              <div className="text-[10px] text-textSecondary">Live fraud analytics workspace</div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {nav}
        </div>

        <div className="border-t border-border px-3 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-textSecondary hover:bg-danger/10 hover:text-danger"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
