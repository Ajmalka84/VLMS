import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { MasterCacheProvider } from './context/MasterCacheContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common';

// Lazy Loaded Route Pages for Optimal Bundle Size (<75 KB initial shell)
const LoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LoadsPage = React.lazy(() => import('./pages/LoadsPage').then((m) => ({ default: m.LoadsPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const ShiftDrawerPage = React.lazy(() => import('./pages/ShiftDrawerPage').then((m) => ({ default: m.ShiftDrawerPage })));
const MasterDataPage = React.lazy(() => import('./pages/MasterDataPage').then((m) => ({ default: m.MasterDataPage })));
const CustomersPage = React.lazy(() => import('./pages/admin/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

/**
 * Route Loading Fallback Skeleton
 */
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 animate-ping absolute" />
      <div className="w-12 h-12 rounded-2xl bg-surface-solid border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20 relative z-10">
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
  if (user?.role === 'SITE_BOY') {
    return <Navigate to="/loads" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <MasterCacheProvider>
              <ErrorBoundary>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Routes>
                    {/* Public Login Route */}
                    <Route path="/login" element={<LoginPage />} />

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
                      <Route
                        path="dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'CO_PARTNER', 'SUPER_ADMIN']}>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="loads"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN']}>
                            <LoadsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="expenses"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'SITE_BOY', 'SUPER_ADMIN']}>
                            <ExpensesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="shift-drawer"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'SITE_BOY', 'SUPER_ADMIN']}>
                            <ShiftDrawerPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="reports"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'CO_PARTNER', 'SITE_BOY', 'SUPER_ADMIN']}>
                            <ReportsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <ProtectedRoute allowedRoles={['OWNER', 'SITE_BOY']}>
                            <MasterDataPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </MasterCacheProvider>
          </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  </ThemeProvider>
  );
}
