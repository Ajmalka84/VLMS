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
} from 'lucide-react';
import {
  Card,
  ConfirmModal,
  CustomSelect,
  Modal,
  Input,
  DateInput,
  Button,
  Badge,
  EmptyState,
  Checkbox,
} from '../common';
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
        <Card variant="glass" className="p-5 border border-subtle bg-surface">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-base">Co-Partner Quota</h3>
                <p className="text-xs text-muted">Multi-site equity partners with report access</p>
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
            <div className="w-full h-2.5 bg-surface-solid rounded-full overflow-hidden border border-subtle">
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
            <span className="text-muted">Plan limit: {cpQuota.max} Active Partners</span>
            {cpQuota.active >= cpQuota.max && (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Quota reached (+₹2,000 / slot)
              </span>
            )}
          </div>
        </Card>

        {/* Site Boy Quota Card */}
        <Card variant="glass" className="p-5 border border-subtle bg-surface">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-base">Site Supervisor Quota</h3>
                <p className="text-xs text-muted">Gate & weighbridge operators locked to 1 site</p>
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
            <div className="w-full h-2.5 bg-surface-solid rounded-full overflow-hidden border border-subtle">
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
            <span className="text-muted">Plan limit: {sbQuota.max} Active Supervisors</span>
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
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Co-Partners & Joint Venture Investors
            </h2>
            <p className="text-xs text-muted">
              Partners can access dashboard and financial reports for their assigned sites.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            disabled={cpQuota.active >= cpQuota.max}
            onClick={openCreateCoPartner}
          >
            Add Co-Partner
          </Button>
        </div>

        <Card variant="glass" className="overflow-hidden border border-subtle bg-surface p-0">
          {loading ? (
            <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading team members...</span>
            </div>
          ) : data.coPartners.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Users className="w-8 h-8 text-amber-400" />}
                title="No Co-Partners Added Yet"
                description="Add your quarry business partners to grant them site-specific report access and dividend shares."
                actionText={cpQuota.active < cpQuota.max ? "Add Co-Partner" : undefined}
                onAction={cpQuota.active < cpQuota.max ? openCreateCoPartner : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-solid text-secondary text-xs uppercase tracking-wider border-b border-subtle">
                  <tr>
                    <th className="p-4 font-semibold">Partner</th>
                    <th className="p-4 font-semibold">Mobile (Login)</th>
                    <th className="p-4 font-semibold">Assigned Sites & Equity %</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {data.coPartners.map((partner) => {
                    const activeShares = (partner.partnerShares || []).filter(
                      (s) => s.isActive && !s.effectiveTo
                    );
                    const displayName = partner.name || partner.mobile || 'Unnamed Partner';
                    const avatarLetter = (partner.name || partner.mobile || 'P').charAt(0).toUpperCase();

                    return (
                      <tr key={partner.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-4 font-medium text-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                              {avatarLetter}
                            </div>
                            <span className="font-bold text-primary text-sm">{displayName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-secondary font-mono text-xs">
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
                          <Badge variant={partner.isActive ? "emerald" : "slate"} size="sm">
                            {partner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditCoPartner(partner)}
                              className="p-1.5 text-muted hover:text-amber-400 min-h-[32px] min-w-[32px]"
                              title="Edit Shares & Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                confirmDelete(partner.id, displayName, 'Co-Partner')
                              }
                              className="p-1.5 text-muted hover:text-rose-400 min-h-[32px] min-w-[32px]"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              Site Supervisors & Gate Boys
            </h2>
            <p className="text-xs text-muted">
              Supervisors can enter loads, expenses, and close shift registers strictly for their 1 assigned quarry site.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<UserPlus className="w-4 h-4" />}
            disabled={sbQuota.active >= sbQuota.max}
            onClick={openCreateSiteBoy}
          >
            Add Site Boy
          </Button>
        </div>

        <Card variant="glass" className="overflow-hidden border border-subtle bg-surface p-0">
          {loading ? (
            <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>Loading supervisors...</span>
            </div>
          ) : data.siteBoys.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<UserCheck className="w-8 h-8 text-blue-400" />}
                title="No Site Supervisors Added Yet"
                description="Add gate boys to record trucks, manage daily cash drawers, and track machine hours on-site."
                actionText={sbQuota.active < sbQuota.max ? "Add Site Boy" : undefined}
                onAction={sbQuota.active < sbQuota.max ? openCreateSiteBoy : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-solid text-secondary text-xs uppercase tracking-wider border-b border-subtle">
                  <tr>
                    <th className="p-4 font-semibold">Supervisor</th>
                    <th className="p-4 font-semibold">Mobile (Login)</th>
                    <th className="p-4 font-semibold">Assigned Quarry Site</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {data.siteBoys.map((sb) => {
                    const displayName = sb.name || sb.mobile || 'Unnamed Supervisor';
                    const avatarLetter = (sb.name || sb.mobile || 'S').charAt(0).toUpperCase();

                    return (
                      <tr key={sb.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-4 font-medium text-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                              {avatarLetter}
                            </div>
                            <span className="font-bold text-primary text-sm">{displayName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-secondary font-mono text-xs">
                          {sb.mobile}
                        </td>
                        <td className="p-4">
                          {sb.assignedSite ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>{sb.assignedSite.siteName}</span>
                              {sb.assignedSite.location && (
                                <span className="text-muted text-[11px]">({sb.assignedSite.location})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-rose-400 italic font-medium">No Assigned Site</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={sb.isActive ? "emerald" : "slate"} size="sm">
                            {sb.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditSiteBoy(sb)}
                              className="p-1.5 text-muted hover:text-blue-400 min-h-[32px] min-w-[32px]"
                              title="Edit Assignment & Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                confirmDelete(sb.id, displayName, 'Site Boy')
                              }
                              className="p-1.5 text-muted hover:text-rose-400 min-h-[32px] min-w-[32px]"
                              title="Deactivate Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
      <Modal
        isOpen={coPartnerModalOpen}
        onClose={() => setCoPartnerModalOpen(false)}
        title={editingCoPartner ? 'Edit Co-Partner & Site Shares' : 'Onboard New Co-Partner'}
        maxWidth="lg"
      >
        <form onSubmit={handleCoPartnerSubmit} className="space-y-4">
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

          <Input
            label="Partner Full Name"
            required
            placeholder="e.g. Shamsu"
            value={cpName}
            onChange={(e) => setCpName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mobile Number (Login)"
              required
              disabled={!!editingCoPartner}
              placeholder="10-digit mobile"
              value={cpMobile}
              onChange={(e) => setCpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <Input
              label={`Password ${editingCoPartner ? '(Optional)' : '*'}`}
              type="password"
              required={!editingCoPartner}
              placeholder={editingCoPartner ? 'Keep current password' : 'Min 6 characters'}
              value={cpPassword}
              onChange={(e) => setCpPassword(e.target.value)}
            />
          </div>

          {/* Site Assignment & Percentage Share Matrix */}
          <div className="pt-2 border-t border-subtle">
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-bold text-secondary uppercase tracking-wider">
                Assigned Quarry Sites & Equity Share *
              </label>
              <span className="text-[11px] text-muted">Total ≤ 100% per site</span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cpSiteShares.map((share, idx) => {
                const siteObj = activeSites.find((s) => s.id === share.siteId);
                return (
                  <div
                    key={share.siteId}
                    className={`p-3 rounded-2xl border transition-all ${
                      share.isActive
                        ? 'bg-surface-solid border-amber-500/30 ring-1 ring-amber-500/10'
                        : 'bg-surface-solid/40 border-subtle opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Checkbox
                        label={`${siteObj?.siteName || 'Quarry Site'}${siteObj?.location ? ` (${siteObj.location})` : ''}`}
                        checked={share.isActive}
                        onChange={(checked) => {
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
                      />

                      {share.isActive && (
                        <div className="w-28">
                          <Input
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
                            rightSlot={<span className="text-muted text-xs font-bold">%</span>}
                            className="text-right text-amber-400 font-bold"
                          />
                        </div>
                      )}
                    </div>

                    {share.isActive && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted pt-2 border-t border-subtle gap-2">
                        <span className="flex items-center gap-1.5 text-muted shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          Effective from:
                        </span>
                        <div className="w-40">
                          <DateInput
                            value={share.effectiveFrom}
                            onChange={(val) => {
                              setCpSiteShares((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, effectiveFrom: val } : s))
                              );
                            }}
                            clearable={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-subtle flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCoPartnerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={cpSubmitting}
              disabled={activeSites.length === 0}
            >
              {editingCoPartner ? 'Save Changes' : 'Create Partner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Site Boy Modal */}
      <Modal
        isOpen={siteBoyModalOpen}
        onClose={() => setSiteBoyModalOpen(false)}
        title={editingSiteBoy ? 'Edit Site Supervisor' : 'Onboard Site Supervisor'}
        maxWidth="md"
      >
        <form onSubmit={handleSiteBoySubmit} className="space-y-4">
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

          <Input
            label="Supervisor Name"
            required
            placeholder="e.g. Manu"
            value={sbName}
            onChange={(e) => setSbName(e.target.value)}
          />

          <Input
            label="Mobile Number (Login)"
            required
            disabled={!!editingSiteBoy}
            placeholder="10-digit mobile"
            value={sbMobile}
            onChange={(e) => setSbMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
          />

          <Input
            label={`Password ${editingSiteBoy ? '(Optional)' : '*'}`}
            type="password"
            required={!editingSiteBoy}
            placeholder={editingSiteBoy ? 'Keep current password' : 'Min 6 characters'}
            value={sbPassword}
            onChange={(e) => setSbPassword(e.target.value)}
          />

          <div>
            <CustomSelect
              label="Assigned Quarry Site (Strictly Locked)"
              required
              value={sbSiteId}
              onChange={setSbSiteId}
              options={activeSites.map((s) => ({
                value: s.id,
                label: s.siteName,
                subLabel: s.location || undefined,
              }))}
              placeholder="Select Quarry Site"
            />
            <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              Site supervisors can only record loads and expenses for their assigned quarry site.
            </p>
          </div>

          <div className="pt-4 border-t border-subtle flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSiteBoyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              loading={sbSubmitting}
              disabled={activeSites.length === 0}
            >
              {editingSiteBoy ? 'Save Changes' : 'Create Supervisor'}
            </Button>
          </div>
        </form>
      </Modal>

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
