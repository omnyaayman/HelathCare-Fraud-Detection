import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, FileText, Search, Settings, Shield, Building2, LogOut, BarChart3, Users, Flag, Database, DollarSign, Brain, UserPlus } from 'lucide-react';
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
      { to: '/insurance/providers', label: 'Providers', icon: Building2 },
      { to: '/insurance/patients', label: 'Patients', icon: UserPlus },
      { to: '/insurance/review', label: 'Review Claims', icon: Search },
      { to: '/insurance/flagged', label: 'Flagged Claims', icon: Flag },
      { to: '/insurance/labeled', label: 'Labeled Data', icon: Database },
      { to: '/insurance/copay', label: 'Copay Management', icon: DollarSign },
      { to: '/insurance/model', label: 'Model Management', icon: Brain },
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
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-[#1f2937] text-primary'
        : 'text-textSecondary hover:text-textPrimary hover:bg-[#1c2128]'
    }`;

  const nav = (
    <nav className="flex flex-col gap-1 mt-4">
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
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-surface border border-border text-textSecondary md:hidden"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[248px] bg-surface border-r border-border flex flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:static md:z-auto`}
      >
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-textPrimary text-sm font-medium">
            <RoleIcon size={16} />
            {config.label}
          </div>
          {user && (
            <div className="text-xs text-textSecondary mt-1 truncate">{user.name}</div>
          )}
        </div>

        <div className="flex-1 px-3 py-2 overflow-y-auto">
          {nav}
        </div>

        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-textSecondary hover:text-textPrimary hover:bg-[#1c2128] w-full transition-colors duration-150"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
