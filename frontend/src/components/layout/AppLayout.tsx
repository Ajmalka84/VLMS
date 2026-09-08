import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Truck,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  LogOut,
  Users,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Wallet,
  Lock,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchHealth, HealthData } from '../../api/health';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Badge, Button } from '../common';

const SIDEBAR_STORAGE_KEY = 'vlms_sidebar_collapsed';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  // Desktop Collapsed Sidebar State (Persistent in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Mobile Slide-out Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Toggle Desktop Sidebar
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Close Mobile Drawer on Route Change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Periodic Health Check
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

  // Navigation Items tailored per role:
  let navItems: { to: string; label: string; icon: any }[] = [];

  if (isSuperAdmin) {
    navItems = [
      { to: '/admin/users', label: t('customers'), icon: Users },
      { to: '/reports', label: t('reports'), icon: FileSpreadsheet },
    ];
  } else if (user?.role === 'CO_PARTNER') {
    navItems = [
      { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
      { to: '/loads', label: t('loads'), icon: Truck },
      { to: '/reports', label: t('reports'), icon: FileSpreadsheet },
      { to: '/settings', label: t('masters'), icon: Settings },
    ];
  } else if (user?.role === 'SITE_BOY') {
    navItems = [
      { to: '/loads', label: t('loads'), icon: Truck },
      { to: '/expenses', label: t('expenses'), icon: DollarSign },
      { to: '/shift-drawer', label: t('drawer'), icon: Wallet },
      { to: '/reports', label: t('reports'), icon: FileSpreadsheet },
      { to: '/settings', label: t('masters'), icon: Settings },
    ];
  } else {
    // OWNER: 1. Dashboard, 2. Loads, 3. Expenses, 4. Drawer, 5. Reports, 6. Masters
    navItems = [
      { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
      { to: '/loads', label: t('loads'), icon: Truck },
      { to: '/expenses', label: t('expenses'), icon: DollarSign },
      { to: '/shift-drawer', label: t('drawer'), icon: Wallet },
      { to: '/reports', label: t('reports'), icon: FileSpreadsheet },
      { to: '/settings', label: t('masters'), icon: Settings },
    ];
  }

  // Active Role Badge
  const renderRoleBadge = () => {
    if (!user) return null;
    if (isSuperAdmin) {
      return (
        <Badge variant="purple" size="sm">
          Super Admin
        </Badge>
      );
    }
    if (user.role === 'CO_PARTNER') {
      const count = user.assignedSiteIds?.length || 0;
      return (
        <Badge
          variant="amber"
          size="sm"
          icon={<Building2 className="w-3.5 h-3.5 text-amber-400" />}
        >
          Partner ({count} {count === 1 ? 'Site' : 'Sites'})
        </Badge>
      );
    }
    if (user.role === 'SITE_BOY') {
      return (
        <Badge
          variant="blue"
          size="sm"
          icon={<Lock className="w-3.5 h-3.5 text-blue-400" />}
        >
          Gate Supervisor
        </Badge>
      );
    }
    return (
      <Badge variant="amber" size="sm">
        Quarry Owner
      </Badge>
    );
  };

  // Subscription Header Pill
  const renderSubscriptionHeaderPill = () => {
    if (isSuperAdmin || !user || user.role === 'SITE_BOY' || user.role === 'CO_PARTNER') return null;

    if (user.subscriptionPlan === 'TRIAL' || user.subscriptionStatus === 'TRIAL_ACTIVE') {
      const days = user.daysRemaining ?? 7;
      return (
        <Badge
          variant="cyan"
          size="sm"
          title={`7-Day Free Pilot Active (${days} days remaining)`}
          icon={<Clock className="w-3 h-3 text-cyan-400" />}
        >
          7-Day Trial ({days}d)
        </Badge>
      );
    }

    if (user.subscriptionStatus === 'EXPIRING_SOON') {
      const days = user.daysRemaining ?? 0;
      return (
        <Badge
          variant="amber"
          size="sm"
          dot
          dotPulse
          title={`Annual Package expiring in ${days} days`}
          icon={<AlertTriangle className="w-3 h-3 text-amber-400" />}
        >
          Expiring in {days}d
        </Badge>
      );
    }

    if (user.subscriptionStatus === 'IN_GRACE_PERIOD') {
      return (
        <Badge
          variant="rose"
          size="sm"
          dot
          dotPulse
          title="Subscription Grace Period Active"
          icon={<AlertTriangle className="w-3 h-3 text-rose-400" />}
        >
          Grace Period
        </Badge>
      );
    }

    if (user.subscriptionStatus === 'ACTIVE_PAID') {
      return (
        <Badge
          variant="emerald"
          size="sm"
          title={`Annual Package Active (${user.daysRemaining !== null ? `${user.daysRemaining} days left` : 'Lifetime'})`}
          icon={<CheckCircle2 className="w-3 h-3 text-emerald-400" />}
        >
          Annual Plan {user.daysRemaining !== null ? `(${user.daysRemaining}d)` : ''}
        </Badge>
      );
    }

    return null;
  };

  const defaultHome = isSuperAdmin
    ? '/admin/users'
    : user?.role === 'SITE_BOY'
    ? '/loads'
    : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 antialiased">
      {/* ========================================================================= */}
      {/*                              TOP NAVBAR                                   */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 h-16 glass-panel border-b border-slate-800/80 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Hamburger Toggle & Brand */}
        <div className="flex items-center gap-3 shrink-0 min-w-0">
          {/* Hamburger Menu Toggle Button (Desktop toggles Mini/Expanded, Mobile toggles Drawer) */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth >= 768) {
                toggleSidebar();
              } else {
                setIsMobileDrawerOpen((prev) => !prev);
              }
            }}
            aria-label="Toggle Navigation Sidebar"
            className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 touch-manipulation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Quarry Name */}
          <NavLink
            to={defaultHome}
            className="flex items-center gap-2.5 group cursor-pointer select-none shrink-0 min-w-0"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              V
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-black text-base sm:text-lg tracking-tight text-white leading-none">
                VLMS<span className="text-amber-400">.</span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[220px] leading-tight mt-0.5 group-hover:text-slate-300 transition-colors">
                {user?.businessName || 'Quarry Management'}
              </span>
            </div>
          </NavLink>
        </div>

        {/* Center/Right: Badges, Language & User Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Status & Subscription Pills (Hidden on very small screens) */}
          <div className="hidden sm:flex items-center gap-2">
            {renderRoleBadge()}
            {renderSubscriptionHeaderPill()}
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center p-0.5 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] sm:text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer select-none touch-manipulation ${
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
              className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer select-none touch-manipulation ${
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
          <Button
            id="logout-btn"
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Sign Out"
            leftIcon={<LogOut className="w-4 h-4 shrink-0 pointer-events-none" />}
            className="hover:border-rose-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 font-bold border border-slate-800 bg-slate-900"
          >
            <span className="hidden md:inline pointer-events-none">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/*                         BODY (SIDEBAR + MAIN CONTENT)                     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex relative">

        {/* ======================================================================= */}
        {/*        YOUTUBE-STYLE COLLAPSIBLE SIDEBAR (DESKTOP / TABLET)             */}
        {/* ======================================================================= */}
        <aside
          className={`hidden md:flex flex-col fixed top-16 bottom-0 left-0 z-30 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none ${
            isCollapsed ? 'w-[76px]' : 'w-60'
          }`}
        >
          {/* Nav Items Container */}
          <div className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin/users' || item.to === '/loads' || item.to === '/dashboard'}
                  id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative transition-all rounded-2xl cursor-pointer select-none touch-manipulation flex items-center ${
                      isCollapsed
                        ? 'flex-col justify-center py-3 px-1 text-center'
                        : 'flex-row gap-3.5 px-3.5 py-3'
                    } ${
                      isActive
                        ? isSuperAdmin
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 font-black'
                          : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-black'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`shrink-0 transition-transform ${
                          isCollapsed ? 'w-5 h-5 mb-1 group-hover:scale-110' : 'w-5 h-5'
                        } ${
                          isActive
                            ? isSuperAdmin
                              ? 'text-white'
                              : 'text-slate-950'
                            : 'text-slate-400 group-hover:text-amber-400'
                        }`}
                      />
                      <span
                        className={`truncate ${
                          isCollapsed
                            ? 'text-[10px] font-bold tracking-tight max-w-[64px] leading-tight block'
                            : 'text-xs sm:text-sm font-bold tracking-wide'
                        }`}
                      >
                        {item.label}
                      </span>

                      {/* Expanded Active Bar Indicator */}
                      {!isCollapsed && isActive && (
                        <div className="ml-auto w-1.5 h-4 rounded-full bg-slate-950/40" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Bottom Footer: Collapse Toggle Button & User Profile Chip */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-2">
            {!isCollapsed ? (
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</span>
                  {renderRoleBadge()}
                </div>
                <div className="font-extrabold text-white text-xs truncate">
                  {user?.businessName || user?.mobile}
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="w-full mt-2 py-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-[11px] font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Collapse Menu</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleSidebar}
                className="w-full p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 flex items-center justify-center transition cursor-pointer"
                title="Expand Menu"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>

        {/* ======================================================================= */}
        {/*                  MOBILE OFF-CANVAS SLIDE-OUT DRAWER                     */}
        {/* ======================================================================= */}
        {isMobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-[60] flex">
            {/* Backdrop Blur Overlay */}
            <div
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
            />

            {/* Slide-out Sidebar Menu */}
            <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl z-10 animate-slide-right">
              <div className="space-y-6">
                {/* Header in Drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-amber-500/20">
                      V
                    </div>
                    <div>
                      <span className="font-black text-lg text-white">VLMS</span>
                      <p className="text-[11px] text-slate-400">{user?.businessName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Drawer Navigation Links */}
                <div className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/admin/users' || item.to === '/loads' || item.to === '/dashboard'}
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                            isActive
                              ? isSuperAdmin
                                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-extrabold'
                                : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Bottom Details & Sign Out */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Role:</span>
                  {renderRoleBadge()}
                </div>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={logout}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/*                               MAIN CONTENT                              */}
        {/* ======================================================================= */}
        <main
          className={`flex-1 min-w-0 transition-all duration-300 ease-in-out p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 ${
            isCollapsed ? 'md:ml-[76px]' : 'md:ml-60'
          }`}
        >
          <Outlet context={{ health, loading, refreshHealth: checkStatus }} />
        </main>
      </div>

      {/* ========================================================================= */}
      {/*        MOBILE BOTTOM NAVIGATION BAR (FOR 1-TAP PHONE ACCESSIBILITY)       */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/90 px-2 py-1.5 shadow-2xl">
        <div
          className="grid gap-1 max-w-md mx-auto"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/users' || item.to === '/loads' || item.to === '/dashboard'}
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
                <span className="truncate max-w-full pointer-events-none text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
