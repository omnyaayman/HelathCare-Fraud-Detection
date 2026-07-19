import { useState, useEffect, useMemo, useCallback } from 'react';
import PlotlyChart from '../../components/PlotlyChart';
import Skeleton from '../../components/Skeleton';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import {
  BrainCircuit, Activity, Target, Zap, Clock, Database, TrendingUp,
  RefreshCw, CheckCircle2, AlertTriangle, Cpu, BarChart3, Loader2,
  ArrowUpRight, ArrowDownRight, Settings, FileText, Shield, Eye,
  ChevronRight
} from 'lucide-react';
import api from '../../api';
import { CANONICAL_MODEL } from '../../data/canonicalData';

const modelVersions = CANONICAL_MODEL.versions.map(v => ({
  name: v.label,
  version: v.version,
  status: v.status,
  accuracy: `${(v.accuracy * 100).toFixed(1)}%`,
  lastTrained: v.date === '2026-01-15' ? 'Jan 15, 2026' : v.date === '2025-12-28' ? 'Dec 28, 2025' : 'Nov 14, 2025',
  color: v.status === 'active' ? '#818cf8' : v.status === 'standby' ? '#38bdf8' : '#94a3b8',
  icon: v.status === 'active' ? BrainCircuit : v.status === 'standby' ? Shield : Database
}));

const performanceMetrics = [
  { label: 'Accuracy', value: `${(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%`, change: '+1.2%', up: true, icon: Target, color: '#818cf8' },
  { label: 'Precision', value: `${(CANONICAL_MODEL.precision * 100).toFixed(1)}%`, change: '+0.8%', up: true, icon: Activity, color: '#38bdf8' },
  { label: 'Recall', value: `${(CANONICAL_MODEL.recall * 100).toFixed(1)}%`, change: '+1.5%', up: true, icon: Eye, color: '#34d399' },
  { label: 'F1 Score', value: `${(CANONICAL_MODEL.f1Score * 100).toFixed(1)}%`, change: '+1.4%', up: true, icon: BarChart3, color: '#fbbf24' },
  { label: 'ROC AUC', value: (CANONICAL_MODEL.rocAuc).toFixed(4), change: '+0.008', up: true, icon: TrendingUp, color: '#a78bfa' },
  { label: 'Prediction Time', value: `${CANONICAL_MODEL.predictionTimeMs}ms`, change: '-2ms', up: true, icon: Zap, color: '#fb923c' }
];

const additionalInfo = [
  { label: 'Dataset Version', value: CANONICAL_MODEL.datasetVersion, icon: Database, color: '#818cf8' },
  { label: 'Model Version', value: CANONICAL_MODEL.version, icon: Cpu, color: '#38bdf8' },
  { label: 'Training Date', value: 'Jan 15, 2026', icon: Clock, color: '#34d399' },
  { label: 'Data Drift %', value: `${CANONICAL_MODEL.dataDrift}%`, icon: Activity, color: '#fbbf24' },
  { label: 'Last Retraining', value: '4 days ago', icon: RefreshCw, color: '#a78bfa' },
  { label: 'Validation Accuracy', value: `${(CANONICAL_MODEL.validationAccuracy * 100).toFixed(1)}%`, icon: CheckCircle2, color: '#fb923c' },
  { label: 'Number of Features', value: CANONICAL_MODEL.numFeatures.toString(), icon: FileText, color: '#f472b6' },
  { label: 'Training Dataset Size', value: CANONICAL_MODEL.trainingSize.toLocaleString(), icon: Database, color: '#22d3ee' }
];

const trainingRuns = CANONICAL_MODEL.trainingRuns;

