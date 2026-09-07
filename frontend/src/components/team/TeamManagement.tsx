import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  MapPin,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { Card } from '../common/Card';
import { ConfirmModal } from '../common/ConfirmModal';
import { CustomSelect } from '../common/CustomSelect';
import { useMasterCache } from '../../context/MasterCacheContext';
import {
  CoPartner,
  SiteBoy,
  SubAccountsBundle,
  getSubAccountsApi,
  createCoPartnerApi,
  updateCoPartnerApi,
  createSiteBoyApi,
  updateSiteBoyApi,
  deleteSubAccountApi,
} from '../../api/subAccounts';

export const TeamManagement: React.FC = () => {
  const cache = useMasterCache();
  const activeSites = (cache.sites || []).filter((s) => s.isActive);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [data, setData] = useState<SubAccountsBundle>({
    coPartners: [],
    siteBoys: [],
    quotas: {
      coPartner: { active: 0, max: 3 },
      siteBoy: { active: 0, max: 2 },
    },
  });

  // Modal States
  const [coPartnerModalOpen, setCoPartnerModalOpen] = useState(false);
  const [editingCoPartner, setEditingCoPartner] = useState<CoPartner | null>(null);
  const [cpName, setCpName] = useState('');
  const [cpMobile, setCpMobile] = useState('');
  const [cpPassword, setCpPassword] = useState('');
  const [cpSiteShares, setCpSiteShares] = useState<
    { siteId: string; sharePercentage: number; effectiveFrom: string; isActive: boolean }[]
  >([]);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);

  const [siteBoyModalOpen, setSiteBoyModalOpen] = useState(false);
  const [editingSiteBoy, setEditingSiteBoy] = useState<SiteBoy | null>(null);
  const [sbName, setSbName] = useState('');
  const [sbMobile, setSbMobile] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [sbSiteId, setSbSiteId] = useState('');
  const [sbSubmitting, setSbSubmitting] = useState(false);
  const [sbError, setSbError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSubAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSubAccountsApi();
      setData({
        coPartners: res?.coPartners || [],
        siteBoys: res?.siteBoys || [],
        quotas: {
          coPartner: res?.quotas?.coPartner || { active: 0, max: 3 },
          siteBoy: res?.quotas?.siteBoy || { active: 0, max: 2 },
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubAccounts();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const cpQuota = data?.quotas?.coPartner || { active: 0, max: 3 };
  const sbQuota = data?.quotas?.siteBoy || { active: 0, max: 2 };

  // Co-Partner Form Handlers
  const openCreateCoPartner = () => {
    setEditingCoPartner(null);
    setCpName('');
    setCpMobile('');
    setCpPassword('');
    const today = new Date().toISOString().split('T')[0];
    setCpSiteShares(
      activeSites.map((site) => ({
        siteId: site.id,
        sharePercentage: 0,
        effectiveFrom: today,
        isActive: false,
      }))
    );
    setCpError(null);
    setCoPartnerModalOpen(true);
  };

  const openEditCoPartner = (partner: CoPartner) => {
    setEditingCoPartner(partner);
    setCpName(partner.name || '');
    setCpMobile(partner.mobile || '');
    setCpPassword('');
    const today = new Date().toISOString().split('T')[0];

    const currentSharesMap = new Map(
      (partner.partnerShares || [])
        .filter((ps) => ps.isActive && !ps.effectiveTo)
        .map((ps) => [ps.siteId, ps])
    );

    setCpSiteShares(
      activeSites.map((site) => {
        const existing = currentSharesMap.get(site.id);
        return {
          siteId: site.id,
          sharePercentage: existing ? Number(existing.sharePercentage) : 0,
          effectiveFrom: today,
          isActive: !!existing,
        };
      })
    );
    setCpError(null);
    setCoPartnerModalOpen(true);
  };

  const handleCoPartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError(null);

    const selectedShares = cpSiteShares.filter((s) => s.isActive && s.sharePercentage > 0);
    if (selectedShares.length === 0) {
      setCpError('Please assign at least one active quarry site with an equity share greater than 0%.');
      return;
    }

    try {
      setCpSubmitting(true);
      if (editingCoPartner) {
        await updateCoPartnerApi(editingCoPartner.id, {
          name: cpName.trim(),
          password: cpPassword.trim() || undefined,
          siteShares: cpSiteShares.map((s) => ({
            siteId: s.siteId,
            sharePercentage: s.sharePercentage,
            effectiveFrom: s.effectiveFrom,
            isActive: s.isActive,
          })),
        });
        showNotification(`Co-Partner "${cpName || cpMobile}" updated successfully`);
      } else {
        await createCoPartnerApi({
          name: cpName.trim(),
          mobile: cpMobile.trim(),
          password: cpPassword.trim(),
          siteShares: selectedShares.map((s) => ({
            siteId: s.siteId,
            sharePercentage: s.sharePercentage,
            effectiveFrom: s.effectiveFrom,
          })),
        });
        showNotification(`Co-Partner "${cpName || cpMobile}" onboarded successfully`);
      }
      setCoPartnerModalOpen(false);
      loadSubAccounts();
    } catch (err: any) {
      setCpError(err.message || 'Failed to save co-partner details');
    } finally {
      setCpSubmitting(false);
    }
  };

  // Site Boy Form Handlers
  const openCreateSiteBoy = () => {
    setEditingSiteBoy(null);
    setSbName('');
    setSbMobile('');
    setSbPassword('');
    setSbSiteId(activeSites[0]?.id || '');
    setSbError(null);
    setSiteBoyModalOpen(true);
  };

  const openEditSiteBoy = (sb: SiteBoy) => {
    setEditingSiteBoy(sb);
    setSbName(sb.name || '');
    setSbMobile(sb.mobile || '');
    setSbPassword('');
    setSbSiteId(sb.assignedSiteId || activeSites[0]?.id || '');
    setSbError(null);
    setSiteBoyModalOpen(true);
  };

  const handleSiteBoySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSbError(null);

    if (!sbSiteId) {
      setSbError('Please select an active quarry site for the site supervisor.');
      return;
    }

    try {
      setSbSubmitting(true);
      if (editingSiteBoy) {
        await updateSiteBoyApi(editingSiteBoy.id, {
          name: sbName.trim(),
          password: sbPassword.trim() || undefined,
          assignedSiteId: sbSiteId,
        });
        showNotification(`Site Supervisor "${sbName || sbMobile}" updated successfully`);
      } else {
        await createSiteBoyApi({
          name: sbName.trim(),
          mobile: sbMobile.trim(),
          password: sbPassword.trim(),
          assignedSiteId: sbSiteId,
        });
        showNotification(`Site Supervisor "${sbName || sbMobile}" onboarded successfully`);
      }
      setSiteBoyModalOpen(false);
      loadSubAccounts();
    } catch (err: any) {
      setSbError(err.message || 'Failed to save site supervisor');
    } finally {
      setSbSubmitting(false);
    }
  };

  const confirmDelete = (id: string, name: string, role: string) => {
    setDeletingUser({ id, name, role });
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      await deleteSubAccountApi(deletingUser.id);
      showNotification(`${deletingUser.name} deactivated successfully`);
      setDeleteModalOpen(false);
      setDeletingUser(null);
      loadSubAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm animate-fade-in shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm animate-fade-in shadow-lg shadow-rose-500/5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Quota Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Co-Partner Quota Card */}
        <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Co-Partner Quota</h3>
                <p className="text-xs text-slate-400">Multi-site equity partners with report access</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                cpQuota.active >= cpQuota.max
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {cpQuota.active} / {cpQuota.max} Active
            </span>
          </div>

          <div className="mt-4">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  cpQuota.active >= cpQuota.max
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                }`}
                style={{
                  width: `${Math.min(100, (cpQuota.active / (cpQuota.max || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">Plan limit: {cpQuota.max} Active Partners</span>
            {cpQuota.active >= cpQuota.max && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Quota reached (+₹2,000 / slot)
              </span>
            )}
          </div>
        </Card>

        {/* Site Boy Quota Card */}
        <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Site Supervisor Quota</h3>
                <p className="text-xs text-slate-400">Gate & weighbridge operators locked to 1 site</p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                sbQuota.active >= sbQuota.max
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {sbQuota.active} / {sbQuota.max} Active
            </span>
          </div>

          <div className="mt-4">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  sbQuota.active >= sbQuota.max
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-blue-500 to-blue-400'
                }`}
                style={{
                  width: `${Math.min(100, (sbQuota.active / (sbQuota.max || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-400">Plan limit: {sbQuota.max} Active Supervisors</span>
            {sbQuota.active >= sbQuota.max && (
              <span className="text-blue-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Quota reached (+₹2,000 / slot)
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Section 1: Co-Partners Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Co-Partners & Joint Venture Investors
            </h2>
            <p className="text-xs text-slate-400">
              Partners can access dashboard and financial reports for their assigned sites.
            </p>
          </div>
          <button
            onClick={openCreateCoPartner}
            disabled={cpQuota.active >= cpQuota.max}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              cpQuota.active >= cpQuota.max
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add Co-Partner
          </button>
        </div>

        <Card variant="glass" className="overflow-hidden border border-slate-800 bg-slate-900/60 p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading team members...</span>
            </div>
          ) : data.coPartners.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-300">No Co-Partners Added Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add your quarry business partners to grant them site-specific report access and dividend shares.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold">Partner</th>
                    <th className="p-4 font-semibold">Mobile (Login)</th>
                    <th className="p-4 font-semibold">Assigned Sites & Equity %</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.coPartners.map((partner) => {
                    const activeShares = (partner.partnerShares || []).filter(
                      (s) => s.isActive && !s.effectiveTo
                    );
                    const displayName = partner.name || partner.mobile || 'Unnamed Partner';
                    const avatarLetter = (partner.name || partner.mobile || 'P').charAt(0).toUpperCase();

                    return (
                      <tr key={partner.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-medium text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                              {avatarLetter}
                            </div>
                            <span className="font-bold text-white text-sm">{displayName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-xs">
                          {partner.mobile}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {activeShares.length > 0 ? (
                              activeShares.map((share) => (
                                <span
                                  key={share.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>{share.site?.siteName || 'Quarry Site'}</span>
                                  <span className="font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded text-[11px]">
                                    {Number(share.sharePercentage)}%
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-rose-400 italic font-medium">No Active Sites</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                              partner.isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            {partner.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditCoPartner(partner)}
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
                              title="Edit Shares & Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                confirmDelete(partner.id, displayName, 'Co-Partner')
                              }
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Section 2: Site Boys Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              Site Supervisors & Gate Boys
            </h2>
            <p className="text-xs text-slate-400">
              Supervisors can enter loads, expenses, and close shift registers strictly for their 1 assigned quarry site.
            </p>
          </div>
          <button
            onClick={openCreateSiteBoy}
            disabled={sbQuota.active >= sbQuota.max}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
              sbQuota.active >= sbQuota.max
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Add Site Boy
          </button>
        </div>

        <Card variant="glass" className="overflow-hidden border border-slate-800 bg-slate-900/60 p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>Loading supervisors...</span>
            </div>
          ) : data.siteBoys.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-300">No Site Supervisors Added Yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add gate boys to record trucks, manage daily cash drawers, and track machine hours on-site.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4 font-semibold">Supervisor</th>
                    <th className="p-4 font-semibold">Mobile (Login)</th>
                    <th className="p-4 font-semibold">Assigned Quarry Site</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.siteBoys.map((sb) => {
                    const displayName = sb.name || sb.mobile || 'Unnamed Supervisor';
                    const avatarLetter = (sb.name || sb.mobile || 'S').charAt(0).toUpperCase();

                    return (
                      <tr key={sb.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-medium text-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                              {avatarLetter}
                            </div>
                            <span className="font-bold text-white text-sm">{displayName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-xs">
                          {sb.mobile}
                        </td>
                        <td className="p-4">
                          {sb.assignedSite ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{sb.assignedSite.siteName}</span>
                              {sb.assignedSite.location && (
                                <span className="text-slate-400 text-[11px]">({sb.assignedSite.location})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-400 italic font-medium">No Assigned Site</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                              sb.isActive
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            {sb.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditSiteBoy(sb)}
                              className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 transition-colors"
                              title="Edit Assignment & Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                confirmDelete(sb.id, displayName, 'Site Boy')
                              }
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Co-Partner Modal */}
      {coPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {editingCoPartner ? 'Edit Co-Partner & Site Shares' : 'Onboard New Co-Partner'}
              </h3>
              <button
                onClick={() => setCoPartnerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCoPartnerSubmit} className="p-6 space-y-4 overflow-y-auto">
              {cpError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cpError}</span>
                </div>
              )}

              {activeSites.length === 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>No active quarry sites available. Please add at least 1 site in the Sites tab first.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Partner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shamsu"
                  value={cpName}
                  onChange={(e) => setCpName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number (Login) *
                  </label>
                  <input
                    type="tel"
                    required
                    disabled={!!editingCoPartner}
                    placeholder="10-digit mobile"
                    value={cpMobile}
                    onChange={(e) => setCpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password {editingCoPartner ? '(Optional)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingCoPartner}
                    placeholder={editingCoPartner ? 'Keep current password' : 'Min 6 characters'}
                    value={cpPassword}
                    onChange={(e) => setCpPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Site Assignment & Percentage Share Matrix */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Assigned Quarry Sites & Equity Share *
                  </label>
                  <span className="text-[11px] text-slate-400">Total ≤ 100% per site</span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {cpSiteShares.map((share, idx) => {
                    const siteObj = activeSites.find((s) => s.id === share.siteId);
                    return (
                      <div
                        key={share.siteId}
                        className={`p-3 rounded-2xl border transition-all ${
                          share.isActive
                            ? 'bg-slate-950/80 border-amber-500/30 ring-1 ring-amber-500/10'
                            : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={share.isActive}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCpSiteShares((prev) =>
                                  prev.map((s, i) =>
                                    i === idx
                                      ? {
                                          ...s,
                                          isActive: checked,
                                          sharePercentage: checked && s.sharePercentage === 0 ? 25 : s.sharePercentage,
                                        }
                                      : s
                                  )
                                );
                              }}
                              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 accent-amber-500"
                            />
                            <div>
                              <span className="font-bold text-white text-sm">
                                {siteObj?.siteName || 'Quarry Site'}
                              </span>
                              {siteObj?.location && (
                                <span className="text-slate-500 text-xs ml-1.5">({siteObj.location})</span>
                              )}
                            </div>
                          </label>

                          {share.isActive && (
                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 w-24">
                              <input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.01"
                                value={share.sharePercentage || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCpSiteShares((prev) =>
                                    prev.map((s, i) => (i === idx ? { ...s, sharePercentage: val } : s))
                                  );
                                }}
                                className="w-full bg-transparent text-right text-amber-400 font-bold text-sm focus:outline-none"
                              />
                              <span className="text-slate-500 text-xs ml-1 font-bold">%</span>
                            </div>
                          )}
                        </div>

                        {share.isActive && (
                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              Effective from:
                            </span>
                            <input
                              type="date"
                              value={share.effectiveFrom}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCpSiteShares((prev) =>
                                  prev.map((s, i) => (i === idx ? { ...s, effectiveFrom: val } : s))
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCoPartnerModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cpSubmitting || activeSites.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {cpSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingCoPartner ? 'Save Changes' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Boy Modal */}
      {siteBoyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                {editingSiteBoy ? 'Edit Site Supervisor' : 'Onboard Site Supervisor'}
              </h3>
              <button
                onClick={() => setSiteBoyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSiteBoySubmit} className="p-6 space-y-4 overflow-y-auto">
              {sbError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{sbError}</span>
                </div>
              )}

              {activeSites.length === 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>No active quarry sites available. Please add at least 1 site in the Sites tab first.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manu"
                  value={sbName}
                  onChange={(e) => setSbName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mobile Number (Login) *
                </label>
                <input
                  type="tel"
                  required
                  disabled={!!editingSiteBoy}
                  placeholder="10-digit mobile"
                  value={sbMobile}
                  onChange={(e) => setSbMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password {editingSiteBoy ? '(Optional)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingSiteBoy}
                  placeholder={editingSiteBoy ? 'Keep current password' : 'Min 6 characters'}
                  value={sbPassword}
                  onChange={(e) => setSbPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Quarry Site (Strictly Locked) *
                </label>
                <CustomSelect
                  value={sbSiteId}
                  onChange={setSbSiteId}
                  options={activeSites.map((s) => ({
                    value: s.id,
                    label: s.siteName,
                    subLabel: s.location || undefined,
                  }))}
                  placeholder="Select Quarry Site"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  Site supervisors can only record loads and expenses for their assigned quarry site.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSiteBoyModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sbSubmitting || activeSites.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {sbSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingSiteBoy ? 'Save Changes' : 'Create Supervisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title={`Deactivate ${deletingUser?.role || 'Account'}`}
        message={`Are you sure you want to deactivate "${deletingUser?.name}"? They will no longer be able to log in, but all past loads and audit history will remain intact.`}
        confirmText="Deactivate Account"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingUser(null);
        }}
      />
    </div>
  );
};
