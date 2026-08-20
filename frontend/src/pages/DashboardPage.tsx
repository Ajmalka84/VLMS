import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Truck,
  FileSpreadsheet,
  Zap,
  Users,
  Building2,
  CheckCircle2,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { HealthData } from '../api/health';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface LayoutContext {
  health: HealthData | null;
  loading: boolean;
  refreshHealth: () => Promise<void>;
}

export const DashboardPage: React.FC = () => {
  const { health } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const { language } = useLanguage();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDbUp = health?.database?.status === 'up';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 p-6 sm:p-8 border border-amber-500/20 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            {isSuperAdmin ? 'Super Admin Console' : (language === 'ml' ? 'ക്വാറി വർക്ക്‌സ്‌പേസ്' : 'Quarry Operations')}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isSuperAdmin
              ? 'VLMS SaaS Operations Console'
              : user?.businessName || 'Vehicle Load Management System'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {isSuperAdmin
              ? 'Onboard customer businesses, manage access status, reset credentials, and oversee platform tenants.'
              : (language === 'ml'
                  ? 'വാഹന ലോഡുകൾ കൃത്യമായി രേഖപ്പെടുത്തുക, കോൺട്രാക്ടർ സെറ്റിൽമെന്റുകൾ തയ്യാറാക്കുക, ബില്ലുകൾ PDF ആയി ഡൗൺലോഡ് ചെയ്യുക.'
                  : 'Fast on-site dispatch recording, automated rate calculation, contractor settlement tracking, and instant PDF statement exports.')}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/loads"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              {language === 'ml' ? 'ലോഡ് രേഖപ്പെടുത്തുക' : 'Open Dispatch Cockpit'}
            </Link>

            <Link
              to="/reports"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-sm shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              {language === 'ml' ? 'സെറ്റിൽമെന്റ് റിപ്പോർട്ടുകൾ' : 'Settlement Reports'}
            </Link>
          </div>
        </div>
      </div>

      {/* Super Admin Management Cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="highlight" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Customer Quarry Accounts</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Onboard new quarry businesses, activate or suspend tenant workspaces, and reset customer credentials.
                </p>
              </div>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              Manage Customers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card variant="highlight" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Global Categories & Specifications</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Configure standard vehicle categories (Dumper, Tipper, Multi-Axle) and material types across all tenants.
                </p>
              </div>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Configure Master Data <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      )}

      {/* Primary Operational Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Module 1: Dispatch Cockpit */}
        <Card variant="glass" className="p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {language === 'ml' ? 'ലോഡ് ഡിസ്പാച്ച് കോക്ക്പിറ്റ്' : 'Dispatch & Load Entry'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'ml'
                ? 'വാഹനം, മെറ്റീരിയൽ, കോൺട്രാക്ടർ എന്നിവ തിരഞ്ഞെടുത്ത് ഓട്ടോമാറ്റിക് റേറ്റിൽ വേഗത്തിൽ ലോഡുകൾ രേഖപ്പെടുത്തുക.'
                : 'Rapid on-site vehicle load logging with automated rate calculation, quick truck presets, and instant receipts.'}
            </p>
          </div>
          <Link
            to="/loads"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {language === 'ml' ? 'ലോഡ് രേഖപ്പെടുത്തുക' : 'Open Dispatch Cockpit'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Module 2: Settlement Reports */}
        <Card variant="glass" className="p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {language === 'ml' ? 'സെറ്റിൽമെന്റ് റിപ്പോർട്ടുകൾ & PDF' : 'Settlement Reports & PDF'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'ml'
                ? 'കോൺട്രാക്ടർ തിരിച്ചുള്ള തുകകൾ, മെറ്റീരിയൽ കണക്കുകൾ, പ്രൊഫഷണൽ PDF ബില്ലുകൾ എന്നിവ എക്സ്പോർട്ട് ചെയ്യുക.'
                : 'Aggregated contractor ledgers, material volume distributions, and print-ready PDF statements with signature blocks.'}
            </p>
          </div>
          <Link
            to="/reports"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {language === 'ml' ? 'റിപ്പോർട്ടുകൾ കാണുക' : 'View Settlement Reports'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>

        {/* Module 3: Master Data */}
        <Card variant="glass" className="p-5 flex flex-col justify-between gap-4 hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {language === 'ml' ? 'മാസ്റ്റർ ഡാറ്റ & റേറ്റുകൾ' : 'Master Fleet & Rate Matrix'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'ml'
                ? 'ക്വാറി സൈറ്റുകൾ, വാഹനങ്ങൾ, കോൺട്രാക്ടർമാർ, ഫിക്സഡ് നിരക്കുകൾ എന്നിവ കോൺഫിഗർ ചെയ്യുക.'
                : 'Manage operational quarry sites, registered fleet vehicles, transport contractors, and multi-tier rate matrices.'}
            </p>
          </div>
          <Link
            to="/settings"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-indigo-500 hover:text-white text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            {language === 'ml' ? 'മാസ്റ്റർ ഡാറ്റ മാറ്റുക' : 'Manage Master Data'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* System Status Footer */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 ${isDbUp ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>
            {isDbUp ? 'VLMS Platform Operational' : 'Connecting to Server...'}
          </span>
        </div>
        <span className="text-slate-500 font-mono text-[11px]">
          v1.0 • Multi-Tenant Quarry Management
        </span>
      </div>
    </div>
  );
};
