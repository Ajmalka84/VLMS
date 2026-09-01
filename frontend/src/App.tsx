import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { MasterCacheProvider } from './context/MasterCacheContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Lazy Loaded Route Pages for Optimal Bundle Size (<75 KB initial shell)
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LoadsPage = React.lazy(() => import('./pages/LoadsPage').then((m) => ({ default: m.LoadsPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const MasterDataPage = React.lazy(() => import('./pages/MasterDataPage').then((m) => ({ default: m.MasterDataPage })));
const CustomersPage = React.lazy(() => import('./pages/admin/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const PublicSlipPage = React.lazy(() => import('./pages/PublicSlipPage').then((m) => ({ default: m.PublicSlipPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * Route Loading Fallback Skeleton
 */
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 animate-ping absolute" />
      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20 relative z-10">
        <div className="w-4 h-4 rounded-full bg-amber-500 animate-pulse" />
      </div>
    </div>
    <div className="text-xs font-bold uppercase tracking-widest text-amber-400">Loading Module...</div>
  </div>
);

const RootIndex: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/users" replace />;
  }
  return <Navigate to="/loads" replace />;
};

export function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <MasterCacheProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Public Login Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Public Digital Gate Pass Route */}
                <Route path="/slip/:id" element={<PublicSlipPage />} />

                {/* Protected App Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<RootIndex />} />

                  {/* Super Admin Route */}
                  <Route
                    path="admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                        <CustomersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Operational Customer Routes */}
                  <Route path="loads" element={<LoadsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="settings" element={<MasterDataPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </MasterCacheProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
