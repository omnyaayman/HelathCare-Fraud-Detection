import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, FileText, Search, Shield, Building2, LogOut, BarChart3, Users, Database, TrendingUp, ShieldAlert, BrainCircuit, Map, Cpu, Settings, ChevronLeft, ChevronRight, Bell, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const roleConfigs = {
  provider: {
    label: 'Provider Portal',
    icon: Building2,
    sections: [
      {
        title: 'OVERVIEW',
        links: [
          { to: '/provider/dashboard', label: 'Dashboard', icon: BarChart3 },
        ]
      },
      {
        title: 'CLAIMS MANAGEMENT',
        links: [
          { to: '/provider/submit', label: 'Submit Claim', icon: FileText },
          { to: '/provider/claims', label: 'Track Claims', icon: Search },
        ]
      }
    ],
  },
  insurance: {
    label: 'Insurance Space',
    icon: Shield,
    sections: [
      {
        title: 'OVERVIEW',
        links: [
          { to: '/insurance/dashboard', label: 'Dashboard', icon: BarChart3 },
          { to: '/insurance/executive', label: 'Executive Summary', icon: TrendingUp },
          { to: '/insurance/alerts', label: 'Alert Center', icon: ShieldAlert },
        ]
      },
      {
        title: 'CLAIMS MANAGEMENT',
        links: [
          { to: '/insurance/review', label: 'All Claims', icon: FileText },
          { to: '/insurance/flagged', label: 'Flagged / Fraud', icon: ShieldAlert },
        ]
      },
      {
        title: 'NETWORK',
        links: [
          { to: '/insurance/patients', label: 'Patients', icon: Users },
          { to: '/insurance/providers', label: 'Providers', icon: Building2 },
          { to: '/insurance/policies', label: 'Policies', icon: Database },
        ]
      },
      {
        title: 'INTELLIGENCE & AI',
        links: [
          { to: '/insurance/analytics', label: 'Analytics', icon: BarChart3 },
          { to: '/insurance/ai-insights', label: 'AI Insights', icon: BrainCircuit },
          { to: '/insurance/fraud-heatmap', label: 'Fraud Heatmap', icon: Map },
          { to: '/insurance/model', label: 'Model Management', icon: Cpu },
        ]
      },
      {
        title: 'SYSTEM',
        links: [
          { to: '/insurance/reports', label: 'Reports', icon: FileText },
          { to: '/insurance/settings', label: 'System Monitoring', icon: Settings },
        ]
      }
    ],
  },
};

export default function Sidebar({ role, collapsed, toggleCollapse }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const config = roleConfigs[role];
  const subrole = user?.subrole || 'admin';

  const isLinkAllowed = (to) => {
    if (role !== 'insurance') return true;
    if (subrole === 'admin') return true;
    if (subrole === 'auditor') {
      return !['/insurance/executive', '/insurance/settings', '/insurance/model'].includes(to);
    }
    if (subrole === 'manager') {
      return !['/insurance/settings', '/insurance/model'].includes(to);
    }
    return true;
  };

  const linkClass = ({ isActive }) =>
    `group flex items-center ${
      collapsed ? 'justify-center px-2.5' : 'justify-between px-4'
    } py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
      isActive
        ? 'bg-[#4f46e5]/15 text-[#818cf8] sidebar-active-indicator shadow-sm'
        : 'text-[#94a3b8] hover:bg-[#1e293b]/60 hover:text-[#f8fafc] hover:translate-x-0.5'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  return (
    <>
      <button
        className="fixed left-3 top-3 z-50 rounded-xl border border-slate-700 bg-[#0f131f] p-2 text-[#94a3b8] shadow-lg md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#0b0f19] border-r border-[#1e293b] text-[#f8fafc] transition-all duration-300 md:sticky md:top-0 md:z-auto md:translate-x-0 ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-7 z-50 h-6 w-6 items-center justify-center rounded-full border border-[#1e293b] bg-[#0b0f19] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b] shadow-md transition-all duration-200 hover:scale-110"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className={`px-6 py-6 border-b border-[#1e293b] flex items-center ${collapsed ? 'justify-center px-4' : 'justify-between'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4f46e5] to-[#818cf8] text-white shadow-lg shadow-indigo-500/25 shrink-0">
              <Shield size={20} />
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-in fade-in duration-300">
                <div className="text-sm font-black tracking-wider text-white">HEALTH SECURE</div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-6 custom-scrollbar`}>
          {config.sections.map((section, idx) => {
            const allowedLinks = section.links.filter(l => isLinkAllowed(l.to));
            if (allowedLinks.length === 0) return null;
            return (
              <div key={idx} className="space-y-1">
                {collapsed ? (
                  <hr className="border-[#1e293b] mx-2 my-4" />
                ) : (
                  <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-[#475569]">{section.title}</h3>
                )}
                <div className="flex flex-col gap-1 mt-2">
                  {allowedLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink key={link.to} to={link.to} className={linkClass} onClick={() => setOpen(false)} title={collapsed ? link.label : ''}>
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              <Icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-[#818cf8]' : 'text-[#475569] group-hover:text-[#94a3b8]'}`} />
                              {!collapsed && <span className="animate-in fade-in duration-300 whitespace-nowrap">{link.label}</span>}
                            </div>
                            {isActive && !collapsed && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#818cf8] shadow-lg shadow-indigo-500/50 animate-in zoom-in duration-200" />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#1e293b] p-4">
          <button
            onClick={handleLogout}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 transition-colors`}
            title={collapsed ? 'Sign out' : ''}
          >
            <LogOut size={16} />
            {!collapsed && <span className="animate-in fade-in duration-300">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
