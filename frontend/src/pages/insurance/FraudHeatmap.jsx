import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import { AlertTriangle, DollarSign, Activity, Users, Building2, TrendingUp, Search, ChevronRight, MapPin } from 'lucide-react';
import api from '../../api';
import Modal from '../../components/Modal';
import 'leaflet/dist/leaflet.css';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

function getColor(score) {
  if (score >= 12) return '#ef4444';
  if (score >= 8) return '#f97316';
  if (score >= 5) return '#eab308';
  return '#22c55e';
}

function getRadius(fraudCount) {
  return Math.min(Math.max(Math.sqrt(fraudCount || 1) * 3, 6), 30);
}

export default function FraudHeatmap() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getHeatmapProviders();
        setProviders(Array.isArray(data) ? data : (data?.data || data?.providers || []));
      } catch (err) {
        console.error('Failed to load heatmap data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const regionAgg = useMemo(() => {
    const map = {};
    providers.forEach(p => {
      const key = p.state || 'Unknown';
      if (!map[key]) map[key] = { state: key, totalClaims: 0, fraudClaims: 0, providers: new Set() };
      map[key].totalClaims += p.total_claims_count || 0;
      map[key].fraudClaims += p.fraud_claims_count || 0;
      if (p.provider_name) map[key].providers.add(p.provider_name);
    });
    return Object.values(map)
      .map(r => ({ ...r, fraudRate: r.totalClaims > 0 ? (r.fraudClaims / r.totalClaims) * 100 : 0, providerCount: r.providers.size }))
      .sort((a, b) => b.fraudRate - a.fraudRate);
  }, [providers]);

  const topRegions = regionAgg.slice(0, 5);
  const totalFraudAgg = providers.reduce((s, p) => s + (p.fraud_claims_count || 0), 0);
  const totalClaimsAgg = providers.reduce((s, p) => s + (p.total_claims_count || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-surface rounded" />
        <div className="h-[500px] bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-textPrimary">Fraud Heatmap</h1>
          <p className="mt-1 text-sm text-textSecondary">Geospatial view of provider fraud risk across the United States</p>
        </div>
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-3 py-2">
          <Search size={15} className="text-textSecondary" />
          <input type="text" placeholder="Search provider, city..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className="bg-transparent outline-none text-xs text-textPrimary w-40" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <div className="enterprise-card overflow-hidden p-0">
            <div className="bg-surface p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-textPrimary">Provider Fraud Concentration</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-textSecondary">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Low</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Medium</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> High</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-danger" /> Critical</span>
              </div>
            </div>
            <div className="h-[520px] w-full bg-[#1a1d2e]">
              <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }}
                className="z-0" zoomControl={true}>
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {providers.filter(p => p.latitude && p.longitude && (!searchTerm || p.provider_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.city?.toLowerCase().includes(searchTerm.toLowerCase()))).map((p) => {
                  const riskScore = (p.fraud_claims_count || 0) / Math.max(p.total_claims_count || 1, 1) * 100;
                  return (
                    <CircleMarker
                      key={p.provider_id}
                      center={[p.latitude, p.longitude]}
                      radius={getRadius(p.fraud_claims_count || 0)}
                      pathOptions={{
                        color: getColor(riskScore),
                        fillColor: getColor(riskScore),
                        fillOpacity: 0.6,
                        weight: 1.5,
                      }}
                      eventHandlers={{
                        click: () => setSelectedProvider(p),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} className="bg-surface border border-border text-textPrimary text-xs rounded-lg shadow-xl">
                        <div className="font-bold">{p.provider_name}</div>
                        <div className="text-textSecondary">{p.city}, {p.state}</div>
                      </Tooltip>
                      <Popup>
                        <div className="min-w-[200px] bg-surface text-textPrimary">
                          <div className="font-black text-sm mb-2">{p.provider_name}</div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between"><span className="text-textSecondary">Location:</span><span>{p.city}, {p.state}</span></div>
                            <div className="flex justify-between"><span className="text-textSecondary">Total Claims:</span><span className="font-mono font-bold">{p.total_claims_count?.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-textSecondary">Fraud Claims:</span><span className="font-mono font-bold text-danger">{p.fraud_claims_count?.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-textSecondary">Fraud Rate:</span><span className={`font-mono font-bold ${riskScore >= 12 ? 'text-danger' : riskScore >= 5 ? 'text-warning' : 'text-success'}`}>{riskScore.toFixed(1)}%</span></div>
                            <div className="flex justify-between"><span className="text-textSecondary">Risk Score:</span><span className="font-mono font-bold">{(p.average_risk_score || 0).toFixed(1)}</span></div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="enterprise-card">
            <h3 className="text-sm font-bold text-textPrimary mb-4">Top Fraud Regions</h3>
            <div className="space-y-2">
              {topRegions.map((r, i) => {
                const pct = totalClaimsAgg > 0 ? (r.fraudClaims / totalFraudAgg) * 100 : 0;
                return (
                  <div key={r.state} className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50 border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-black text-textSecondary w-4">{i + 1}.</span>
                      <div>
                        <span className="text-sm font-bold text-textPrimary">{r.state}</span>
                        <div className="text-[10px] text-textSecondary">{r.providerCount} providers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold font-mono text-sm ${r.fraudRate >= 12 ? 'text-danger' : r.fraudRate >= 5 ? 'text-warning' : 'text-success'}`}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="enterprise-card">
            <h3 className="text-sm font-bold text-textPrimary mb-3">Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50">
                <span className="text-[10px] font-bold text-textSecondary uppercase">Providers</span>
                <span className="font-mono font-bold">{providers.length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50">
                <span className="text-[10px] font-bold text-textSecondary uppercase">Total Claims</span>
                <span className="font-mono font-bold">{totalClaimsAgg.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50">
                <span className="text-[10px] font-bold text-textSecondary uppercase">Fraud Claims</span>
                <span className="font-mono font-bold text-danger">{totalFraudAgg.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-bg/50">
                <span className="text-[10px] font-bold text-textSecondary uppercase">Avg Fraud Rate</span>
                <span className="font-mono font-bold text-warning">
                  {totalClaimsAgg > 0 ? ((totalFraudAgg / totalClaimsAgg) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedProvider} onClose={() => setSelectedProvider(null)} title={`Provider: ${selectedProvider?.provider_name || ''}`}>
        {selectedProvider && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary"><Building2 size={24} /></div>
              <div>
                <h3 className="text-lg font-black text-textPrimary">{selectedProvider.provider_name}</h3>
                <p className="text-sm text-textSecondary">{selectedProvider.city}, {selectedProvider.state}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Total Claims</p>
                <p className="text-xl font-black text-textPrimary font-mono">{(selectedProvider.total_claims_count || 0).toLocaleString()}</p>
              </div>
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Fraud Claims</p>
                <p className="text-xl font-black text-danger font-mono">{(selectedProvider.fraud_claims_count || 0).toLocaleString()}</p>
              </div>
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Fraud Rate</p>
                <p className={`text-xl font-black font-mono ${(selectedProvider.fraud_claims_count || 0) / Math.max(selectedProvider.total_claims_count || 1, 1) * 100 >= 12 ? 'text-danger' : 'text-warning'}`}>
                  {((selectedProvider.fraud_claims_count || 0) / Math.max(selectedProvider.total_claims_count || 1, 1) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-bg/40 rounded-xl p-4 border border-border/60">
                <p className="text-[9px] font-black uppercase tracking-widest text-textSecondary">Avg Risk Score</p>
                <p className="text-xl font-black text-textPrimary font-mono">{(selectedProvider.average_risk_score || 0).toFixed(1)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
