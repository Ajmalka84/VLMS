import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
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
  );
}
