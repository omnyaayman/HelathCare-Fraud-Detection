
import { useState, useEffect } from 'react';
import { Search, Building2, Plus, Download, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import api from '../../api';

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getProviders();
        setProviders(res);
      } catch (err) {
        console.error('Failed to load providers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = providers.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-textSecondary">Loading providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Provider Management</h1>
          <p className="mt-1 text-sm text-textSecondary">Manage healthcare providers and facilities</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-textPrimary hover:bg-bg">
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="enterprise-card">
        <div className="flex items-center gap-4 border-b border-border p-4">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
            <Search size={16} className="text-textSecondary" />
            <input
              type="text"
              placeholder="Search providers..."
              className="flex-1 bg-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Provider ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Specialty</th>
                <th>Location</th>
                <th>Total Claims</th>
                <th>Fraud Cases</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((provider) => (
                <tr key={provider.provider_id}>
                  <td className="font-mono text-xs font-bold text-textSecondary">#{provider.provider_id}</td>
                  <td className="font-semibold text-textPrimary">{provider.name}</td>
                  <td className="text-sm text-textSecondary">{provider.type}</td>
                  <td className="text-sm text-textSecondary">{provider.specialty}</td>
                  <td className="text-sm text-textSecondary">{provider.city}, {provider.state}</td>
                  <td className="text-sm text-textSecondary">{provider.claim_count || 0} claims</td>
                  <td className="text-sm">
                    {(provider.fraud_count || 0) > 0 ? (
                      <span className="flex items-center gap-1 text-danger font-bold">
                        <AlertTriangle size={14} />
                        {provider.fraud_count} cases
                      </span>
                    ) : (
                      <span className="text-textSecondary">0 cases</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedProvider(provider)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-textSecondary hover:border-primary hover:text-primary"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedProvider(null)}>
          <div className="enterprise-card max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-textPrimary">Provider Details</h3>
              <button onClick={() => setSelectedProvider(null)} className="text-textSecondary hover:text-textPrimary">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-accent text-white text-2xl font-black">
                  <Building2 size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-textPrimary">{selectedProvider.name}</h4>
                  <p className="text-sm text-textSecondary">Provider #{selectedProvider.provider_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Type</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.type}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Specialty</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.specialty}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Location</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.city}, {selectedProvider.state}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Total Claims</p>
                  <p className="font-semibold text-textPrimary">{selectedProvider.claim_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">Fraud Cases</p>
                  <p className={`font-bold text-lg ${(selectedProvider.fraud_count || 0) > 0 ? 'text-danger' : 'text-success'}`}>
                    {selectedProvider.fraud_count || 0} confirmed fraud cases
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

