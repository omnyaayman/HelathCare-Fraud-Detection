
import { useState, useEffect } from "react";
import {
  Line,
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Users,
  Building2,
  TrendingUp,
  ShieldCheck,
  TrendingDown,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import api from "../../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const statusColors = {
  Submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "AI Scored": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Under Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Fraud Confirmed": "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  Investigated: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend > 0 ? (
            <TrendingUp size={16} className="text-emerald-500" />
          ) : (
            <TrendingDown size={16} className="text-red-500" />
          )}
          <span className={trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {Math.abs(trend)}% {trendValue}
          </span>
        </div>
      )}
    </div>
  );
};

export default function InsuranceDashboard() {
  const [stats, setStats] = useState(null);
  const [claimsOverTime, setClaimsOverTime] = useState([]);
  const [fraudByProvider, setFraudByProvider] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          claimsTimeRes,
          fraudProviderRes,
          statusDistRes,
          claimsRes,
        ] = await Promise.all([
          api.getStats(),
          api.getClaimsOverTime(),
          api.getFraudByProvider(),
          api.getClaimStatusDistribution(),
          api.getClaims(),
        ]);
        setStats(statsRes);
        setClaimsOverTime(claimsTimeRes);
        setFraudByProvider(fraudProviderRes);
        setStatusDistribution(statusDistRes);
        setRecentClaims((claimsRes.data || claimsRes).slice(0, 5));
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const claimsTimeChartData = {
    labels: claimsOverTime.map((d) => d.date),
    datasets: [
      {
        label: "Total Claims",
        data: claimsOverTime.map((d) => d.total_claims),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
      {
        label: "Fraud Claims",
        data: claimsOverTime.map((d) => d.fraud_claims),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const fraudProviderChartData = {
    labels: fraudByProvider.map((d) => d.provider_name),
    datasets: [
      {
        label: "Fraud Claims",
        data: fraudByProvider.map((d) => d.fraud_claims),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "#ef4444",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const statusDoughnutData = {
    labels: statusDistribution.map((d) => d.status),
    datasets: [
      {
        data: statusDistribution.map((d) => d.count),
        backgroundColor: [
          "#3b82f6",
          "#8b5cf6",
          "#eab308",
          "#22c55e",
          "#ef4444",
          "#f97316",
          "#64748b",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#64748b",
          font: { size: 12, weight: "500" },
          padding: 20,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(226, 232, 240, 0.5)", display: true },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(226, 232, 240, 0.5)" },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#64748b",
          font: { size: 12, weight: "500" },
          padding: 15,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Insurance Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time fraud analytics and claims management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Search size={16} />
            Search
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Filter size={16} />
            Filter
          </button>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={16} />
            Live System
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Claims"
          value={stats?.total_claims?.toLocaleString() || "0"}
          subtitle="All submitted claims"
          icon={Activity}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          trend={8}
          trendValue="from last month"
        />
        <KpiCard
          title="Pending Review"
          value={stats?.pending_review?.toLocaleString() || "0"}
          subtitle="Awaiting investigation"
          icon={Clock}
          color="bg-gradient-to-br from-yellow-500 to-orange-500"
          trend={-12}
          trendValue="from last month"
        />
        <KpiCard
          title="Fraud Rate"
          value={`${stats?.fraud_rate?.toFixed(1) || "0"}%`}
          subtitle={`${stats?.total_fraud?.toLocaleString() || "0"} confirmed fraud`}
          icon={AlertTriangle}
          color="bg-gradient-to-br from-red-500 to-rose-600"
          trend={2}
          trendValue="from last month"
        />
        <KpiCard
          title="Money Saved"
          value={`$${stats?.money_saved?.toLocaleString() || "0"}`}
          subtitle="Fraudulent claims rejected"
          icon={DollarSign}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
          trend={15}
          trendValue="from last month"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Claims Trend (Last 30 Days)
            </h3>
            <p className="text-xs text-slate-500">
              Total claims vs confirmed fraud
            </p>
          </div>
          <div className="p-5">
            <Line data={claimsTimeChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Claim Status
            </h3>
          </div>
          <div className="p-5">
            <Doughnut data={statusDoughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Top Providers by Fraud Claims
            </h3>
          </div>
          <div className="p-5">
            <Bar data={fraudProviderChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Claims
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Claim ID
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Patient
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentClaims.map((claim) => (
                  <tr
                    key={claim.claim_id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono text-sm text-slate-500">
                      #{claim.claim_id}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {claim.patient_name}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      ${claim.claim_amount?.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColors[claim.status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Total Patients
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.total_patients?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Total Providers
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats?.total_providers?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Monthly Premium
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${stats?.total_premium?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

