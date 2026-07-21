import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import RouteLoader from './components/RouteLoader';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';

// Pages Import
import ProviderDashboard from './pages/provider/ProviderDashboard';
import SubmitClaim from './pages/provider/SubmitClaim';
import TrackClaims from './pages/provider/TrackClaims';
import InsuranceDashboard from './pages/insurance/InsuranceDashboard';
import ExecutiveDashboard from './pages/insurance/ExecutiveDashboard';
import ProviderManagement from './pages/insurance/ProviderManagement';
import ProviderDetail from './pages/insurance/ProviderDetail';
import PatientManagement from './pages/insurance/PatientManagement';
import ReviewClaims from './pages/insurance/ReviewClaims';
import FlaggedClaims from './pages/insurance/FlaggedClaims';
import LabeledData from './pages/insurance/LabeledData';
import CopayManagement from './pages/insurance/CopayManagement';
import ModelManagement from './pages/insurance/ModelManagement';
import Analytics from './pages/insurance/Analytics';
import Reports from './pages/insurance/Reports';
import Policies from './pages/insurance/Policies';
import PolicyDetail from './pages/insurance/PolicyDetail';
import Settings from './pages/insurance/Settings';
import AuditLogs from './pages/insurance/AuditLogs';
import NotificationCenter from './pages/NotificationCenter';
import SystemMonitoring from './pages/insurance/SystemMonitoring';
import AIInsights from './pages/insurance/AIInsights';
import FraudHeatmap from './pages/insurance/FraudHeatmap';
import AlertCenter from './pages/insurance/AlertCenter';
import ClaimDetails from './pages/insurance/ClaimDetails';
// مكوّن حماية المسارات (Guard)
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <>
      <RouteLoader />
      <Routes>
        {/* توجيه المسار الرئيسي بناءً على حالة تسجيل الدخول */}
        <Route path="/" element={
          user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/login" replace />
        } />

        <Route path="/login" element={
          user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Login />
        } />

        {/* مسارات الـ Provider (محمية) */}
        <Route element={
          <ProtectedRoute allowedRole="provider">
            <Layout role="provider" />
          </ProtectedRoute>
        }>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/submit" element={<SubmitClaim />} />
          <Route path="/provider/claims" element={<TrackClaims />} />
        </Route>

        {/* مسارات الـ Insurance (محمية) */}
        <Route element={
          <ProtectedRoute allowedRole="insurance">
            <Layout role="insurance" />
          </ProtectedRoute>
        }>
          <Route path="/insurance/dashboard" element={<InsuranceDashboard />} />
          <Route path="/insurance/executive" element={<ExecutiveDashboard />} />
          <Route path="/insurance/providers" element={<ProviderManagement />} />
          <Route path="/insurance/providers/:providerId" element={<ProviderDetail />} />
          <Route path="/insurance/patients" element={<PatientManagement />} />
          <Route path="/insurance/policies" element={<Policies />} />
          <Route path="/insurance/policies/:policyId" element={<PolicyDetail />} />
          <Route path="/insurance/review" element={<ReviewClaims />} />
          <Route path="/insurance/flagged" element={<FlaggedClaims />} />
          <Route path="/insurance/reports" element={<Reports />} />
          <Route path="/insurance/analytics" element={<Analytics />} />
          <Route path="/insurance/ai-insights" element={<AIInsights />} />
          <Route path="/insurance/fraud-heatmap" element={<FraudHeatmap />} />
          <Route path="/insurance/labeled" element={<LabeledData />} />
          <Route path="/insurance/copay" element={<CopayManagement />} />
          <Route path="/insurance/model" element={<ModelManagement />} />
          <Route path="/insurance/audit-logs" element={<AuditLogs />} />
          <Route path="/insurance/notifications" element={<NotificationCenter />} />
          <Route path="/insurance/system-monitoring" element={<SystemMonitoring />} />
          <Route path="/insurance/settings" element={<Settings />} />
          <Route path="/insurance/alerts" element={<AlertCenter />} />
          <Route path="/insurance/claims/:claimId" element={<ClaimDetails />} />
        </Route>

        {/* أي مسار غير معروف يرجع للـ Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