const confusionMatrixData = [{
  type: 'heatmap',
  z: [[CANONICAL_MODEL.confusionMatrix.tn, CANONICAL_MODEL.confusionMatrix.fp], [CANONICAL_MODEL.confusionMatrix.fn, CANONICAL_MODEL.confusionMatrix.tp]],
  x: ['Predicted: Legitimate', 'Predicted: Fraud'],
  y: ['Actual: Legitimate', 'Actual: Fraud'],
  colorscale: [
    [0, '#0f172a'],
    [0.25, '#1e3a5f'],
    [0.5, '#3b82f6'],
    [0.75, '#818cf8'],
    [1, '#c7d2fe']
  ],
  text: [[CANONICAL_MODEL.confusionMatrix.tn.toLocaleString(), CANONICAL_MODEL.confusionMatrix.fp.toLocaleString()], [CANONICAL_MODEL.confusionMatrix.fn.toLocaleString(), CANONICAL_MODEL.confusionMatrix.tp.toLocaleString()]],
  texttemplate: '%{text}',
  textfont: { size: 14, color: '#f8fafc' },
  hovertemplate: '%{y} → %{x}<br>Count: %{z:,}<extra></extra>',
  showscale: true,
  colorbar: {
    title: { text: 'Count', font: { size: 11, color: '#94a3b8' } },
    tickfont: { color: '#94a3b8', size: 10 },
    thickness: 12,
    len: 0.8,
    bgcolor: 'transparent',
    outlinewidth: 0
  }
}];

