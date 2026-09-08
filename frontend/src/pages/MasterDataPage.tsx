import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  X,
  Phone,
  Power,
  Zap,
  Users,
} from 'lucide-react';
import {
  Card,
  ConfirmModal,
  CustomSelect,
  PageHeader,
  Button,
  TabBar,
  SearchBar,
  Modal,
  Input,
  Badge,
  EmptyState,
} from '../components/common';
import { TeamManagement } from '../components/team/TeamManagement';
import { ExpenseCategoriesManagement } from '../components/expenses/ExpenseCategoriesManagement';
import { MachineryManagement } from '../components/expenses/MachineryManagement';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR } from '../utils/formatters';
import {
  Site,
  Vehicle,
  VehicleType,
  MaterialType,
  Contractor,
  Rate,
  createSiteApi,
  updateSiteApi,
  createVehicleApi,
  updateVehicleApi,
  deleteVehicleApi,
  createVehicleTypeApi,
  updateVehicleTypeApi,
  deleteVehicleTypeApi,
  createMaterialTypeApi,
  updateMaterialTypeApi,
  deleteMaterialTypeApi,
  createContractorApi,
  updateContractorApi,
  deleteContractorApi,
  createRateApi,
  updateRateApi,
  deleteRateApi,
} from '../api/masterData';
import { useMasterCache } from '../context/MasterCacheContext';

type CustomerTab =
  | 'sites'
  | 'vehicles'
  | 'vehicle-types'
  | 'material-types'
  | 'contractors'
  | 'rates'
  | 'team'
  | 'expense-categories'
  | 'machinery';

