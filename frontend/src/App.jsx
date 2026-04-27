import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import MonthlyBusinessPage from './pages/MonthlyBusinessPage';
import PlotStatusPage from './pages/PlotStatusPage';
import ProjectsPage from './pages/ProjectsPage';
import PayoutDetailPage from './pages/PayoutDetailPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminPayoutsPage from './pages/AdminPayoutsPage';
import TeamPayoutPage from './pages/TeamPayoutPage';
import AdminProjectsPage from './pages/AdminProjectsPage';
import ReferralTreePage from './pages/ReferralTreePage';
import DownlinePage from './pages/DownlinePage';
import ProfilePage from './pages/ProfilePage';
import WelcomeLetterPage from './pages/WelcomeLetterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminAssociatesPage from './pages/AdminAssociatesPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-page">
      <div className="spinner" />
      <span style={{ color: 'var(--ink3)', fontSize: '13px' }}>Loading...</span>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  return !user ? children : <Navigate to="/" replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index                   element={<DashboardPage />} />
        <Route path="customers"        element={<CustomersPage />} />
        <Route path="monthly-business" element={<MonthlyBusinessPage />} />
        <Route path="projects"         element={<ProjectsPage />} />
        <Route path="plot-status"      element={<PlotStatusPage />} />
        <Route path="payout-detail"    element={<PayoutDetailPage />} />
        <Route path="payments"         element={<PaymentsPage />} />
        <Route path="team-payout"      element={<TeamPayoutPage />} />
        <Route path="referral-tree"    element={<ReferralTreePage />} />
        <Route path="downline"         element={<DownlinePage />} />
        <Route path="profile"          element={<ProfilePage />} />
        <Route path="welcome-letter"   element={<WelcomeLetterPage />} />
        <Route path="change-password"  element={<ChangePasswordPage />} />
        <Route path="admin/associates" element={<AdminAssociatesPage />} />
        <Route path="admin/projects"   element={<AdminProjectsPage />} />
        <Route path="admin/payouts"    element={<AdminPayoutsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
