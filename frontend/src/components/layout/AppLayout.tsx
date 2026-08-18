import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Truck,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Database,
  RefreshCw,
  HardHat,
} from 'lucide-react';
import { fetchHealth, HealthData } from '../../api/health';
import { StatusBadge } from '../common/StatusBadge';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const data = await fetchHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 0,
        database: { status: 'down' },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkStatus();
    const interval = setInterval(() => {
      void checkStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/loads', label: 'Loads', icon: Truck },
    { to: '/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Master Data', icon: Settings },
  ];

  const isDbUp = health?.database?.status === 'up';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <HardHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-slate-100 bg-clip-text text-transparent">
                  VLMS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  V1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Vehicle Load Management System
              </p>
            </div>
          </div>

          {/* Header Actions & Health Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="hidden xs:flex items-center gap-2">
              <StatusBadge
                status={loading && !health ? 'loading' : isDbUp ? 'up' : 'down'}
                label={
                  loading && !health
                    ? 'Connecting...'
                    : isDbUp
                    ? `Live (${health?.database.latencyMs ?? 0}ms)`
                    : 'Offline'
                }
                size="sm"
              />
            </div>
            <button
              id="refresh-health-btn"
              onClick={() => void checkStatus()}
              disabled={loading}
              title="Refresh connection status"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 text-slate-300 hover:text-amber-400 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8">
        <Outlet context={{ health, loading, refreshHealth: checkStatus }} />
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed for Mobile-First Experience) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 px-3 py-2">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] font-medium transition-all ${
                    isActive
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