export const MasterDataPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isSiteBoy = user?.role === 'SITE_BOY';
  const cache = useMasterCache();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as CustomerTab | null;

  const validCustomerTabs: CustomerTab[] = isSiteBoy
    ? [
        'vehicles',
        'vehicle-types',
        'material-types',
        'contractors',
        'rates',
        'expense-categories',
        'machinery',
      ]
    : [
        'sites',
        'vehicles',
        'vehicle-types',
        'material-types',
        'contractors',
        'rates',
        'team',
        'expense-categories',
        'machinery',
      ];

  const [customerTab, setCustomerTab] = useState<CustomerTab>(
    tabFromUrl && validCustomerTabs.includes(tabFromUrl)
      ? tabFromUrl
      : isSiteBoy
      ? 'vehicles'
      : 'sites',
  );

  useEffect(() => {
    const t = searchParams.get('tab') as CustomerTab | null;
    if (t && validCustomerTabs.includes(t)) {
      setCustomerTab(t);
    }
  }, [searchParams]);

  const handleCustomerTabChange = (newTab: CustomerTab) => {
    setCustomerTab(newTab);
    setSearchParams({ tab: newTab });
    setSearch('');
  };

  // Data Accessors from Tenant Master Cache Bundle
  const sites = cache.sites;
  const vehicles = cache.vehicles;
  const vehicleTypes = cache.vehicleTypes;
  const materialTypes = cache.materialTypes;
  const contractors = cache.contractors;
  const rates = cache.rates;
  const loading = !cache.isInitialized || cache.isLoading;

  const [search, setSearch] = useState('');

  // Modals state
  const [modalMode, setModalMode] = useState<
    | 'site-add'
    | 'site-edit'
    | 'vehicle-add'
    | 'vehicle-edit'
    | 'vtype-add'
    | 'vtype-edit'
    | 'mtype-add'
    | 'mtype-edit'
    | 'contractor-add'
    | 'contractor-edit'
    | 'rate-add'
    | 'rate-edit'
    | null
  >(null);

  const [activeItem, setActiveItem] = useState<any>(null);

  // Form states
  const [siteForm, setSiteForm] = useState({ siteName: '', location: '', pincode: '' });
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: '', vehicleTypeId: '' });
  const [vtypeForm, setVtypeForm] = useState({ name: '' });
  const [mtypeForm, setMtypeForm] = useState({ name: '' });
  const [contractorForm, setContractorForm] = useState({ name: '', mobile: '' });
  const [rateForm, setRateForm] = useState({
    siteId: '',
    vehicleTypeId: '',
    materialTypeId: '',
    amount: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadAllData = async (force = false) => {
    try {
      await cache.refreshMasterData(force);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load master data');
    }
  };

  useEffect(() => {
    if (!cache.isInitialized) {
      void cache.refreshMasterData();
    }
  }, [cache.isInitialized]);

  // ----------------- MODAL OPENERS -----------------
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

  // ----------------- SUBMIT HANDLERS -----------------
  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanSiteName = siteForm.siteName.trim();
    if (!cleanSiteName || cleanSiteName.length < 2) {
      const msg = 'Site name must be at least 2 characters.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const cleanLocation = siteForm.location.trim();
    if (!cleanLocation || cleanLocation.length < 2) {
      const msg = 'Location must be at least 2 characters.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const cleanPincode = siteForm.pincode.replace(/\D/g, '').slice(0, 6);
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      const msg = 'Pincode must be a valid 6-digit Indian postal code (e.g. 682001).';
      setFormError(msg);
      toast.error(msg);
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
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'site-add') {
        await createSiteApi({ siteName: cleanSiteName, location: cleanLocation, pincode: cleanPincode });
        toast.success('Site added successfully!');
      } else {
        await updateSiteApi(activeItem.id, { siteName: cleanSiteName, location: cleanLocation, pincode: cleanPincode });
        toast.success('Site updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
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

  const handleToggleSiteStatus = async (site: Site) => {
    const nextStatus = site.isActive === false ? true : false;
    try {
      await updateSiteApi(site.id, { isActive: nextStatus });
      toast.info(
        `Quarry Site "${site.siteName}" is now ${nextStatus ? 'Active' : 'Inactive (Archived)'}`,
      );
      void loadAllData(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update site status');
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanVehicleNumber = vehicleForm.vehicleNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleanVehicleNumber || cleanVehicleNumber.length < 4 || cleanVehicleNumber.length > 15) {
      const msg = 'Vehicle number must contain 4 to 15 alphanumeric characters.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    if (!vehicleForm.vehicleTypeId) {
      const msg = 'Please select a valid vehicle category.';
      setFormError(msg);
      toast.error(msg);
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
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'vehicle-add') {
        await createVehicleApi({ vehicleNumber: cleanVehicleNumber, vehicleTypeId: vehicleForm.vehicleTypeId });
        toast.success('Vehicle registered successfully!');
      } else {
        await updateVehicleApi(activeItem.id, { vehicleNumber: cleanVehicleNumber, vehicleTypeId: vehicleForm.vehicleTypeId });
        toast.success('Vehicle updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
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
          toast.info(`Vehicle "${num}" deleted`);
          void loadAllData(true);
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
        }
      },
    });
  };

  // ----------------- VEHICLE TYPES CRUD HANDLERS -----------------
  const handleVTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = vtypeForm.name.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = 'Category name must be at least 2 characters.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const isDuplicate = vehicleTypes.some(
      (vt) =>
        vt.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (modalMode === 'vtype-add' || vt.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `Vehicle category "${cleanName}" already exists in your account.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'vtype-add') {
        await createVehicleTypeApi({ name: cleanName });
        toast.success('Vehicle category added successfully!');
      } else {
        await updateVehicleTypeApi(activeItem.id, { name: cleanName });
        toast.success('Vehicle category updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVType = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Category "${name}"?`,
      message: `Are you sure you want to remove vehicle category "${name}"? This action cannot be undone if vehicles or rates are associated with it.`,
      confirmText: 'Delete Category',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteVehicleTypeApi(id);
          toast.info(`Vehicle category "${name}" deleted`);
          void loadAllData(true);
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
        }
      },
    });
  };

  // ----------------- MATERIAL TYPES CRUD HANDLERS -----------------
  const handleMTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = mtypeForm.name.trim();
    if (!cleanName || cleanName.length < 2) {
      const msg = 'Material name must be at least 2 characters.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    const isDuplicate = materialTypes.some(
      (mt) =>
        mt.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (modalMode === 'mtype-add' || mt.id !== activeItem?.id),
    );
    if (isDuplicate) {
      const msg = `Material specification "${cleanName}" already exists in your account.`;
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'mtype-add') {
        await createMaterialTypeApi({ name: cleanName });
        toast.success('Material type added successfully!');
      } else {
        await updateMaterialTypeApi(activeItem.id, { name: cleanName });
        toast.success('Material type updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMType = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: `Delete Material "${name}"?`,
      message: `Are you sure you want to remove material specification "${name}"? This action cannot be undone if rates or loads are associated with it.`,
      confirmText: 'Delete Material',
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteMaterialTypeApi(id);
          toast.info(`Material type "${name}" deleted`);
          void loadAllData(true);
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
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
      toast.error(msg);
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanMobile)) {
      const msg = 'Mobile number must be a valid 10-digit number.';
      setFormError(msg);
      toast.error(msg);
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
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'contractor-add') {
        await createContractorApi({ name: cleanName, mobile: cleanMobile });
        toast.success('Contractor added successfully!');
      } else {
        await updateContractorApi(activeItem.id, { name: cleanName, mobile: cleanMobile });
        toast.success('Contractor updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
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
          toast.info(`Contractor "${name}" deleted`);
          void loadAllData(true);
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
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
      toast.error(msg);
      return;
    }

    if (!rateForm.siteId || !rateForm.vehicleTypeId || !rateForm.materialTypeId) {
      const msg = 'Please select a Site, Vehicle Category, and Material Type.';
      setFormError(msg);
      toast.error(msg);
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
        const msg = 'A rate is already configured for this Site, Vehicle Category, and Material combination.';
        setFormError(msg);
        toast.error(msg);
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
        toast.success('Rate configured successfully!');
      } else {
        await updateRateApi(activeItem.id, { amount: amt });
        toast.success('Rate amount updated successfully!');
      }
      setModalMode(null);
      setFormError(null);
      void loadAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Action failed';
      setFormError(msg);
      toast.error(msg);
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
          toast.info('Rate entry deleted');
          void loadAllData(true);
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
        }
      },
    });
  };

  const masterDataTabs = React.useMemo(() => {
    const list = [];
    if (!isSiteBoy) {
      list.push({ id: 'sites', label: `Quarry Sites (${sites.length})`, icon: MapPin });
    }
    list.push(
      { id: 'vehicles', label: `Fleet Vehicles (${vehicles.length})`, icon: Truck },
      { id: 'vehicle-types', label: `Vehicle Categories (${vehicleTypes.length})`, icon: Truck },
      { id: 'material-types', label: `Material Types (${materialTypes.length})`, icon: Layers },
      { id: 'contractors', label: `Contractors / C/Os (${contractors.length})`, icon: UserCheck },
      { id: 'rates', label: `Rate Matrix (${rates.length})`, icon: Coins },
    );
    if (!isSiteBoy) {
      list.push({ id: 'team', label: 'Team & Roles', icon: Users });
    }
    list.push(
      { id: 'expense-categories', label: 'Expense Heads', icon: Layers },
      { id: 'machinery', label: 'Heavy Machinery', icon: Truck },
    );
    return list;
  }, [isSiteBoy, sites.length, vehicles.length, vehicleTypes.length, materialTypes.length, contractors.length, rates.length]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <PageHeader
        title="Quarry Master Data Management"
        subtitle="Manage fleet registrations, material rates, contractors, quarry locations, team roles, and heavy machinery."
        actions={
          <div className="flex items-center gap-2">
            {!isSiteBoy && customerTab === 'sites' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openSiteModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Quarry Site
              </Button>
            )}
            {customerTab === 'vehicles' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openVehicleModal()}
                disabled={vehicleTypes.length === 0}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Register Vehicle
              </Button>
            )}
            {customerTab === 'vehicle-types' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openVTypeModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Vehicle Category
              </Button>
            )}
            {customerTab === 'material-types' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openMTypeModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Material Type
              </Button>
            )}
            {customerTab === 'contractors' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openContractorModal()}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Contractor
              </Button>
            )}
            {customerTab === 'rates' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => openRateModal()}
                disabled={sites.length === 0 || vehicleTypes.length === 0 || materialTypes.length === 0}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Configure Rate
              </Button>
            )}
          </div>
        }
      />

      {/* Navigation Tabs (Mobile-friendly horizontal scroll) */}
      <TabBar
        tabs={masterDataTabs}
        activeTab={customerTab}
        onChange={(id) => handleCustomerTabChange(id as CustomerTab)}
      />

      {/* Search Input */}
      {customerTab !== 'team' && (
        <SearchBar
          placeholder="Search items in this tab..."
          value={search}
          onChange={setSearch}
        />
      )}

      {/* ----------------- TAB 1: SITES (CUSTOMER) ----------------- */}
      {customerTab === 'sites' && (
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{site.siteName}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            site.isActive !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              site.isActive !== false ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          {site.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{site.location} • {site.pincode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleSiteStatus(site)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        site.isActive !== false
                          ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                          : 'text-amber-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={site.isActive !== false ? 'Deactivate Site (Hides from Dispatch Picker)' : 'Reactivate Site'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openSiteModal(site)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Site"
                    >
                      <Edit2 className="w-4 h-4" />
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
      {customerTab === 'vehicles' && (
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
                    {!isSiteBoy && (
                      <button
                        onClick={() => handleDeleteVehicle(veh.id, veh.vehicleNumber)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

      {/* ----------------- TAB 2B: VEHICLE CATEGORIES / TYPES (CUSTOMER) ----------------- */}
      {customerTab === 'vehicle-types' && (
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
                      <p className="text-xs text-slate-400">Vehicle Category</p>
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
                  <span>
                    Fleet Vehicles: <strong className="text-slate-200">{vt._count?.vehicles || 0}</strong>
                  </span>
                  <span>
                    Active Rates: <strong className="text-slate-200">{vt._count?.rates || 0}</strong>
                  </span>
                </div>
              </Card>
            ))}

          {vehicleTypes.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No vehicle categories defined. Click <strong>+ Add Vehicle Category</strong> above to configure tippers, lorries, etc.
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 2C: MATERIAL TYPES (CUSTOMER) ----------------- */}
      {customerTab === 'material-types' && (
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
                      <p className="text-xs text-slate-400">Material Specification</p>
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
                  <span>
                    Configured Rates: <strong className="text-slate-200">{mt._count?.rates || 0}</strong>
                  </span>
                  <span>
                    Recorded Loads: <strong className="text-slate-200">{mt._count?.loads || 0}</strong>
                  </span>
                </div>
              </Card>
            ))}

          {materialTypes.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
              No material types defined. Click <strong>+ Add Material Type</strong> above to add aggregates, sand, etc.
            </div>
          )}
        </div>
      )}

      {/* ----------------- TAB 3: CONTRACTORS (CUSTOMER) ----------------- */}
      {customerTab === 'contractors' && (
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
                    {!isSiteBoy && (
                      <button
                        onClick={() => handleDeleteContractor(c.id, c.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Contractor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
      {customerTab === 'rates' && (
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
                        {formatINR(r.amount)}
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

      {/* ----------------- TAB 5: TEAM & SUB-ACCOUNTS (CUSTOMER) ----------------- */}
      {customerTab === 'team' && (
        <TeamManagement />
      )}

      {/* ----------------- TAB 6: EXPENSE CATEGORIES (CUSTOMER) ----------------- */}
      {customerTab === 'expense-categories' && (
        <ExpenseCategoriesManagement />
      )}

      {/* ----------------- TAB 7: HEAVY MACHINERY (CUSTOMER) ----------------- */}
      {customerTab === 'machinery' && (
        <MachineryManagement />
      )}

      {/* ========================================================================= */}
      {/*                                 MODALS                                    */}
      {/* ========================================================================= */}

      {/* 1. Site Modal */}
      <Modal
        isOpen={modalMode === 'site-add' || modalMode === 'site-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'site-add' ? 'Add New Quarry / Yard Site' : 'Edit Site Details'}
        maxWidth="md"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSiteSubmit} className="space-y-4">
          <Input
            label="Site Name"
            required
            placeholder="e.g. Kolenchery Crusher Unit"
            value={siteForm.siteName}
            onChange={(e) => { setSiteForm({ ...siteForm, siteName: e.target.value }); setFormError(null); }}
          />

          <Input
            label="Location / Area"
            required
            placeholder="e.g. Kolenchery, Ernakulam"
            value={siteForm.location}
            onChange={(e) => { setSiteForm({ ...siteForm, location: e.target.value }); setFormError(null); }}
          />

          <Input
            label="6-Digit Postal Pincode"
            required
            maxLength={6}
            placeholder="e.g. 682311"
            value={siteForm.pincode}
            onChange={(e) => { setSiteForm({ ...siteForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }); setFormError(null); }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Site
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Vehicle Modal */}
      <Modal
        isOpen={modalMode === 'vehicle-add' || modalMode === 'vehicle-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'vehicle-add' ? 'Register Fleet Vehicle' : 'Edit Vehicle'}
        maxWidth="md"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleVehicleSubmit} className="space-y-4">
          <div>
            <Input
              label="Vehicle Registration Number"
              required
              maxLength={15}
              placeholder="e.g. KL41A5621"
              value={vehicleForm.vehicleNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                setVehicleForm({ ...vehicleForm, vehicleNumber: val });
                setFormError(null);
              }}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2B. Vehicle Category Modal (Owner) */}
      <Modal
        isOpen={modalMode === 'vtype-add' || modalMode === 'vtype-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'vtype-add' ? 'Add Vehicle Category' : 'Edit Vehicle Category'}
        maxWidth="sm"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleVTypeSubmit} className="space-y-4">
          <Input
            label="Category Name"
            required
            placeholder="e.g. Tipper, Lorry, 10-Wheeler, Tractor"
            value={vtypeForm.name}
            onChange={(e) => { setVtypeForm({ name: e.target.value }); setFormError(null); }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2C. Material Type Modal (Owner) */}
      <Modal
        isOpen={modalMode === 'mtype-add' || modalMode === 'mtype-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'mtype-add' ? 'Add Material Specification' : 'Edit Material Specification'}
        maxWidth="sm"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleMTypeSubmit} className="space-y-4">
          <Input
            label="Material Name"
            required
            placeholder="e.g. Aggregates 20mm, Sand, Rubble, Quarry Dust"
            value={mtypeForm.name}
            onChange={(e) => { setMtypeForm({ name: e.target.value }); setFormError(null); }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Contractor Modal */}
      <Modal
        isOpen={modalMode === 'contractor-add' || modalMode === 'contractor-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'contractor-add' ? 'Add C/O Contractor' : 'Edit Contractor'}
        maxWidth="md"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleContractorSubmit} className="space-y-4">
          <Input
            label="Contractor Name"
            required
            placeholder="e.g. Sathar Pattimattom"
            value={contractorForm.name}
            onChange={(e) => {
              setContractorForm({ ...contractorForm, name: e.target.value });
              setFormError(null);
            }}
          />

          <div>
            <Input
              label="10-Digit Mobile Number"
              required
              maxLength={10}
              placeholder="e.g. 9845012345"
              value={contractorForm.mobile}
              onChange={(e) => {
                setContractorForm({ ...contractorForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) });
                setFormError(null);
              }}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Unique 10-digit mobile number for dispatch matching and statements.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Contractor
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Rate Modal */}
      <Modal
        isOpen={modalMode === 'rate-add' || modalMode === 'rate-edit'}
        onClose={() => { setModalMode(null); setFormError(null); }}
        title={modalMode === 'rate-add' ? 'Configure Rate Matrix' : 'Update Rate Price'}
        maxWidth="md"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
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
                label="Vehicle Category"
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
              <div>Vehicle Category: <strong className="text-white">{activeItem?.vehicleType?.name}</strong></div>
              <div>Material: <strong className="text-white">{activeItem?.materialType?.name}</strong></div>
            </div>
          )}

          <Input
            label="Rate Amount (₹ per load)"
            required
            type="number"
            inputMode="numeric"
            step="any"
            min="1"
            placeholder="3500.00"
            value={rateForm.amount}
            onChange={(e) => { setRateForm({ ...rateForm, amount: e.target.value }); setFormError(null); }}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setModalMode(null); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Rate
            </Button>
          </div>
        </form>
      </Modal>

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
