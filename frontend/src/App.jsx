import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import RouteLoader from './components/RouteLoader';
import Login from './pages/Login';
import LoadingScreen from './components/LoadingScreen';

import ProviderDashboard from './pages/provider/ProviderDashboard';
import SubmitClaim from './pages/provider/SubmitClaim';
import TrackClaims from './pages/provider/TrackClaims';

import InsuranceDashboard from './pages/insurance/InsuranceDashboard';
import ProviderManagement from './pages/insurance/ProviderManagement';
import PatientManagement from './pages/insurance/PatientManagement';
import ReviewClaims from './pages/insurance/ReviewClaims';
import FlaggedClaims from './pages/insurance/FlaggedClaims';
import LabeledData from './pages/insurance/LabeledData';
import CopayManagement from './pages/insurance/CopayManagement';
import ModelManagement from './pages/insurance/ModelManagement';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <>
      <RouteLoader />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Login />} />

        <Route element={<Layout role="provider" />}>
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/provider/submit" element={<SubmitClaim />} />
          <Route path="/provider/claims" element={<TrackClaims />} />
        </Route>

        <Route element={<Layout role="insurance" />}>
          <Route path="/insurance/dashboard" element={<InsuranceDashboard />} />
          <Route path="/insurance/providers" element={<ProviderManagement />} />
          <Route path="/insurance/patients" element={<PatientManagement />} />
          <Route path="/insurance/review" element={<ReviewClaims />} />
          <Route path="/insurance/flagged" element={<FlaggedClaims />} />
          <Route path="/insurance/labeled" element={<LabeledData />} />
          <Route path="/insurance/copay" element={<CopayManagement />} />
          <Route path="/insurance/model" element={<ModelManagement />} />
        </Route>

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