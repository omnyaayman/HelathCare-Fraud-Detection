import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BrainCircuit, AlertTriangle, Target, ShieldCheck, DollarSign, Building2,
  MapPin, Stethoscope, UserCheck, Activity, Lightbulb, ExternalLink, Eye,
  FileText, X, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Zap,
  BarChart3, PieChart, Flame, ShieldAlert, Crosshair, Clock, RefreshCw,
  ArrowUpRight, Sparkles, Database, Cpu
} from 'lucide-react';
import api from '../../api';
import Skeleton from '../../components/Skeleton';
import { formatCompactCurrency, formatCurrency } from '../../data/dataUtils';

const SEVERITY = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/10', label: 'Critical', dot: 'bg-red-500' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/10', label: 'High', dot: 'bg-orange-500' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/10', label: 'Medium', dot: 'bg-amber-500' },
  low: { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', glow: 'shadow-sky-500/10', label: 'Low', dot: 'bg-sky-500' },
};

const INSIGHT_ICONS = {
  admission_analysis: Crosshair,
  claim_amount_analysis: DollarSign,
  provider_specialty: Building2,
  geographic_analysis: MapPin,
  patient_behavior: UserCheck,
  diagnosis_pattern: Stethoscope,
  financial_risk: Flame,
  fraud_trend: TrendingUp,
};

const FI_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6', '#f97316'];

