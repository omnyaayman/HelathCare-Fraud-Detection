import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, AlertTriangle, ShieldCheck, MapPin, Building2, Users } from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';

const getRiskColor = (score) => {
  if (score >= 70) return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', fill: '#ef4444' };
  if (score >= 50) return { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', fill: '#eab308' };
  return { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', fill: '#22c55e' };
};

export default function FraudHeatmap() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getHeatmapProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to fetch heatmap providers', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const highRisk = providers.filter(p => (p.average_risk_score || 0) >= 70).length;
  const medRisk = providers.filter(p => (p.average_risk_score || 0) >= 50 && (p.average_risk_score || 0) < 70).length;
  const lowRisk = providers.filter(p => (p.average_risk_score || 0) < 50).length;

  if (loading) {
    return <Skeleton rows={8} />;
  }

  const center = providers.length > 0 ? [providers[0].latitude || 40.7128, providers[0].longitude || -74.0060] : [40.7128, -74.0060];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
          <Map size={14} />
          Geographic Intelligence
        </div>
        <h1 className="text-2xl font-bold text-textPrimary">Fraud Heatmap</h1>
        <p className="text-sm text-textSecondary">Geographic visualization of fraud risk and distribution</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-500/10 p-3 text-red-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">High Risk Regions</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{highRisk}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-500/10 p-3 text-yellow-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Medium Risk Regions</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{medRisk}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-3 text-green-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Low Risk Regions</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{lowRisk}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-textSecondary">Total Providers</p>
              <p className="mt-1 text-2xl font-black text-textPrimary">{providers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-primary" />
            Geographic Risk Distribution
          </h3>
          <div className="h-96 rounded-xl border border-border overflow-hidden">
            <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {providers.map((provider, idx) => {
                  const cfg = getRiskColor(provider.average_risk_score || 0);
                  return (
                    <CircleMarker
                      key={idx}
                      center={[provider.latitude || 40.7128, provider.longitude || -74.0060]}
                      radius={5 + (provider.average_risk_score / 20)}
                      fillColor={cfg.fill}
                      color={cfg.fill}
                      weight={2}
                      fillOpacity={0.7}
                    >
                      <Tooltip>
                        <div className="font-bold">{provider.provider_name}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{provider.city || 'Unknown'}</div>
                      </Tooltip>
                      <Popup>
                        <div className="p-1">
                          <div className="font-bold text-lg">{provider.provider_name}</div>
                          <div className="text-gray-600 dark:text-gray-400">{provider.city || 'Unknown'}, {provider.state || 'Unknown'}</div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div><span className="font-semibold">Fraud Claims:</span> {provider.fraud_claims_count || 0}</div>
                            <div><span className="font-semibold">Total Claims:</span> {provider.total_claims_count || 0}</div>
                            <div><span className="font-semibold">Fraud %:</span> {((provider.fraud_claims_count || 0) / (provider.total_claims_count || 1) * 100).toFixed(1)}%</div>
                            <div><span className="font-semibold">Avg Risk Score:</span> {(provider.average_risk_score || 0).toFixed(1)}</div>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h3 className="text-sm font-bold text-textPrimary flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-primary" />
            Risk by Provider
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {providers.map((provider, idx) => {
              const cfg = getRiskColor(provider.average_risk_score || 0);
              return (
                <div key={idx} className={`rounded-xl border ${cfg.border} bg-bg/50 p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-textPrimary truncate">{provider.provider_name || 'Unknown'}</p>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-textSecondary">
                        <span className="flex items-center gap-1">
                          <Building2 size={12} />
                          {provider.city || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {provider.fraud_claims_count || 0} fraud
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-textSecondary">Risk Score</p>
                      <p className={`text-lg font-black ${cfg.text}`}>{(provider.average_risk_score || 0).toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, provider.average_risk_score || 0)}%`, backgroundColor: cfg.fill }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
