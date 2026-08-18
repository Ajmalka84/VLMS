import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CustomersPage } from './pages/admin/CustomersPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { LoadsPage } from './pages/LoadsPage';

export function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
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
          <Route index element={<DashboardPage />} />

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
          <Route
            path="reports"
            element={
              <PlaceholderPage
                title="Settlement Reports"
                hurdleNumber={9}
                description="C/O contractor settlement aggregation, filterable date ranges, and PDF exports."
              />
            }
          />
          <Route path="settings" element={<MasterDataPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
    </ToastProvider>
    </LanguageProvider>
  );
}