export default function AIInsights() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getAiInsightsDetailed();
      setData(res);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 600);
  }, [load]);

  const kpi = data?.kpi || {};
  const model = data?.model || {};
  const featureImportance = data?.feature_importance || [];
  const insights = data?.insights || [];

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    insights.forEach(i => { const s = (i.severity || 'low').toLowerCase(); counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }, [insights]);

  if (loading) return <Skeleton rows={8} />;

  return (
    <div className="min-h-screen space-y-6">

      <style>{`
        @keyframes ai-gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ai-pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes ai-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ai-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .ai-gradient-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 25%, #172554 50%, #1e1b4b 75%, #0f172a 100%);
          background-size: 400% 400%;
          animation: ai-gradient-shift 15s ease infinite;
        }
        .ai-glass {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.15);
        }
        .ai-glass-card {
          background: rgba(30, 41, 59, 0.5);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(148, 163, 184, 0.08);
        }
        .ai-shimmer-text {
          background: linear-gradient(90deg, #818cf8, #c084fc, #22d3ee, #818cf8);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: ai-shimmer 4s linear infinite;
        }
        .ai-kpi-glow { box-shadow: 0 0 30px -5px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255,255,255,0.05); }
        .ai-card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .ai-card-hover:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.4); border-color: rgba(99, 102, 241, 0.3); }
        .ai-bar-animate { transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .ai-severity-pulse { animation: ai-pulse-ring 2s ease-out infinite; }
        .ai-float { animation: ai-float 3s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="ai-gradient-bg rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 bg-indigo-500 rounded-full blur-3xl" />
          <div className="absolute bottom-4 left-12 w-24 h-24 bg-cyan-500 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-purple-500 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20">
                <BrainCircuit className="w-7 h-7 text-indigo-300" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 ai-float" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Insights</h1>
              <p className="text-sm text-slate-400 mt-0.5">Model-driven fraud analysis and behavioral patterns generated from real healthcare claim data.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Model Active</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          icon={Building2}
          title="Top Fraud Provider"
          primary={kpi.top_provider?.name || 'N/A'}
          value={kpi.top_provider?.fraud_count || 0}
          unit="fraud cases"
          subtitle={`${kpi.top_provider?.specialty || ''} · ${kpi.top_provider?.fraud_rate || 0}% fraud rate`}
          extra={`${formatCompactCurrency(kpi.top_provider?.fraud_amount || 0)} suspicious`}
          color="from-indigo-500 to-blue-600"
          delay={0}
        />
        <KpiCard
          icon={MapPin}
          title="Top Fraud City"
          primary={kpi.top_city?.city || 'N/A'}
          value={kpi.top_city?.fraud_count || 0}
          unit="fraud cases"
          subtitle={`${kpi.top_city?.fraud_rate || 0}% fraud rate`}
          extra={`+${kpi.top_city?.pct_above_avg || 0}% above avg`}
          color="from-purple-500 to-pink-600"
          delay={1}
        />
        <KpiCard
          icon={Stethoscope}
          title="Top Flagged Diagnosis"
          primary={`ICD ${kpi.top_diagnosis?.code || 'N/A'}`}
          value={kpi.top_diagnosis?.fraud_count || 0}
          unit="flagged claims"
          subtitle={`${kpi.top_diagnosis?.fraud_rate || 0}% fraud rate`}
          extra={`$${(kpi.top_diagnosis?.avg_amount || 0).toLocaleString()} avg`}
          color="from-cyan-500 to-teal-600"
          delay={2}
        />
        <KpiCard
          icon={UserCheck}
          title="Highest Risk Patient"
          primary={kpi.top_patient?.name || 'N/A'}
          value={kpi.top_patient?.fraud_count || 0}
          unit="suspicious claims"
          subtitle={`Score: ${((kpi.top_patient?.max_fraud_score || 0) * 100).toFixed(0)}%`}
          extra={`${formatCompactCurrency(kpi.top_patient?.suspicious_amount || 0)} at risk`}
          color="from-orange-500 to-red-600"
          delay={3}
        />
        <KpiCard
          icon={Activity}
          title="System Overview"
          primary={`${kpi.system?.total_claims?.toLocaleString() || 0}`}
          value={kpi.system?.total_fraud || 0}
          unit="fraudulent claims"
          subtitle={`${kpi.system?.fraud_rate || 0}% fraud rate`}
          extra={`${formatCompactCurrency(kpi.system?.total_amount || 0)} total`}
          color="from-emerald-500 to-green-600"
          delay={4}
        />
      </div>

      {/* Model Performance + Feature Importance */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Feature Importance */}
        <div className="xl:col-span-2 ai-glass-card rounded-2xl p-5 ai-card-hover">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Feature Importance</h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">XGBoost Model</span>
          </div>
          <div className="space-y-3">
            {featureImportance.slice(0, 8).map((f, i) => (
              <div key={f.feature} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 w-4">{i + 1}</span>
                    <span className="text-xs text-slate-300 font-medium">{f.feature}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden ml-6">
                  <div
                    className="h-full rounded-full ai-bar-animate"
                    style={{
                      width: `${Math.max(f.importance * 100, 2)}%`,
                      background: `linear-gradient(90deg, ${FI_COLORS[i % FI_COLORS.length]}cc, ${FI_COLORS[i % FI_COLORS.length]})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Performance */}
        <div className="xl:col-span-3 ai-glass-card rounded-2xl p-5 ai-card-hover">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/15">
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Model Performance</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">v{model.version || '1.0.0'}</span>
              <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-1 rounded-md">{(model.training_samples || 0).toLocaleString()} samples</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Accuracy', value: model.accuracy, color: 'from-emerald-400 to-emerald-600', icon: Target },
              { label: 'Precision', value: model.precision, color: 'from-blue-400 to-blue-600', icon: Crosshair },
              { label: 'Recall', value: model.recall, color: 'from-violet-400 to-violet-600', icon: ShieldCheck },
              { label: 'F1 Score', value: model.f1_score, color: 'from-amber-400 to-amber-600', icon: Zap },
              { label: 'ROC AUC', value: model.roc_auc, color: 'from-cyan-400 to-cyan-600', icon: Activity },
            ].map((m) => (
              <div key={m.label} className="text-center group">
                <div className="relative inline-block mb-3">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${m.color} bg-opacity-10 flex items-center justify-center mx-auto relative overflow-hidden`}
                    style={{ background: `linear-gradient(135deg, ${m.color.includes('emerald') ? '#10b98120' : m.color.includes('blue') ? '#3b82f620' : m.color.includes('violet') ? '#8b5cf620' : m.color.includes('amber') ? '#f59e0b20' : '#06b6d420'}, transparent)` }}>
                    <m.icon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <div className={`text-2xl font-bold bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>
                  {typeof m.value === 'number' ? `${(m.value * 100).toFixed(1)}%` : m.value || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
          {model.last_training_date && (
            <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-center gap-2">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">Last trained: {model.last_training_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="ai-glass rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">{insights.length} Insights Generated</span>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(severityCounts).map(([key, count]) => count > 0 && (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${SEVERITY[key].dot}`} />
                <span className="text-xs text-slate-400">{count} {SEVERITY[key].label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database className="w-3 h-3" />
          <span>Powered by {kpi.system?.total_claims?.toLocaleString() || 0} claims</span>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Lightbulb className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Generated AI Insights</h3>
          </div>
          {insights.map((insight) => {
            const sKey = (insight.severity || 'low').toLowerCase();
            const sev = SEVERITY[sKey] || SEVERITY.low;
            const InsightIcon = INSIGHT_ICONS[insight.type] || AlertTriangle;
            const isExpanded = expandedInsight === insight.id;
            const confLevel = insight.confidence >= 85 ? 'high' : insight.confidence >= 65 ? 'medium' : 'low';
            const confColor = confLevel === 'high' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : confLevel === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

            return (
              <div
                key={insight.id}
                className={`ai-glass-card rounded-xl overflow-hidden ai-card-hover ${isExpanded ? `ring-1 ring-${sKey === 'critical' ? 'red' : sKey === 'high' ? 'orange' : sKey === 'medium' ? 'amber' : 'sky'}-500/30` : ''}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${sev.bg} shrink-0 mt-0.5 relative`}>
                      <InsightIcon className={`w-4 h-4 ${sev.color}`} />
                      {sKey === 'critical' && (
                        <div className={`absolute inset-0 rounded-xl ${sev.bg} ai-severity-pulse`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${confColor}`}>
                          {insight.confidence}% Confidence
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                        <span className="text-[10px] text-slate-600 bg-slate-800/40 px-2 py-0.5 rounded-full">
                          {insight.type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{insight.description}</p>
                      {insight.evidence && insight.evidence.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {insight.evidence.map((evidence, ei) => (
                            <li key={ei} className="flex items-start gap-1.5 text-[10px] text-slate-500">
                              <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                              <span>{evidence}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedInsight(isExpanded ? null : insight.id)}
                      className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-700/30 p-4 bg-slate-900/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="ai-glass rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Confidence Level</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confLevel === 'high' ? 'bg-emerald-500' : confLevel === 'medium' ? 'bg-amber-500' : 'bg-slate-500'}`}
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white">{insight.confidence}%</span>
                        </div>
                      </div>
                      <div className="ai-glass rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Severity</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${sev.dot}`} />
                          <span className={`text-sm font-semibold ${sev.color}`}>{sev.label}</span>
                        </div>
                      </div>
                      <div className="ai-glass rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Category</div>
                        <span className="text-sm font-semibold text-white capitalize">{insight.type?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    {insight.evidence && insight.evidence.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Supporting Evidence</div>
                        <div className="space-y-1.5">
                          {insight.evidence.map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                              <FileText className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                              <span>{e}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, title, primary, value, unit, subtitle, extra, color, delay }) {
  return (
    <div
      className="ai-glass-card rounded-xl p-4 ai-card-hover ai-kpi-glow relative overflow-hidden group"
      style={{ animationDelay: `${delay * 0.05}s` }}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:opacity-10 transition-opacity`} />
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${color} bg-opacity-15`}
          style={{ background: `linear-gradient(135deg, ${color.includes('indigo') ? '#6366f120' : color.includes('purple') ? '#a855f720' : color.includes('cyan') ? '#06b6d420' : color.includes('orange') ? '#f9731620' : '#10b98120'}, transparent)` }}>
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="text-base font-bold text-white truncate mb-1">{primary}</div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-lg font-black text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        <span className="text-[10px] text-slate-500 font-medium">{unit}</span>
      </div>
      <p className="text-[10px] text-slate-500 truncate mb-1">{subtitle}</p>
      {extra && (
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
          <ArrowUpRight className="w-2.5 h-2.5" />
          {extra}
        </div>
      )}
    </div>
  );
}
