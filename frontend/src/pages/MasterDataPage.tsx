import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  BookOpen,
  PlusCircle,
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
import { RecordPaymentModal } from '../components/contractors/RecordPaymentModal';
import {
  SiteModal,
  VehicleModal,
  VehicleTypeModal,
  MaterialTypeModal,
  ContractorModal,
  RateModal,
} from '../components/masters';
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
  updateSiteApi,
  deleteVehicleApi,
  deleteVehicleTypeApi,
  deleteMaterialTypeApi,
  deleteContractorApi,
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
    | 'site'
    | 'vehicle'
    | 'vtype'
    | 'mtype'
    | 'contractor'
    | 'rate'
    | null
  >(null);

  const [activeItem, setActiveItem] = useState<any>(null);

  // Contractor Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentContractorId, setPaymentContractorId] = useState<string | undefined>(undefined);

  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

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
    setActiveItem(site || null);
    setModalMode('site');
  };

  const openVehicleModal = (veh?: Vehicle) => {
    setActiveItem(veh || null);
    setModalMode('vehicle');
  };

  const openVTypeModal = (vt?: VehicleType) => {
    setActiveItem(vt || null);
    setModalMode('vtype');
  };

  const openMTypeModal = (mt?: MaterialType) => {
    setActiveItem(mt || null);
    setModalMode('mtype');
  };

  const openContractorModal = (c?: Contractor) => {
    setActiveItem(c || null);
    setModalMode('contractor');
  };

  const openRateModal = (r?: Rate) => {
    setActiveItem(r || null);
    setModalMode('rate');
  };

  // ----------------- DELETE & TOGGLE HANDLERS -----------------
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
              <Card key={site.id} variant="glass" className="space-y-4 hover:border-amber-500/50 transition-all border-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-primary text-base">{site.siteName}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            site.isActive !== false
                              ? 'badge-emerald'
                              : 'badge-amber'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              site.isActive !== false ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          {site.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">{site.location} • {site.pincode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleSiteStatus(site)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        site.isActive !== false
                          ? 'text-secondary hover:text-amber-500 hover:bg-amber-500/10'
                          : 'text-amber-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                      title={site.isActive !== false ? 'Deactivate Site (Hides from Dispatch Picker)' : 'Reactivate Site'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openSiteModal(site)}
                      className="p-1.5 rounded-lg text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Site"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between text-[11px] text-secondary">
                  <span>Configured Rates: <strong className="text-primary">{site._count?.rates || 0}</strong></span>
                  <span>Recorded Loads: <strong className="text-primary">{site._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}

          {sites.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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
              <Card key={veh.id} variant="glass" className="space-y-4 hover:border-amber-500/50 transition-all border-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-primary text-base tracking-wide font-mono">
                        {veh.vehicleNumber}
                      </h3>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full badge-blue text-[11px] font-semibold">
                        {veh.vehicleType?.name || 'Standard'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVehicleModal(veh)}
                      className="p-1.5 rounded-lg text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isSiteBoy && (
                      <button
                        onClick={() => handleDeleteVehicle(veh.id, veh.vehicleNumber)}
                        className="p-1.5 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between text-[11px] text-secondary">
                  <span>Registered: {new Date(veh.createdAt).toLocaleDateString()}</span>
                  <span>Loads: <strong className="text-primary">{veh._count?.loads || 0}</strong></span>
                </div>
              </Card>
            ))}

          {vehicles.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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
              <Card key={vt.id} variant="glass" className="space-y-4 hover:border-amber-500/50 transition-all border-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-base">{vt.name}</h3>
                      <p className="text-xs text-secondary">Vehicle Category</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVTypeModal(vt)}
                      className="p-1.5 rounded-lg text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVType(vt.id, vt.name)}
                      className="p-1.5 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between text-[11px] text-secondary">
                  <span>
                    Fleet Vehicles: <strong className="text-primary">{vt._count?.vehicles || 0}</strong>
                  </span>
                  <span>
                    Active Rates: <strong className="text-primary">{vt._count?.rates || 0}</strong>
                  </span>
                </div>
              </Card>
            ))}

          {vehicleTypes.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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
              <Card key={mt.id} variant="glass" className="space-y-4 hover:border-amber-500/50 transition-all border-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-base">{mt.name}</h3>
                      <p className="text-xs text-secondary">Material Specification</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openMTypeModal(mt)}
                      className="p-1.5 rounded-lg text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Material"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMType(mt.id, mt.name)}
                      className="p-1.5 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-subtle flex items-center justify-between text-[11px] text-secondary">
                  <span>
                    Configured Rates: <strong className="text-primary">{mt._count?.rates || 0}</strong>
                  </span>
                  <span>
                    Recorded Loads: <strong className="text-primary">{mt._count?.loads || 0}</strong>
                  </span>
                </div>
              </Card>
            ))}

          {materialTypes.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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
                (c.mobile && c.mobile.includes(search)),
            )
            .map((c) => (
              <Card key={c.id} variant="glass" className="space-y-4 hover:border-amber-500/50 transition-all border-subtle">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-primary text-base">{c.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-secondary mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <span>{c.mobile ? `+91 ${c.mobile}` : 'No phone linked'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openContractorModal(c)}
                      className="p-1.5 rounded-lg text-secondary hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      title="Edit Contractor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isSiteBoy && (
                      <button
                        onClick={() => handleDeleteContractor(c.id, c.name)}
                        className="p-1.5 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Contractor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-[11px] text-secondary">
                  <span>Loads: <strong className="text-primary">{c._count?.loads || 0}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentContractorId(c.id);
                        setPaymentModalOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg badge-emerald text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Record Payment Collection"
                    >
                      <PlusCircle className="w-3 h-3" /> Record Payment
                    </button>
                    <Link
                      to={`/reports?tab=contractors&contractorId=${c.id}`}
                      className="px-2 py-1 rounded-lg badge-amber text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="View Passbook / Ledger"
                    >
                      <BookOpen className="w-3 h-3" /> Passbook
                    </Link>
                  </div>
                </div>
              </Card>
            ))}

          {contractors.length === 0 && !loading && (
            <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs text-secondary">
                <strong className="text-primary">Automatic Rate Resolution:</strong> Each rate is strictly determined by <span className="text-amber-500 font-bold">Site + Vehicle Type + Material Type</span>.
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
                <Card key={r.id} variant="glass" className="space-y-3 hover:border-amber-500/50 transition-all border-subtle">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                        {r.site?.siteName}
                      </div>
                      <div className="text-base font-extrabold text-primary mt-1">
                        {r.vehicleType?.name}
                      </div>
                      <div className="text-xs text-secondary">
                        Material: <span className="text-primary font-medium">{r.materialType?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-emerald-500">
                        {formatINR(r.amount)}
                      </div>
                      <div className="text-[10px] text-muted uppercase font-medium">per trip / load</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-subtle flex items-center justify-between">
                    <span className="text-[10px] text-muted font-medium">
                      Updated {new Date(r.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openRateModal(r)}
                        className="px-2.5 py-1 rounded-lg bg-surface-solid hover:bg-surface-hover text-xs font-semibold text-primary border border-subtle transition-colors cursor-pointer"
                      >
                        Edit Price
                      </button>
                      <button
                        onClick={() => handleDeleteRate(r.id)}
                        className="p-1.5 rounded-lg text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Rate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}

            {rates.length === 0 && !loading && (
              <div className="col-span-full p-8 text-center bg-surface-solid rounded-3xl border border-subtle text-secondary text-sm">
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

      {/* Modular Shared Master Modals */}
      <SiteModal
        isOpen={modalMode === 'site'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

      <VehicleModal
        isOpen={modalMode === 'vehicle'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

      <VehicleTypeModal
        isOpen={modalMode === 'vtype'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

      <MaterialTypeModal
        isOpen={modalMode === 'mtype'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

      <ContractorModal
        isOpen={modalMode === 'contractor'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

      <RateModal
        isOpen={modalMode === 'rate'}
        onClose={() => setModalMode(null)}
        editItem={activeItem}
      />

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

      {/* Record Contractor Payment Collection Modal */}
      {paymentModalOpen && (
        <RecordPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            void loadAllData(true);
          }}
          initialContractorId={paymentContractorId}
          sites={sites}
          contractors={contractors}
        />
      )}
    </div>
  );
};
