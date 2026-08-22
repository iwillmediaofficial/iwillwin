import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';

// Public Page (eager loaded for instant first-paint on mobile)
import { CampaignPage } from '@/pages/public/CampaignPage';

// Admin Pages (lazy loaded to keep public bundle ultra-lightweight)
const AdminLayout = lazy(() =>
  import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminLogin = lazy(() =>
  import('@/pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin }))
);
const DashboardPage = lazy(() =>
  import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CampaignsPage = lazy(() =>
  import('@/pages/admin/CampaignsPage').then((m) => ({ default: m.CampaignsPage }))
);
const PrizesPage = lazy(() =>
  import('@/pages/admin/PrizesPage').then((m) => ({ default: m.PrizesPage }))
);
const LeadsPage = lazy(() =>
  import('@/pages/admin/LeadsPage').then((m) => ({ default: m.LeadsPage }))
);
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const AdminLoadingFallback = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center">
    <div className="flex items-center space-x-3 text-amber-400 font-semibold animate-pulse">
      <Sparkles className="w-6 h-6 animate-spin-slow" />
      <span>Loading Admin Suite...</span>
    </div>
  </div>
);

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Campaign Experience */}
          <Route path="/" element={<CampaignPage />} />
          <Route path="/c/:slug" element={<CampaignPage />} />

          {/* Admin Authentication */}
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />

          {/* Protected Admin Console */}
          <Route
            path="/admin"
            element={
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminLayout />
              </Suspense>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="prizes" element={<PrizesPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
