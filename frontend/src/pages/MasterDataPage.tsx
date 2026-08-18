import React, { useState, useEffect } from 'react';
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

type CustomerTab = 'sites' | 'vehicles' | 'contractors' | 'rates';
type AdminTab = 'vehicle-types' | 'material-types';

export const MasterDataPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [customerTab, setCustomerTab] = useState<CustomerTab>('sites');
  const [adminTab, setAdminTab] = useState<AdminTab>('vehicle-types');

  // Master Data State
  const [sites, setSites] = useState<Site[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);

  const [loading, setLoading] = useState(true);
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

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [vtypes, mtypes] = await Promise.all([
          getVehicleTypesApi(),
          getMaterialTypesApi(),
        ]);
        setVehicleTypes(vtypes);
        setMaterialTypes(mtypes);
      } else {
        const [sitesData, vehiclesData, contractorsData, ratesData, vtypes, mtypes] =
          await Promise.all([
            getSitesApi(),
            getVehiclesApi(),
            getContractorsApi(),
            getRatesApi(),
            getVehicleTypesApi(),
            getMaterialTypesApi(),
          ]);
        setSites(sitesData);
        setVehicles(vehiclesData);
        setContractors(contractorsData);
        setRates(ratesData);
        setVehicleTypes(vtypes);
        setMaterialTypes(mtypes);
      }
    } catch (err: any) {
      showNotify('error', err.message || 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, [isSuperAdmin]);

  // ----------------- MODAL HANDLERS -----------------
  const openSiteModal = (site?: Site) => {
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
    setSubmitting(true);
    try {
      if (modalMode === 'site-add') {
        await createSiteApi(siteForm);
        showNotify('success', 'Site added successfully!');
      } else {
        await updateSiteApi(activeItem.id, siteForm);
        showNotify('success', 'Site updated successfully!');
      }
      setModalMode(null);
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
    setSubmitting(true);
    try {
      if (modalMode === 'vehicle-add') {
        await createVehicleApi(vehicleForm);
        showNotify('success', 'Vehicle registered successfully!');
      } else {
        await updateVehicleApi(activeItem.id, vehicleForm);
        showNotify('success', 'Vehicle updated successfully!');
      }
      setModalMode(null);
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
    setSubmitting(true);
    try {
      if (modalMode === 'contractor-add') {
        await createContractorApi(contractorForm);
        showNotify('success', 'Contractor added successfully!');
      } else {
        await updateContractorApi(activeItem.id, contractorForm);
        showNotify('success', 'Contractor updated successfully!');
      }
      setModalMode(null);
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
    setSubmitting(true);
    try {
      const amt = parseFloat(rateForm.amount);
      if (isNaN(amt) || amt <= 0) {
        throw new Error('Please enter a valid rate amount greater than 0');
      }

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
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
    setSubmitting(true);
    try {
      if (modalMode === 'vtype-add') {
        await createVehicleTypeApi(vtypeForm);
        showNotify('success', 'Vehicle type added successfully!');
      } else {
        await updateVehicleTypeApi(activeItem.id, vtypeForm);
        showNotify('success', 'Vehicle type updated successfully!');
      }
      setModalMode(null);
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
    setSubmitting(true);
    try {
      if (modalMode === 'mtype-add') {
        await createMaterialTypeApi(mtypeForm);
        showNotify('success', 'Material type added successfully!');
      } else {
        await updateMaterialTypeApi(activeItem.id, mtypeForm);
        showNotify('success', 'Material type updated successfully!');
      }
      setModalMode(null);
      void loadAllData();
    } catch (err: any) {
      showNotify('error', err.message || 'Action failed');
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
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {isSuperAdmin ? 'Global Master Configuration' : 'Master Data Configuration'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Configure global vehicle categories and material specifications used across the platform.'
              : 'Manage operational sites, fleet vehicles, C/O contractors, and automated rate matrices.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadAllData()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {!isSuperAdmin && (
            <>
              {customerTab === 'sites' && (
                <button
                  onClick={() => openSiteModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Site
                </button>
              )}
              {customerTab === 'vehicles' && (
                <button
                  onClick={() => openVehicleModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle
                </button>
              )}
              {customerTab === 'contractors' && (
                <button
                  onClick={() => openContractorModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Contractor
                </button>
              )}
              {customerTab === 'rates' && (
                <button
                  onClick={() => openRateModal()}
                  disabled={sites.length === 0 || vehicleTypes.length === 0 || materialTypes.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Vehicle Type
                </button>
              )}
              {adminTab === 'material-types' && (
                <button
                  onClick={() => openMTypeModal()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
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
              onClick={() => {
                setCustomerTab('sites');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                customerTab === 'sites'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" /> Sites ({sites.length})
            </button>
            <button
              onClick={() => {
                setCustomerTab('vehicles');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                customerTab === 'vehicles'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> Fleet Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => {
                setCustomerTab('contractors');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                customerTab === 'contractors'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" /> Contractors / C/Os ({contractors.length})
            </button>
            <button
              onClick={() => {
                setCustomerTab('rates');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'site-add' ? 'Add New Site' : 'Edit Site'}
            </h2>
            <form onSubmit={handleSiteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Site Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarry Site Alpha"
                  value={siteForm.siteName}
                  onChange={(e) => setSiteForm({ ...siteForm, siteName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore North"
                  value={siteForm.location}
                  onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 560064"
                  value={siteForm.pincode}
                  onChange={(e) => setSiteForm({ ...siteForm, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'vehicle-add' ? 'Register New Fleet Vehicle' : 'Edit Vehicle'}
            </h2>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA-01-EQ-1234"
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono uppercase"
                />
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
                onChange={(val) => setVehicleForm({ ...vehicleForm, vehicleTypeId: val })}
                placeholder="Select Vehicle Category"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'contractor-add' ? 'Add C/O Contractor' : 'Edit Contractor'}
            </h2>
            <form onSubmit={handleContractorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contractor Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaveri Transports"
                  value={contractorForm.name}
                  onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  10-Digit Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9845012345"
                  value={contractorForm.mobile}
                  onChange={(e) =>
                    setContractorForm({ ...contractorForm, mobile: e.target.value.replace(/\D/g, '') })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'rate-add' ? 'Configure Rate Matrix' : 'Update Rate Price'}
            </h2>
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
                    onChange={(val) => setRateForm({ ...rateForm, siteId: val })}
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
                    onChange={(val) => setRateForm({ ...rateForm, vehicleTypeId: val })}
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
                    onChange={(val) => setRateForm({ ...rateForm, materialTypeId: val })}
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
                  Rate Amount (₹ per load)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="3500.00"
                    value={rateForm.amount}
                    onChange={(e) => setRateForm({ ...rateForm, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'vtype-add' ? 'Add Global Vehicle Category' : 'Edit Vehicle Category'}
            </h2>
            <form onSubmit={handleVTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dumper 10-Wheeler"
                  value={vtypeForm.name}
                  onChange={(e) => setVtypeForm({ name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
              onClick={() => setModalMode(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {modalMode === 'mtype-add' ? 'Add Global Material Type' : 'Edit Material Type'}
            </h2>
            <form onSubmit={handleMTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Material Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aggregates 20mm"
                  value={mtypeForm.name}
                  onChange={(e) => setMtypeForm({ name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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
