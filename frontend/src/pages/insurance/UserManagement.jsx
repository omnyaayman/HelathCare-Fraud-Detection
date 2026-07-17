
import { useState } from 'react';
import { UserCog, Plus, Edit, Trash2, Search, Filter, Shield, User, CheckCircle, XCircle, Clock } from 'lucide-react';

const mockUsers = [
  { id: 1, name: 'Admin User', email: 'admin@healthcare.com', role: 'admin', status: 'active', lastLogin: '2024-07-16 10:30:00', claimsReviewed: 1240 },
  { id: 2, name: 'Fraud Analyst', email: 'analyst@healthcare.com', role: 'analyst', status: 'active', lastLogin: '2024-07-16 09:15:00', claimsReviewed: 890 },
  { id: 3, name: 'Claims Manager', email: 'manager@healthcare.com', role: 'manager', status: 'active', lastLogin: '2024-07-15 16:45:00', claimsReviewed: 560 },
  { id: 4, name: 'Provider Rep', email: 'provider@healthcare.com', role: 'provider', status: 'inactive', lastLogin: '2024-07-10 14:20:00', claimsReviewed: 0 },
];

const roles = ['admin', 'analyst', 'manager', 'provider'];
const statuses = ['active', 'inactive'];

const statusConfig = {
  active: { icon: CheckCircle, text: 'text-green-500', bg: 'bg-green-500/10' },
  inactive: { icon: XCircle, text: 'text-red-500', bg: 'bg-red-500/10' },
};

export default function UserManagement() {
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
            <UserCog size={14} />
            Access Control
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-textPrimary">User Management</h1>
          <p className="mt-2 text-sm text-textSecondary">Manage system users and their permissions</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white hover:brightness-110">
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-border bg-surface py-3 pl-12 pr-4 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <Filter size={16} className="text-textSecondary" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full border-0 bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">All Roles</option>
            {roles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
          <Filter size={16} className="text-textSecondary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border-0 bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="grid grid-cols-12 gap-4 text-xs font-black uppercase tracking-widest text-textSecondary">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Last Login</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredUsers.map(user => {
            const status = statusConfig[user.status];
            const StatusIcon = status.icon;
            return (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-bg/50">
                <div className="col-span-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-textPrimary truncate">{user.name}</p>
                    <p className="text-xs text-textSecondary truncate">{user.email}</p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
                    {user.role}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`inline-flex items-center gap-2 rounded-full ${status.bg} px-3 py-1 text-[11px] font-black uppercase tracking-widest ${status.text}`}>
                    <StatusIcon size={12} />
                    {user.status}
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-2 text-xs text-textSecondary">
                  <Clock size={14} />
                  {user.lastLogin}
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <button className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <Edit size={16} />
                  </button>
                  <button className="rounded-lg bg-danger/10 p-2 text-danger hover:bg-danger/20">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