const confusionMatrixLayout = {
  title: { text: 'Confusion Matrix', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  xaxis: { tickfont: { size: 10, color: '#94a3b8' }, side: 'bottom' },
  yaxis: { tickfont: { size: 10, color: '#94a3b8' }, autorange: 'reversed' },
  margin: { t: 40, r: 60, l: 120, b: 50 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const featuresList = CANONICAL_MODEL.featureImportance.map(f => f.feature);
const importances = CANONICAL_MODEL.featureImportance.map(f => f.importance);

const barColors = importances.map((_, i) => {
  const opacity = 1 - (i * 0.08);
  return `rgba(129, 140, 248, ${opacity})`;
});

const featureImportanceData = [{
  type: 'bar',
  y: [...featuresList].reverse(),
  x: [...importances].reverse(),
  orientation: 'h',
  marker: { color: [...barColors].reverse(), cornerradius: 4 },
  text: [...importances].reverse().map(v => v.toFixed(3)),
  textposition: 'outside',
  textfont: { size: 10, color: '#94a3b8' },
  hovertemplate: '%{y}<br>Importance: %{x:.3f}<extra></extra>'
}];

const featureImportanceLayout = {
  title: { text: 'Feature Importance (Normalized)', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  xaxis: { title: { text: 'Relative Importance', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b' },
  yaxis: { tickfont: { size: 10, color: '#94a3b8' }, automargin: true },
  margin: { t: 40, r: 20, l: 180, b: 40 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

const accuracyHistoryData = [
  {
    x: months,
    y: [91.2, 91.5, 91.9, 92.1, 92.4, 92.8, 93.1, 93.5, 93.8, 94.0, 94.3, 94.6],
    name: `${CANONICAL_MODEL.version} (current)`,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#818cf8', width: 2.5, shape: 'spline' },
    marker: { size: 5, color: '#818cf8' },
    hovertemplate: `${CANONICAL_MODEL.version}<br>%{x}: %{y:.1f}%<extra></extra>`
  },
  {
    x: months,
    y: [88.5, 88.8, 89.1, 89.4, 89.7, 90.0, 90.3, 90.6, 90.9, 91.2, 91.5, 91.8],
    name: 'v3.1.0',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#38bdf8', width: 2, shape: 'spline' },
    marker: { size: 4, color: '#38bdf8' },
    hovertemplate: 'v3.1.0<br>%{x}: %{y:.1f}%<extra></extra>'
  },
  {
    x: months,
    y: [84.1, 84.4, 84.7, 85.0, 85.3, 85.6, 85.9, 86.2, 86.5, 86.8, 87.0, 87.3],
    name: 'v3.0.0 (archived)',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#94a3b8', width: 1.5, dash: 'dot', shape: 'spline' },
    marker: { size: 3, color: '#94a3b8' },
    hovertemplate: 'v3.0.0<br>%{x}: %{y:.1f}%<extra></extra>'
  }
];

const accuracyHistoryLayout = {
  title: { text: 'Model Accuracy History', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  xaxis: { tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b' },
  yaxis: { title: { text: 'Accuracy (%)', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b', range: [82, 96] },
  legend: { font: { size: 10, color: '#94a3b8' }, bgcolor: 'transparent', orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
  margin: { t: 40, r: 20, l: 50, b: 60 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const legitimateBins = [
  { x: 0, y: 2 }, { x: 5, y: 8 }, { x: 10, y: 28 }, { x: 15, y: 65 },
  { x: 20, y: 92 }, { x: 25, y: 78 }, { x: 30, y: 52 }, { x: 35, y: 30 },
  { x: 40, y: 15 }, { x: 45, y: 8 }, { x: 50, y: 3 }, { x: 55, y: 1 }
];

const fraudBins = [
  { x: 35, y: 1 }, { x: 40, y: 4 }, { x: 45, y: 12 }, { x: 50, y: 28 },
  { x: 55, y: 55 }, { x: 60, y: 82 }, { x: 65, y: 95 }, { x: 70, y: 88 },
  { x: 75, y: 65 }, { x: 80, y: 42 }, { x: 85, y: 22 }, { x: 90, y: 10 },
  { x: 95, y: 4 }, { x: 100, y: 1 }
];

const predictionDistData = [
  {
    x: legitimateBins.map(b => b.x),
    y: legitimateBins.map(b => b.y),
    name: 'Legitimate Claims',
    type: 'bar',
    marker: { color: 'rgba(52, 211, 153, 0.6)', line: { color: '#34d399', width: 1 } },
    hovertemplate: 'Score: %{x}<br>Count: %{y}<extra>Legitimate</extra>'
  },
  {
    x: fraudBins.map(b => b.x),
    y: fraudBins.map(b => b.y),
    name: 'Fraudulent Claims',
    type: 'bar',
    marker: { color: 'rgba(239, 68, 68, 0.6)', line: { color: '#ef4444', width: 1 } },
    hovertemplate: 'Score: %{x}<br>Count: %{y}<extra>Fraud</extra>'
  }
];

const predictionDistLayout = {
  title: { text: 'Prediction Distribution', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  barmode: 'group',
  xaxis: { title: { text: 'Fraud Score', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b' },
  yaxis: { title: { text: 'Count', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b' },
  legend: { font: { size: 10, color: '#94a3b8' }, bgcolor: 'transparent', orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
  margin: { t: 40, r: 20, l: 50, b: 60 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const fpr = [0, 0.001, 0.005, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const tpr = [0, 0.12, 0.35, 0.48, 0.62, 0.71, 0.78, 0.84, 0.88, 0.91, 0.93, 0.95, 0.96, 0.97, 0.975, 0.985, 0.99, 0.995, 0.998, 0.999, 1];
const aucVal = CANONICAL_MODEL.rocAuc;

const rocData = [
  {
    x: fpr,
    y: tpr,
    name: `ROC (AUC = ${aucVal})`,
    type: 'scatter',
    mode: 'lines',
    line: { color: '#818cf8', width: 2.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(129, 140, 248, 0.1)',
    hovertemplate: 'FPR: %{x:.3f}<br>TPR: %{y:.3f}<extra></extra>'
  },
  {
    x: [0, 1],
    y: [0, 1],
    name: 'Random',
    type: 'scatter',
    mode: 'lines',
    line: { color: '#475569', width: 1, dash: 'dash' },
    hoverinfo: 'skip'
  }
];

const rocLayout = {
  title: { text: 'ROC Curve', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  xaxis: { title: { text: 'False Positive Rate', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b', range: [0, 1] },
  yaxis: { title: { text: 'True Positive Rate', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b', range: [0, 1] },
  legend: { font: { size: 10, color: '#94a3b8' }, bgcolor: 'transparent', x: 0.6, y: 0.1 },
  margin: { t: 40, r: 20, l: 50, b: 50 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const recallVals = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1];
const precisionVals = [1, 0.98, 0.96, 0.94, 0.92, 0.90, 0.88, 0.85, 0.82, 0.78, 0.74, 0.68, 0.55, 0.17];
const prAuc = 0.8912;

const prData = [
  {
    x: recallVals,
    y: precisionVals,
    name: `PR (AUC = ${prAuc})`,
    type: 'scatter',
    mode: 'lines',
    line: { color: '#38bdf8', width: 2.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(56, 189, 248, 0.1)',
    hovertemplate: 'Recall: %{x:.2f}<br>Precision: %{y:.2f}<extra></extra>'
  }
];

const prLayout = {
  title: { text: 'Precision-Recall Curve', font: { size: 13, color: '#f8fafc' }, x: 0.5 },
  xaxis: { title: { text: 'Recall', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b', range: [0, 1] },
  yaxis: { title: { text: 'Precision', font: { size: 10, color: '#94a3b8' } }, tickfont: { size: 10, color: '#94a3b8' }, gridcolor: '#1e293b', range: [0, 1.05] },
  legend: { font: { size: 10, color: '#94a3b8' }, bgcolor: 'transparent', x: 0.6, y: 0.95 },
  margin: { t: 40, r: 20, l: 50, b: 50 },
  height: 280,
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent'
};

const retrainingStages = [
  { text: 'Initializing...', progress: 15 },
  { text: 'Loading dataset...', progress: 35 },
  { text: 'Training model...', progress: 70 },
  { text: 'Evaluating...', progress: 90 },
  { text: 'Complete!', progress: 100 }
];

const sortRun = (runs, key, dir) => {
  return [...runs].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'accuracy' || key === 'f1' || key === 'auc') {
      va = parseFloat(va.replace('%', ''));
      vb = parseFloat(vb.replace('%', ''));
    }
    if (key === 'runId') {
      va = parseInt(va.replace('TRN-', ''));
      vb = parseInt(vb.replace('TRN-', ''));
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
};

function MetricCard({ label, value, change, up, icon: Icon, color }) {
  return (
    <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4 hover:border-[#334155] transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-xs text-[#94a3b8]">{label}</span>
        </div>
        {change && (
          <div className={`flex items-center gap-0.5 text-xs ${up ? 'text-emerald-400' : 'text-red-400'}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-[#f8fafc]" style={{ color }}>{value}</div>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4 hover:border-[#334155] transition-all duration-300">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} style={{ color }} />
        <span className="text-xs text-[#94a3b8]">{label}</span>
      </div>
      <div className="text-lg font-semibold text-[#f8fafc]">{value}</div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#4f46e5]' : 'bg-[#334155]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function ModelManagement() {
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('runId');
  const [sortDir, setSortDir] = useState('desc');
  const [retraining, setRetraining] = useState(false);
  const [retrainStage, setRetrainStage] = useState(0);
  const [retrainProgress, setRetrainProgress] = useState(0);
  const [retrainComplete, setRetrainComplete] = useState(false);
  const [threshold, setThreshold] = useState(0.75);
  const [autoRetrain, setAutoRetrain] = useState(true);
  const [alertOnDegradation, setAlertOnDegradation] = useState(true);
  const [modelExplainability, setModelExplainability] = useState(true);
  const [shadowMode, setShadowMode] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const handleSort = useCallback((key) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const sortedRuns = useMemo(() => sortRun(trainingRuns, sortKey, sortDir), [sortKey, sortDir]);

  const startRetraining = useCallback(() => {
    setRetraining(true);
    setRetrainComplete(false);
    setRetrainStage(0);
    setRetrainProgress(0);

    let stageIdx = 0;
    const advanceStage = () => {
      if (stageIdx < retrainingStages.length) {
        setRetrainStage(stageIdx);
        setRetrainProgress(retrainingStages[stageIdx].progress);
        stageIdx++;
        if (stageIdx < retrainingStages.length) {
          setTimeout(advanceStage, 600 + Math.random() * 400);
        } else {
          setTimeout(() => {
            setRetraining(false);
            setRetrainComplete(true);
          }, 500);
        }
      }
    };
    setTimeout(advanceStage, 300);
  }, []);

  const sortIndicator = (key) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const tableColumns = [
    { key: 'runId', label: 'Run ID' },
    { key: 'date', label: 'Date' },
    { key: 'dataset', label: 'Dataset' },
    { key: 'duration', label: 'Duration' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'f1', label: 'F1 Score' },
    { key: 'auc', label: 'AUC' },
    { key: 'status', label: 'Status' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#4f46e5]/20 rounded-xl">
          <BrainCircuit size={28} className="text-[#818cf8]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#f8fafc]">AI Model Management</h1>
          <p className="text-sm text-[#94a3b8]">Real-time Model Performance Monitoring &amp; Retraining Pipeline</p>
        </div>
      </div>

      {/* Model Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modelVersions.map((model) => {
          const Icon = model.icon;
          const statusColor = model.status === 'active' ? 'success' : model.status === 'standby' ? 'warning' : 'default';
          return (
            <div
              key={model.version}
              className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-5 hover:border-[#334155] transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={18} style={{ color: model.color }} />
                  <span className="font-semibold text-[#f8fafc]">{model.name}</span>
                </div>
                <StatusBadge status={statusColor} />
              </div>
              <div className="text-xs text-[#94a3b8] mb-3">Version: {model.version}</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#94a3b8]">Accuracy</div>
                  <div className="text-lg font-bold" style={{ color: model.color }}>{model.accuracy}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#94a3b8]">Last Trained</div>
                  <div className="text-sm text-[#f8fafc]">{model.lastTrained}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {performanceMetrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {additionalInfo.map((item) => (
          <InfoCard key={item.label} {...item} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={confusionMatrixData} layout={confusionMatrixLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={featureImportanceData} layout={featureImportanceLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={accuracyHistoryData} layout={accuracyHistoryLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={predictionDistData} layout={predictionDistLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={rocData} layout={rocLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
        <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-4">
          <PlotlyChart data={prData} layout={prLayout} config={{ displayModeBar: false, responsive: true }} />
        </div>
      </div>

      {/* Training History Table */}
      <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-[#f8fafc] mb-4">Training History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {tableColumns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left py-3 px-3 text-xs text-[#94a3b8] font-medium cursor-pointer hover:text-[#f8fafc] transition-colors select-none"
                  >
                    {col.label}
                    <span className="text-[#818cf8]">{sortIndicator(col.key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((run) => (
                <tr key={run.runId} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                  <td className="py-3 px-3 text-[#818cf8] font-mono text-xs">{run.runId}</td>
                  <td className="py-3 px-3 text-[#f8fafc]">{run.date}</td>
                  <td className="py-3 px-3 text-[#94a3b8]">{run.dataset}</td>
                  <td className="py-3 px-3 text-[#f8fafc]">{run.duration}</td>
                  <td className="py-3 px-3 text-[#34d399] font-medium">{run.accuracy}</td>
                  <td className="py-3 px-3 text-[#f8fafc]">{run.f1}</td>
                  <td className="py-3 px-3 text-[#f8fafc]">{run.auc}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle2 size={12} />
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retraining Section */}
      <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#f8fafc]">Model Retraining</h2>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${retraining ? 'bg-amber-400 animate-pulse' : retrainComplete ? 'bg-emerald-400' : 'bg-emerald-400'}`} />
              <span className="text-xs text-[#94a3b8]">
                {retraining ? 'In Progress' : retrainComplete ? 'Complete' : 'Idle'}
              </span>
            </div>
          </div>
          {!retraining && (
            <button
              onClick={startRetraining}
              className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] hover:bg-[#5b53e8] text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw size={14} />
              Start Retraining
            </button>
          )}
        </div>

        {retraining && (
          <div className="space-y-3">
            <div className="text-sm text-[#94a3b8]">
              {retrainingStages[retrainStage]?.text || 'Starting...'}
            </div>
            <div className="w-full bg-[#1e293b] rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-[#4f46e5] to-[#818cf8] h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${retrainProgress}%` }}
              />
            </div>
            <div className="text-xs text-[#94a3b8] text-right">{retrainProgress}%</div>
          </div>
        )}

        {retrainComplete && !retraining && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <div>
              <div className="text-sm font-medium text-emerald-400">Retraining Complete</div>
              <div className="text-xs text-[#94a3b8]">Duration: 4h 32m | Accuracy achieved: {(CANONICAL_MODEL.accuracy * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Learning Rate</label>
            <div className="text-sm text-[#f8fafc] bg-[#1e293b] rounded-lg px-3 py-2">0.001</div>
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Batch Size</label>
            <div className="text-sm text-[#f8fafc] bg-[#1e293b] rounded-lg px-3 py-2">64</div>
          </div>
          <div>
            <label className="text-xs text-[#94a3b8] block mb-1">Max Epochs</label>
            <div className="text-sm text-[#f8fafc] bg-[#1e293b] rounded-lg px-3 py-2">100</div>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-[#0f172a]/80 border border-[#1e293b]/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={18} className="text-[#818cf8]" />
          <h2 className="text-base font-semibold text-[#f8fafc]">Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Fraud Detection Threshold */}
          <div className="space-y-2">
            <label className="text-sm text-[#f8fafc] font-medium">Fraud Detection Threshold</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-[#1e293b] rounded-full appearance-none cursor-pointer accent-[#4f46e5]"
              />
              <span className="text-sm text-[#818cf8] font-mono w-12 text-right">{threshold.toFixed(2)}</span>
            </div>
          </div>

          {/* Data Drift Threshold */}
          <div className="space-y-2">
            <label className="text-sm text-[#f8fafc] font-medium">Data Drift Threshold</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#1e293b] rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-amber-400">Warning: 15%</span>
                <span className="text-xs text-red-400">Critical: 25%</span>
              </div>
            </div>
          </div>

          {/* Auto-Retraining */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#f8fafc] font-medium">Auto-Retraining</label>
              <ToggleSwitch checked={autoRetrain} onChange={() => setAutoRetrain(!autoRetrain)} />
            </div>
            <div className="text-xs text-[#94a3b8]">Schedule: Every 14 days</div>
          </div>

          {/* Alert on Degradation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#f8fafc] font-medium">Alert on Degradation</label>
              <ToggleSwitch checked={alertOnDegradation} onChange={() => setAlertOnDegradation(!alertOnDegradation)} />
            </div>
            <div className="text-xs text-[#94a3b8]">Notify when metrics drop below threshold</div>
          </div>

          {/* Model Explainability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#f8fafc] font-medium">Model Explainability</label>
              <ToggleSwitch checked={modelExplainability} onChange={() => setModelExplainability(!modelExplainability)} />
            </div>
            <div className="text-xs text-[#94a3b8]">Enable SHAP-based explanations</div>
          </div>

          {/* Shadow Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#f8fafc] font-medium">Shadow Mode</label>
              <ToggleSwitch checked={shadowMode} onChange={() => setShadowMode(!shadowMode)} />
            </div>
            <div className="text-xs text-[#94a3b8]">Run without affecting production</div>
          </div>
        </div>
      </div>
    </div>
  );
}
