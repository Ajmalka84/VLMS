import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CustomersPage } from './pages/admin/CustomersPage';

export function App() {
  return (
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
          <Route
            path="loads"
            element={
              <PlaceholderPage
                title="Load Management"
                hurdleNumber={8}
                description="Rapid vehicle load entry, auto-rate resolution, and load history management."
              />
            }
          />
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
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Master Data Configuration"
                hurdleNumber={7}
                description="Manage Sites, Vehicles, Contractors, Material Types, and Rate matrices."
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
