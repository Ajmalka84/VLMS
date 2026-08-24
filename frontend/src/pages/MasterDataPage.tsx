import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Truck,
  UserCheck,
  Coins,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Phone,
  Building2,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import {
  Site,
  Vehicle,
  Contractor,
  Rate,
  VehicleType,
  MaterialType,
  getSitesApi,
  createSiteApi,
  updateSiteApi,
  deleteSiteApi,
  getVehiclesApi,
  createVehicleApi,
  updateVehicleApi,
  deleteVehicleApi,
  getContractorsApi,
  createContractorApi,
  updateContractorApi,
  deleteContractorApi,
  getRatesApi,
  createRateApi,
  updateRateApi,
  deleteRateApi,
  getVehicleTypesApi,
  createVehicleTypeApi,
  updateVehicleTypeApi,
  deleteVehicleTypeApi,
  getMaterialTypesApi,
  createMaterialTypeApi,
  updateMaterialTypeApi,
  deleteMaterialTypeApi,
} from '../api/masterData';
import { useMasterCache } from '../context/MasterCacheContext';

type CustomerTab = 'sites' | 'vehicles' | 'contractors' | 'rates';
type AdminTab = 'vehicle-types' | 'material-types';

export const MasterDataPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const cache = useMasterCache();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as CustomerTab | null;

  const [customerTab, setCustomerTab] = useState<CustomerTab>(
    tabFromUrl && ['sites', 'vehicles', 'contractors', 'rates'].includes(tabFromUrl)
      ? tabFromUrl
      : 'sites'
  );
  const [adminTab, setAdminTab] = useState<AdminTab>('vehicle-types');

  useEffect(() => {
    const t = searchParams.get('tab') as CustomerTab | null;
    if (t && ['sites', 'vehicles', 'contractors', 'rates'].includes(t)) {
      setCustomerTab(t);
    }
  }, [searchParams]);

  const handleCustomerTabChange = (newTab: CustomerTab) => {
    setCustomerTab(newTab);
    setSearchParams({ tab: newTab });
    setSearch('');
  };

  // Super Admin Local Master Data State (for global types)
  const [adminVehicleTypes, setAdminVehicleTypes] = useState<VehicleType[]>([]);
  const [adminMaterialTypes, setAdminMaterialTypes] = useState<MaterialType[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Unified Data Accessors (Customer uses cached bundle; Admin uses admin state)
  const sites = isSuperAdmin ? [] : cache.sites;
  const vehicles = isSuperAdmin ? [] : cache.vehicles;
  const contractors = isSuperAdmin ? [] : cache.contractors;
  const rates = isSuperAdmin ? [] : cache.rates;
  const vehicleTypes = isSuperAdmin ? adminVehicleTypes : cache.vehicleTypes;
  const materialTypes = isSuperAdmin ? adminMaterialTypes : cache.materialTypes;
  const loading = isSuperAdmin ? adminLoading : (!cache.isInitialized || cache.isLoading);

  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals state
  const [modalMode, setModalMode] = useState<
    | 'site-add'
    | 'site-edit'
    | 'vehicle-add'
    | 'vehicle-edit'
    | 'contractor-add'
    | 'contractor-edit'
    | 'rate-add'
    | 'rate-edit'
    | 'vtype-add'
    | 'vtype-edit'
    | 'mtype-add'
    | 'mtype-edit'
    | null
  >(null);

  const [activeItem, setActiveItem] = useState<any>(null);

  // Form states
  const [siteForm, setSiteForm] = useState({ siteName: '', location: '', pincode: '' });
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: '', vehicleTypeId: '' });
  const [contractorForm, setContractorForm] = useState({ name: '', mobile: '' });
  const [rateForm, setRateForm] = useState({
    siteId: '',
    vehicleTypeId: '',
    materialTypeId: '',
    amount: '',
  });
  const [vtypeForm, setVtypeForm] = useState({ name: '' });
  const [mtypeForm, setMtypeForm] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const adminFetchingRef = useRef(false);

  const loadAllData = async (force = false) => {
    if (isSuperAdmin) {
      if (adminFetchingRef.current && !force) return;
      adminFetchingRef.current = true;
      setAdminLoading(true);
      try {
        const [vtypes, mtypes] = await Promise.all([
          getVehicleTypesApi(),
          getMaterialTypesApi(),
        ]);
        setAdminVehicleTypes(vtypes);
        setAdminMaterialTypes(mtypes);
      } catch (err: any) {
        showNotify('error', err.message || 'Failed to load master data');
      } finally {
        setAdminLoading(false);
        adminFetchingRef.current = false;
      }
    } else {
      try {
        await cache.refreshMasterData(force);
      } catch (err: any) {
        showNotify('error', err.message || 'Failed to load master data');
      }
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      void loadAllData();
    } else if (!cache.isInitialized) {
      void cache.refreshMasterData();
    }
  }, [isSuperAdmin, cache.isInitialized]);

  // ----------------- MODAL HANDLERS -----------------
  const openSiteModal = (site?: Site) => {
    setFormError(null);
    if (site) {
      setActiveItem(site);
      setSiteForm({ siteName: site.siteName, location: site.location, pincode: site.pincode });
      setModalMode('site-edit');
    } else {
      setActiveItem(null);
      setSiteForm({ siteName: '', location: '', pincode: '' });
      setModalMode('site-add');
    }
  };

  const openVehicleModal = (veh?: Vehicle) => {
    setFormError(null);
    if (veh) {
      setActiveItem(veh);
      setVehicleForm({ vehicleNumber: veh.vehicleNumber, vehicleTypeId: veh.vehicleTypeId });
      setModalMode('vehicle-edit');
    } else {
      setActiveItem(null);
      setVehicleForm({
        vehicleNumber: '',
        vehicleTypeId: vehicleTypes[0]?.id || '',
      });
      setModalMode('vehicle-add');
    }
  };

  const openContractorModal = (c?: Contractor) => {
    setFormError(null);
    if (c) {
      setActiveItem(c);
      setContractorForm({ name: c.name, mobile: c.mobile });
      setModalMode('contractor-edit');
    } else {
      setActiveItem(null);
      setContractorForm({ name: '', mobile: '' });
      setModalMode('contractor-add');
    }
  };

  const openRateModal = (r?: Rate) => {
    setFormError(null);
    if (r) {
      setActiveItem(r);
      setRateForm({
        siteId: r.siteId,
        vehicleTypeId: r.vehicleTypeId,
        materialTypeId: r.materialTypeId,
        amount: String(r.amount),
      });
      setModalMode('rate-edit');
    } else {
      setActiveItem(null);
      setRateForm({
        siteId: sites[0]?.id || '',
        vehicleTypeId: vehicleTypes[0]?.id || '',
        materialTypeId: materialTypes[0]?.id || '',
        amount: '',
      });
      setModalMode('rate-add');
    }
  };

  const openVTypeModal = (vt?: VehicleType) => {
    setFormError(null);
    if (vt) {
      setActiveItem(vt);
      setVtypeForm({ name: vt.name });
      setModalMode('vtype-edit');
    } else {
      setActiveItem(null);
      setVtypeForm({ name: '' });
      setModalMode('vtype-add');
    }
  };

  const openMTypeModal = (mt?: MaterialType) => {
    setFormError(null);
    if (mt) {
      setActiveItem(mt);
      setMtypeForm({ name: mt.name });
      setModalMode('mtype-edit');
    } else {
      setActiveItem(null);
      setMtypeForm({ name: '' });
      setModalMode('mtype-add');
    }
  };

  // ----------------- SUBMIT HANDLERS -----------------
  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSiteName = siteForm.siteName.trim();
    if (!cleanSiteName || cleanSiteName.length < 2) {
      const msg = 'Site name must be at least 2 characters.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const cleanLocation = siteForm.location.trim();
    if (!cleanLocation || cleanLocation.length < 2) {
      const msg = 'Location must be at least 2 characters.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const cleanPincode = siteForm.pincode.replace(/\D/g, '').slice(0, 6);
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      const msg = 'Pincode must be a valid 6-digit Indian postal code (e.g. 682001).';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const isDuplicate = sites.some(
      (s) =>
        s.siteName.trim().toLowerCase() === cleanSiteName.toLowerCase() &&
        (modalMode === 'site-add' || s.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `A site named "${cleanSiteName}" already exists in your account.`;
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'site-add') {
        await createSiteApi({ siteName: cleanSiteName, location: cleanLocation, pincode: cleanPincode });
        showNotify('success', 'Site added successfully!');
      } else {
        await updateSiteApi(activeItem.id, { siteName: cleanSiteName, location: cleanLocation, pincode: cleanPincode });
        showNotify('success', 'Site updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const handleDeleteSite = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Site "${name}"?`,
      message: `Deleting this site will also remove all rate configurations associated with it. Are you sure you want to proceed?`,
      confirmText: 'Delete Site',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteSiteApi(id);
          showNotify('success', `Site "${name}" deleted`);
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanVehicleNumber = vehicleForm.vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanVehicleNumber || cleanVehicleNumber.length < 4 || cleanVehicleNumber.length > 15) {
      const msg = 'Vehicle number must contain 4 to 15 alphanumeric characters (letters and numbers only, no spaces or dashes).';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    if (!vehicleForm.vehicleTypeId) {
      const msg = 'Please select a valid vehicle category.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const isDuplicate = vehicles.some(
      (v) =>
        v.vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanVehicleNumber &&
        (modalMode === 'vehicle-add' || v.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `Vehicle "${cleanVehicleNumber}" is already registered in your fleet.`;
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'vehicle-add') {
        await createVehicleApi({ vehicleNumber: cleanVehicleNumber, vehicleTypeId: vehicleForm.vehicleTypeId });
        showNotify('success', 'Vehicle registered successfully!');
      } else {
        await updateVehicleApi(activeItem.id, { vehicleNumber: cleanVehicleNumber, vehicleTypeId: vehicleForm.vehicleTypeId });
        showNotify('success', 'Vehicle updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = (id: string, num: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Vehicle "${num}"?`,
      message: `Are you sure you want to remove vehicle "${num}" from your active fleet?`,
      confirmText: 'Delete Vehicle',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteVehicleApi(id);
          showNotify('success', `Vehicle "${num}" deleted`);
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  const handleContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = contractorForm.name.trim();
    const cleanMobile = contractorForm.mobile.replace(/\D/g, '').slice(0, 10);

    if (!cleanName || cleanName.length < 2) {
      const msg = 'Contractor name must be at least 2 characters.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      const msg = 'Mobile number must be a valid 10-digit number.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const isDuplicate = contractors.some(
      (c) =>
        c.mobile.trim() === cleanMobile &&
        (modalMode === 'contractor-add' || c.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const existing = contractors.find((c) => c.mobile.trim() === cleanMobile);
      const msg = `A contractor with mobile number "${cleanMobile}" already exists (${existing?.name}).`;
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'contractor-add') {
        await createContractorApi({ name: cleanName, mobile: cleanMobile });
        showNotify('success', 'Contractor added successfully!');
      } else {
        await updateContractorApi(activeItem.id, { name: cleanName, mobile: cleanMobile });
        showNotify('success', 'Contractor updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContractor = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Contractor "${name}"?`,
      message: `Are you sure you want to remove C/O contractor "${name}"?`,
      confirmText: 'Delete Contractor',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteContractorApi(id);
          showNotify('success', `Contractor "${name}" deleted`);
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(rateForm.amount);
    if (isNaN(amt) || amt <= 0) {
      const msg = 'Please enter a valid rate amount greater than 0.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    if (!rateForm.siteId || !rateForm.vehicleTypeId || !rateForm.materialTypeId) {
      const msg = 'Please select a Site, Vehicle Category, and Material Type.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    if (modalMode === 'rate-add') {
      const isDuplicate = rates.some(
        (r) =>
          r.siteId === rateForm.siteId &&
          r.vehicleTypeId === rateForm.vehicleTypeId &&
          r.materialTypeId === rateForm.materialTypeId,
      );
      if (isDuplicate) {
        const msg = 'A rate is already configured for this Site, Vehicle Category, and Material combination. Please edit the existing rate instead.';
        setFormError(msg);
        showNotify('error', msg);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (modalMode === 'rate-add') {
        await createRateApi({
          siteId: rateForm.siteId,
          vehicleTypeId: rateForm.vehicleTypeId,
          materialTypeId: rateForm.materialTypeId,
          amount: amt,
        });
        showNotify('success', 'Rate configured successfully!');
      } else {
        await updateRateApi(activeItem.id, { amount: amt });
        showNotify('success', 'Rate amount updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Rate Entry?',
      message: 'Are you sure you want to delete this rate combination from your pricing matrix?',
      confirmText: 'Delete Rate',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteRateApi(id);
          showNotify('success', 'Rate entry deleted');
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  const handleVTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = vtypeForm.name.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = 'Category name must be at least 2 characters.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const isDuplicate = vehicleTypes.some(
      (vt) =>
        vt.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (modalMode === 'vtype-add' || vt.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `Vehicle category "${cleanName}" already exists.`;
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'vtype-add') {
        await createVehicleTypeApi({ name: cleanName });
        showNotify('success', 'Vehicle category added successfully!');
      } else {
        await updateVehicleTypeApi(activeItem.id, { name: cleanName });
        showNotify('success', 'Vehicle category updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVType = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Category "${name}"?`,
      message: `Are you sure you want to remove the global vehicle category "${name}"?`,
      confirmText: 'Delete Category',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteVehicleTypeApi(id);
          showNotify('success', `Vehicle type "${name}" deleted`);
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  const handleMTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = mtypeForm.name.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = 'Material name must be at least 2 characters.';
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    const isDuplicate = materialTypes.some(
      (mt) =>
        mt.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (modalMode === 'mtype-add' || mt.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `Material type "${cleanName}" already exists.`;
      setFormError(msg);
      showNotify('error', msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'mtype-add') {
        await createMaterialTypeApi({ name: cleanName });
        showNotify('success', 'Material type added successfully!');
      } else {
        await updateMaterialTypeApi(activeItem.id, { name: cleanName });
        showNotify('success', 'Material type updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData();
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      showNotify('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMType = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Material "${name}"?`,
      message: `Are you sure you want to remove the global material specification "${name}"?`,
      confirmText: 'Delete Material',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteMaterialTypeApi(id);
          showNotify('success', `Material type "${name}" deleted`);
          void loadAllData();
        } catch (err: any) {
          showNotify('error', err.message || 'Delete failed');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {isSuperAdmin ? 'Global Master Configuration' : 'Master Data Configuration'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isSuperAdmin && (
            <>
              {customerTab === 'sites' && (
                <button
                  onClick={() => openSiteModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Add Site
                </button>
              )}
              {customerTab === 'vehicles' && (
                <button
                  onClick={() => openVehicleModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              )}
              {customerTab === 'contractors' && (
                <button
                  onClick={() => openContractorModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Add Contractor
                </button>
              )}
              {customerTab === 'rates' && (
                <button
                  onClick={() => openRateModal()}
                  disabled={sites.length === 0 || vehicleTypes.length === 0 || materialTypes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Configure Rate
                </button>
              )}
            </>
          )}

          {isSuperAdmin && (
            <>
              {adminTab === 'vehicle-types' && (
                <button
                  onClick={() => openVTypeModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle Type
                </button>
              )}
              {adminTab === 'material-types' && (
                <button
                  onClick={() => openMTypeModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation"
                >
                  <Plus className="w-4 h-4" /> Add Material Type
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-x-auto">
        {!isSuperAdmin ? (
          <>
            <button
              onClick={() => handleCustomerTabChange('sites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation ${
                customerTab === 'sites'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" /> Sites ({sites.length})
            </button>
            <button
              onClick={() => handleCustomerTabChange('vehicles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation ${
                customerTab === 'vehicles'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> Fleet Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => handleCustomerTabChange('contractors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation ${
                customerTab === 'contractors'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Contractors / C/Os ({contractors.length})
            </button>
            <button
              onClick={() => handleCustomerTabChange('rates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation ${
                customerTab === 'rates'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-4 h-4" /> Rate Matrix ({rates.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setAdminTab('vehicle-types');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                adminTab === 'vehicle-types'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> Vehicle Types ({vehicleTypes.length})
            </button>
            <button
              onClick={() => {
                setAdminTab('material-types');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                adminTab === 'material-types'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Material Types ({materialTypes.length})
            </button>
          </>
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* ----------------- TAB 1: SITES (CUSTOMER) ----------------- */}
      {!isSuperAdmin && customerTab === 'sites' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites
            .filter(
              (s) =>
                s.siteName.toLowerCase().includes(search.toLowerCase()) ||
                s.location.toLowerCase().includes(search.toLowerCase()) ||
                s.pincode.includes(search),
            )
            .map((site) => (
              <Card key={site.id} variant="glass" className="space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{site.siteName}</h3>
                      <p className="text-xs text-slate-400">{site.location} • {site.pincode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openSiteModal(site)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Site"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSite(site.id, site.siteName)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Configured Rates: <strong className="text-slate-200">{site._count?.rates || 0}</strong></span>
                  <span>Recorded Loads: <strong className="text-slate-200">{site._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}

          {sites.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No sites configured yet. Click <strong>+ Add Site</strong> above to register your first operational location.
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2: FLEET VEHICLES (CUSTOMER) ----------------- */}
      {!isSuperAdmin && customerTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles
            .filter(
              (v) =>
                v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
                v.vehicleType?.name.toLowerCase().includes(search.toLowerCase()),
            )
            .map((veh) => (
              <Card key={veh.id} variant="glass" className="space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base tracking-wide font-mono">
                        {veh.vehicleNumber}
                      </h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold">
                        {veh.vehicleType?.name || 'Standard'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVehicleModal(veh)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(veh.id, veh.vehicleNumber)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registered: {new Date(veh.createdAt).toLocaleDateString()}</span>
                  <span>Loads: <strong className="text-slate-200">{veh._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}

          {vehicles.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No vehicles in fleet. Click <strong>+ Add Vehicle</strong> above to register transport trucks.
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: CONTRACTORS (CUSTOMER) ----------------- */}
      {!isSuperAdmin && customerTab === 'contractors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors
            .filter(
              (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.mobile.includes(search),
            )
            .map((c) => (
              <Card key={c.id} variant="glass" className="space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{c.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>+91 {c.mobile}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openContractorModal(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Contractor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContractor(c.id, c.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Contractor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Created: {new Date(c.createdAt).toLocaleDateString()}</span>
                  <span>Loads Handled: <strong className="text-slate-200">{c._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}

          {contractors.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No C/O contractors added. Click <strong>+ Add Contractor</strong> above to register transport contractors.
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 4: RATE MATRIX (CUSTOMER) ----------------- */}
      {!isSuperAdmin && customerTab === 'rates' && (
        <div className="space-y-4">
          <Card variant="highlight" className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300">
                <strong>Automatic Rate Resolution:</strong> Each rate is strictly determined by <span className="text-amber-300">Site + Vehicle Type + Material Type</span>.
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rates
              .filter(
                (r) =>
                  r.site?.siteName.toLowerCase().includes(search.toLowerCase()) ||
                  r.vehicleType?.name.toLowerCase().includes(search.toLowerCase()) ||
                  r.materialType?.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((r) => (
                <Card key={r.id} variant="glass" className="space-y-3 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                        {r.site?.siteName}
                      </div>
                      <div className="text-base font-extrabold text-white mt-1">
                        {r.vehicleType?.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Material: <span className="text-slate-200 font-medium">{r.materialType?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-emerald-400">
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">per trip / load</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      Updated {new Date(r.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openRateModal(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                      >
                        Edit Price
                      </button>
                      <button
                        onClick={() => handleDeleteRate(r.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

            {rates.length === 0 && !loading && (
              <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
                No rates configured yet. Click <strong>+ Configure Rate</strong> above to establish load pricing.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SUPER ADMIN: VEHICLE TYPES ----------------- */}
      {isSuperAdmin && adminTab === 'vehicle-types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicleTypes
            .filter((vt) => vt.name.toLowerCase().includes(search.toLowerCase()))
            .map((vt) => (
              <Card key={vt.id} variant="glass" className="space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{vt.name}</h3>
                      <p className="text-xs text-slate-400">Global Category</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVTypeModal(vt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVType(vt.id, vt.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Platform Vehicles: <strong className="text-slate-200">{vt._count?.vehicles || 0}</strong></span>
                  <span>Active Rates: <strong className="text-slate-200">{vt._count?.rates || 0}</strong></span>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ----------------- SUPER ADMIN: MATERIAL TYPES ----------------- */}
      {isSuperAdmin && adminTab === 'material-types' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materialTypes
            .filter((mt) => mt.name.toLowerCase().includes(search.toLowerCase()))
            .map((mt) => (
              <Card key={mt.id} variant="glass" className="space-y-4 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{mt.name}</h3>
                      <p className="text-xs text-slate-400">Global Material</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openMTypeModal(mt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Material"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMType(mt.id, mt.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Configured Rates: <strong className="text-slate-200">{mt._count?.rates || 0}</strong></span>
                  <span>Recorded Loads: <strong className="text-slate-200">{mt._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/*                                 MODALS                                    */}
      {/* ========================================================================= */}

      {/* 1. Site Modal */}
      {(modalMode === 'site-add' || modalMode === 'site-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'site-add' ? 'Add New Quarry / Yard Site' : 'Edit Site Details'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSiteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Site Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kolenchery Crusher Unit"
                  value={siteForm.siteName}
                  onChange={(e) => { setSiteForm({ ...siteForm, siteName: e.target.value }); setFormError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location / Area <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kolenchery, Ernakulam"
                  value={siteForm.location}
                  onChange={(e) => { setSiteForm({ ...siteForm, location: e.target.value }); setFormError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  6-Digit Postal Pincode <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 682311"
                  value={siteForm.pincode}
                  onChange={(e) => { setSiteForm({ ...siteForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }); setFormError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Site'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 2. Vehicle Modal */}
      {(modalMode === 'vehicle-add' || modalMode === 'vehicle-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'vehicle-add' ? 'Register Fleet Vehicle' : 'Edit Vehicle'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle Registration Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="e.g. KL41A5621"
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    setVehicleForm({ ...vehicleForm, vehicleNumber: val });
                    setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono uppercase tracking-wider"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Letters & numbers only (e.g. <span className="text-amber-400 font-mono">KL41A5621</span>). Spaces and symbols are automatically stripped.
                </p>
              </div>
              <CustomSelect
                label="Vehicle Category / Type"
                required
                options={vehicleTypes.map((vt) => ({
                  value: vt.id,
                  label: vt.name,
                  icon: <Truck className="w-4 h-4" />,
                }))}
                value={vehicleForm.vehicleTypeId}
                onChange={(val) => {
                  setVehicleForm({ ...vehicleForm, vehicleTypeId: val });
                  setFormError(null);
                }}
                placeholder="Select Vehicle Category"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 3. Contractor Modal */}
      {(modalMode === 'contractor-add' || modalMode === 'contractor-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'contractor-add' ? 'Add C/O Contractor' : 'Edit Contractor'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleContractorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contractor Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sathar Pattimattom"
                  value={contractorForm.name}
                  onChange={(e) => {
                    setContractorForm({ ...contractorForm, name: e.target.value });
                    setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  10-Digit Mobile Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9845012345"
                  value={contractorForm.mobile}
                  onChange={(e) => {
                    setContractorForm({ ...contractorForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) });
                    setFormError(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Unique 10-digit mobile number for dispatch matching and statements.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Contractor'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 4. Rate Modal */}
      {(modalMode === 'rate-add' || modalMode === 'rate-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'rate-add' ? 'Configure Rate Matrix' : 'Update Rate Price'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleRateSubmit} className="space-y-4">
              {modalMode === 'rate-add' ? (
                <>
                  <CustomSelect
                    label="Site"
                    required
                    options={sites.map((s) => ({
                      value: s.id,
                      label: s.siteName,
                      subLabel: s.location,
                      icon: <MapPin className="w-4 h-4" />,
                    }))}
                    value={rateForm.siteId}
                    onChange={(val) => { setRateForm({ ...rateForm, siteId: val }); setFormError(null); }}
                    placeholder="Select Operational Site"
                  />

                  <CustomSelect
                    label="Vehicle Type"
                    required
                    options={vehicleTypes.map((vt) => ({
                      value: vt.id,
                      label: vt.name,
                      icon: <Truck className="w-4 h-4" />,
                    }))}
                    value={rateForm.vehicleTypeId}
                    onChange={(val) => { setRateForm({ ...rateForm, vehicleTypeId: val }); setFormError(null); }}
                    placeholder="Select Vehicle Category"
                  />

                  <CustomSelect
                    label="Material Type"
                    required
                    options={materialTypes.map((mt) => ({
                      value: mt.id,
                      label: mt.name,
                      icon: <Layers className="w-4 h-4" />,
                    }))}
                    value={rateForm.materialTypeId}
                    onChange={(val) => { setRateForm({ ...rateForm, materialTypeId: val }); setFormError(null); }}
                    placeholder="Select Material Type"
                  />
                </>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs text-slate-300">
                  <div>Site: <strong className="text-white">{activeItem?.site?.siteName}</strong></div>
                  <div>Vehicle Type: <strong className="text-white">{activeItem?.vehicleType?.name}</strong></div>
                  <div>Material: <strong className="text-white">{activeItem?.materialType?.name}</strong></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rate Amount (₹ per load) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="any"
                    min="1"
                    required
                    placeholder="3500.00"
                    value={rateForm.amount}
                    onChange={(e) => { setRateForm({ ...rateForm, amount: e.target.value }); setFormError(null); }}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Rate'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 5. Vehicle Type Modal (Super Admin) */}
      {(modalMode === 'vtype-add' || modalMode === 'vtype-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'vtype-add' ? 'Add Global Vehicle Category' : 'Edit Vehicle Category'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleVTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dumper 10-Wheeler"
                  value={vtypeForm.name}
                  onChange={(e) => { setVtypeForm({ name: e.target.value }); setFormError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 6. Material Type Modal (Super Admin) */}
      {(modalMode === 'mtype-add' || modalMode === 'mtype-edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => { setModalMode(null); setFormError(null); }}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'mtype-add' ? 'Add Global Material Type' : 'Edit Material Type'}
            </h2>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-snug">{formError}</span>
              </div>
            )}

            <form onSubmit={handleMTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Material Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aggregates 20mm"
                  value={mtypeForm.name}
                  onChange={(e) => { setMtypeForm({ name: e.target.value }); setFormError(null); }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setFormError(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Material'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText || 'Delete'}
          variant="danger"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
