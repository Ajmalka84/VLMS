import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Truck,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  LogOut,
  Users,
  Layers,
} from 'lucide-react';
import { fetchHealth, HealthData } from '../../api/health';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Navigation Items: Dashboard only for Super Admin; Customer starts directly with Loads!
  const navItems = isSuperAdmin
    ? [
        { to: '/', label: t('dashboard'), icon: LayoutDashboard },
        { to: '/admin/users', label: t('customers'), icon: Users },
        { to: '/settings', label: t('global_master'), icon: Layers },
      ]
    : [
        { to: '/loads', label: t('loads'), icon: Truck },
        { to: '/reports', label: t('reports'), icon: FileSpreadsheet },
        { to: '/settings', label: t('master_data'), icon: Settings },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-3 py-2.5 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo & Client Name below */}
          <NavLink
            to={isSuperAdmin ? '/' : '/loads'}
            className="flex flex-col items-start cursor-pointer select-none group shrink-0 min-w-0"
          >
            <span className="font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
              VLMS
            </span>
            <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[260px] leading-tight mt-0.5 group-hover:text-slate-300 transition-colors">
              {user?.businessName || 'Quarry Management'}
            </span>
          </NavLink>

          {/* Desktop Navigation Menu */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/loads'}
                  id={`desktop-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none touch-manipulation active:scale-[0.98] ${
                      isActive
                        ? isSuperAdmin
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-extrabold'
                          : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 pointer-events-none" />
                  <span className="pointer-events-none">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Header Actions: Language Switcher & Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Language Switcher Pill */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer select-none touch-manipulation ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ml')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer select-none touch-manipulation ${
                  language === 'ml'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="മലയാളത്തിലേക്ക് മാറ്റുക"
              >
                മലയാളം
              </button>
            </div>

            {/* Logout Button */}
            <button
              id="logout-btn"
              type="button"
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer select-none touch-manipulation shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="hidden sm:inline pointer-events-none">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
        <Outlet context={{ health, loading, refreshHealth: checkStatus }} />
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed for Mobile-First Experience, Hidden on MD+) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 px-3 py-1.5 shadow-2xl">
        <div
          className="grid gap-1.5 max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/loads'}
                id={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all select-none touch-manipulation active:scale-95 cursor-pointer ${
                    isActive
                      ? isSuperAdmin
                        ? 'text-purple-400 bg-purple-500/15 font-extrabold shadow-sm'
                        : 'text-amber-400 bg-amber-500/15 font-extrabold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5 mb-0.5 shrink-0 pointer-events-none" />
                <span className="truncate max-w-full pointer-events-none">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
