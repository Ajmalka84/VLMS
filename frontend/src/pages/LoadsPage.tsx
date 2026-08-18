import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  PlusCircle,
  History,
  MapPin,
  Layers,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  X,
  CreditCard,
  Banknote,
  Zap,
  Clock,
  Sparkles,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect, CustomSelectOption } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import {
  Site,
  Vehicle,
  MaterialType,
  Contractor,
  Rate,
  getSitesApi,
  getVehiclesApi,
  getMaterialTypesApi,
  getContractorsApi,
  lookupRateApi,
} from '../api/masterData';
import {
  Load,
  PaymentType,
  createLoadApi,
  getLoadsApi,
  updateLoadApi,
  deleteLoadApi,
  LoadsResponse,
} from '../api/loads';

const STORAGE_KEY_SITE = 'vlms_last_siteId';
const STORAGE_KEY_MATERIAL = 'vlms_last_materialId';
const STORAGE_KEY_CONTRACTOR = 'vlms_last_contractorId';
const STORAGE_KEY_RECENT_VEHICLES = 'vlms_recent_vehicle_ids';

export const LoadsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [activeView, setActiveView] = useState<'record' | 'history'>('record');

  // Master Data state
  const [sites, setSites] = useState<Site[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [materials, setMaterials] = useState<MaterialType[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);

  // Form State
  const [siteId, setSiteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [materialTypeId, setMaterialTypeId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('CREDIT');
  const [customAmount, setCustomAmount] = useState('');
  const [isOverride, setIsOverride] = useState(false);

  // Vehicle Fast Search & Recent Shuttle state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [recentVehicleIds, setRecentVehicleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT_VEHICLES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dynamic Rate Lookup state
  const [resolvedRate, setResolvedRate] = useState<Rate | null>(null);
  const [rateLookingUp, setRateLookingUp] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [lastRecordedLoad, setLastRecordedLoad] = useState<Load | null>(null);

  // History / Register State
  const [loadsData, setLoadsData] = useState<LoadsResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterPayment, setFilterPayment] = useState<'' | 'CASH' | 'CREDIT'>('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Edit / Delete Modal State
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const [editForm, setEditForm] = useState<{
    date: string;
    amount: string;
    paymentType: PaymentType;
    contractorId: string;
  }>({ date: '', amount: '', paymentType: 'CREDIT', contractorId: '' });

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Load Master Data & Smart Defaults
  const loadMasterData = async () => {
    setMasterLoading(true);
    try {
      const [sitesRes, vehiclesRes, materialsRes, contractorsRes] = await Promise.all([
        getSitesApi(),
        getVehiclesApi(),
        getMaterialTypesApi(),
        getContractorsApi(),
      ]);
      setSites(sitesRes);
      setVehicles(vehiclesRes);
      setMaterials(materialsRes);
      setContractors(contractorsRes);

      // Smart Defaults:
      // 1. Site: Auto-select if 1 site, else restore sticky
      const savedSite = localStorage.getItem(STORAGE_KEY_SITE);
      if (sitesRes.length === 1) {
        setSiteId(sitesRes[0].id);
      } else if (savedSite && sitesRes.some((s) => s.id === savedSite)) {
        setSiteId(savedSite);
      } else if (sitesRes.length > 0) {
        setSiteId(sitesRes[0].id);
      }

      // 2. Material: Auto-select if 1 material, else restore sticky
      const savedMat = localStorage.getItem(STORAGE_KEY_MATERIAL);
      if (materialsRes.length === 1) {
        setMaterialTypeId(materialsRes[0].id);
      } else if (savedMat && materialsRes.some((m) => m.id === savedMat)) {
        setMaterialTypeId(savedMat);
      } else if (materialsRes.length > 0) {
        setMaterialTypeId(materialsRes[0].id);
      }

      // 3. Contractor: Restore sticky
      const savedCont = localStorage.getItem(STORAGE_KEY_CONTRACTOR);
      if (savedCont && contractorsRes.some((c) => c.id === savedCont)) {
        setContractorId(savedCont);
      } else if (contractorsRes.length > 0) {
        setContractorId(contractorsRes[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load master configuration');
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    void loadMasterData();
  }, []);

  // Update sticky settings on change
  const handleSiteSelect = (id: string) => {
    setSiteId(id);
    localStorage.setItem(STORAGE_KEY_SITE, id);
  };

  const handleMaterialSelect = (id: string) => {
    setMaterialTypeId(id);
    localStorage.setItem(STORAGE_KEY_MATERIAL, id);
  };

  const handleContractorSelect = (id: string) => {
    setContractorId(id);
    localStorage.setItem(STORAGE_KEY_CONTRACTOR, id);
  };

  // Filtered vehicles based on search (last 4 digits or reg text)
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const q = vehicleSearch.trim().toLowerCase();
    return vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(q));
  }, [vehicles, vehicleSearch]);

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId);
  }, [vehicles, vehicleId]);

  // Recent shuttle vehicles objects
  const recentVehiclesList = useMemo(() => {
    return recentVehicleIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => !!v);
  }, [recentVehicleIds, vehicles]);

  // Contractor options for CustomSelect
  const contractorOptions: CustomSelectOption[] = useMemo(() => {
    return contractors.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: `+91 ${c.mobile}`,
      icon: <UserCheck className="w-4 h-4" />,
    }));
  }, [contractors]);

  // Filter Site options
  const filterSiteOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_sites') },
      ...sites.map((s) => ({ value: s.id, label: s.siteName, subLabel: s.location })),
    ];
  }, [sites, t]);

  // Filter Contractor options
  const filterContractorOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_contractors') },
      ...contractors.map((c) => ({ value: c.id, label: c.name, subLabel: `+91 ${c.mobile}` })),
    ];
  }, [contractors, t]);

  // Filter Payment options
  const filterPaymentOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_payments') },
      { value: 'CASH', label: t('cash_only') },
      { value: 'CREDIT', label: t('credit_only') },
    ];
  }, [t]);

  // Live Auto-Rate Resolution
  useEffect(() => {
    if (!siteId || !vehicleId || !materialTypeId) {
      setResolvedRate(null);
      setRateError(null);
      return;
    }

    const selectedVeh = vehicles.find((v) => v.id === vehicleId);
    if (!selectedVeh) return;

    let isMounted = true;
    setRateLookingUp(true);
    setRateError(null);

    lookupRateApi(siteId, selectedVeh.vehicleTypeId, materialTypeId)
      .then((rate) => {
        if (isMounted) {
          setResolvedRate(rate);
          setRateError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setResolvedRate(null);
          setRateError(err.message || t('no_rate_found'));
        }
      })
      .finally(() => {
        if (isMounted) setRateLookingUp(false);
      });

    return () => {
      isMounted = false;
    };
  }, [siteId, vehicleId, materialTypeId, vehicles, t]);

  // Load History fetcher
  const fetchLoadsHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getLoadsApi({
        siteId: filterSite || undefined,
        contractorId: filterContractor || undefined,
        materialTypeId: filterMaterial || undefined,
        paymentType: filterPayment || undefined,
        search: filterSearch.trim() || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        page,
        limit: 20,
      });
      setLoadsData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch loads history');
    } finally {
      setHistoryLoading(false);
    }
  }, [
    filterSite,
    filterContractor,
    filterMaterial,
    filterPayment,
    filterSearch,
    filterStartDate,
    filterEndDate,
    page,
    toast,
  ]);

  useEffect(() => {
    if (activeView === 'history') {
      void fetchLoadsHistory();
    }
  }, [activeView, fetchLoadsHistory]);

  // Record Load Submission
  const handleRecordLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) {
      toast.warning(language === 'ml' ? 'ദയവായി ഒരു സൈറ്റ് തിരഞ്ഞെടുക്കുക' : 'Please select an operational site');
      return;
    }
    if (!vehicleId) {
      toast.warning(language === 'ml' ? 'ദയവായി ഒരു വണ്ടി നമ്പർ തിരഞ്ഞെടുക്കുക' : 'Please select a vehicle');
      return;
    }
    if (!materialTypeId) {
      toast.warning(language === 'ml' ? 'ദയവായി മെറ്റീരിയൽ തിരഞ്ഞെടുക്കുക' : 'Please select material type');
      return;
    }
    if (!contractorId) {
      toast.warning(language === 'ml' ? 'ദയവായി കോൺട്രാക്ടറെ തിരഞ്ഞെടുക്കുക' : 'Please select contractor / C/O');
      return;
    }

    let finalAmountToSend: number | undefined = undefined;
    if (isOverride) {
      const parsed = parseFloat(customAmount);
      if (isNaN(parsed) || parsed <= 0) {
        toast.warning(language === 'ml' ? 'ദയവായി സാധുവായ ഒരു തുക നൽകുക' : 'Please enter a valid override amount greater than 0');
        return;
      }
      finalAmountToSend = parsed;
    } else if (!resolvedRate) {
      toast.error(
        language === 'ml'
          ? 'ഈ കോമ്പിനേഷന് മാസ്റ്റർ റേറ്റിൽ തുകയില്ല. ദയവായി "തുക മാറ്റുക" ക്ലിക്ക് ചെയ്ത് തുക നൽകുക.'
          : 'No rate is configured in Master Data for this combination. Please enable "Custom Override" to enter an amount.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const created = await createLoadApi({
        siteId,
        vehicleId,
        materialTypeId,
        contractorId,
        date,
        paymentType,
        amount: finalAmountToSend,
      });

      setLastRecordedLoad(created);
      toast.success(`${t('load_saved_success')} ${created.vehicle.vehicleNumber}!`);

      // Update Recent Vehicles in state & localStorage
      const updatedRecents = [vehicleId, ...recentVehicleIds.filter((id) => id !== vehicleId)].slice(
        0,
        6
      );
      setRecentVehicleIds(updatedRecents);
      localStorage.setItem(STORAGE_KEY_RECENT_VEHICLES, JSON.stringify(updatedRecents));

      // Reset vehicle & search for next truck, keeping site, material & contractor ready
      setVehicleId('');
      setVehicleSearch('');
      setIsOverride(false);
      setCustomAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record load');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Load
  const handleDeleteLoad = (load: Load) => {
    setConfirmState({
      isOpen: true,
      title: `${t('delete')} Load?`,
      message: `Are you sure you want to remove load entry for vehicle ${load.vehicle?.vehicleNumber} (₹${Number(load.amount).toLocaleString('en-IN')})?`,
      onConfirm: async () => {
        try {
          setConfirmState(null);
          await deleteLoadApi(load.id);
          toast.success(language === 'ml' ? 'ലോഡ് വിജയകരമായി ഡിലീറ്റ് ചെയ്തു' : 'Load entry removed');
          void fetchLoadsHistory();
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
        }
      },
    });
  };

  // Edit Load
  const openEditModal = (load: Load) => {
    setEditLoad(load);
    setEditForm({
      date: load.date.split('T')[0],
      amount: String(load.amount),
      paymentType: load.paymentType,
      contractorId: load.contractorId,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLoad) return;
    try {
      setSubmitting(true);
      await updateLoadApi(editLoad.id, {
        date: editForm.date,
        amount: parseFloat(editForm.amount),
        paymentType: editForm.paymentType,
        contractorId: editForm.contractorId,
      });
      setEditLoad(null);
      toast.success(language === 'ml' ? 'ലോഡ് വിവരങ്ങൾ അപ്‌ഡേറ്റ് ചെയ്തു' : 'Load entry updated successfully!');
      void fetchLoadsHistory();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {t('load_management_title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t('load_management_sub')}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveView('record')}
            id="view-record-tab"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'record'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> {t('quick_entry')}
          </button>
          <button
            onClick={() => setActiveView('history')}
            id="view-history-tab"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeView === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> {t('load_register')} ({loadsData?.total ?? 0})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/*              VIEW 1: ULTIMATE SUPERVISOR DISPATCH COCKPIT                */}
      {/* ========================================================================= */}
      {activeView === 'record' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Supervisor Dispatch Cockpit */}
          <form
            onSubmit={handleRecordLoad}
            className="lg:col-span-2 space-y-6 bg-slate-900/40 p-5 sm:p-7 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-md"
          >
            {/* Context Bar: Site Chips + Date Pill */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {t('select_site')} <span className="text-amber-400">*</span>
                </label>
                {sites.length === 1 && (
                  <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {language === 'ml' ? 'ഓട്ടോ സെലക്ട്' : 'Single Site Active'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => handleSiteSelect(site.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      siteId === site.id
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        siteId === site.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {site.siteName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{site.location}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Selector: Search + Recent Shuttles + Tappable Chips */}
            <div className="space-y-3 p-4 rounded-3xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> {t('select_vehicle')} <span className="text-amber-400">*</span>
                </label>
                {selectedVehicle && (
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {selectedVehicle.vehicleNumber} ({selectedVehicle.vehicleType?.name})
                  </span>
                )}
              </div>

              {/* Recent Shuttle Trucks (1-Tap Fast Selection) */}
              {recentVehiclesList.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <Clock className="w-3 h-3 text-amber-400" /> {t('recent_trucks')}:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentVehiclesList.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleId(v.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                          vehicleId === v.id
                            ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5 text-blue-400" />
                        {v.vehicleNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4-Digit Quick Vehicle Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('search_vehicle_ph')}
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Vehicle Selection Chips Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredVehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleId(v.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      vehicleId === v.id
                        ? 'bg-blue-500/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          vehicleId === v.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-mono font-extrabold text-white tracking-wide">
                          {v.vehicleNumber}
                        </div>
                        <div className="text-[11px] text-blue-400 font-semibold">
                          {v.vehicleType?.name || 'Standard'}
                        </div>
                      </div>
                    </div>
                    {vehicleId === v.id && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mr-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Type Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('select_material')} <span className="text-amber-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMaterialSelect(m.id)}
                    className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      materialTypeId === m.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contractor Selector using CustomSelect Dropdown */}
            <div className="space-y-2">
              <CustomSelect
                label={t('select_contractor')}
                required
                options={contractorOptions}
                value={contractorId}
                onChange={handleContractorSelect}
                placeholder={t('select_contractor_ph')}
                searchPlaceholder={t('all_contractors')}
              />
            </div>

            {/* Payment Terms Big 52px Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t('payment_terms')} <span className="text-amber-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('CREDIT')}
                  className={`py-3.5 px-4 rounded-2xl border text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    paymentType === 'CREDIT'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  {t('credit')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('CASH')}
                  className={`py-3.5 px-4 rounded-2xl border text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    paymentType === 'CASH'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  {t('cash')}
                </button>
              </div>
            </div>

            {/* Compact Date Row */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>
                  {t('dispatch_date')}:{' '}
                  <strong className="text-white">
                    {date === new Date().toISOString().split('T')[0]
                      ? `${t('today')} (${new Date(date).toLocaleDateString()})`
                      : new Date(date).toLocaleDateString()}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
              >
                {showDatePicker ? t('cancel') : t('change_date')}
              </button>
            </div>

            {showDatePicker && (
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 animate-fade-in">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Live Dynamic Rate Display & Override HUD */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase">
                  {t('trip_rate')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsOverride(!isOverride)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
                >
                  {isOverride ? t('use_auto_rate') : t('custom_override')}
                </button>
              </div>

              {!isOverride ? (
                <div className="flex items-center justify-between">
                  <div>
                    {rateLookingUp ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        {t('resolving_rate')}
                      </span>
                    ) : resolvedRate ? (
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                          ₹{Number(resolvedRate.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t('auto_resolved_from_matrix')} ({resolvedRate.vehicleType.name} + {resolvedRate.materialType.name})
                        </div>
                      </div>
                    ) : rateError ? (
                      <div className="text-xs text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{rateError}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {language === 'ml'
                          ? 'വണ്ടി, മെറ്റീരിയൽ എന്നിവ തിരഞ്ഞെടുത്താൽ റേറ്റ് കാണിക്കും'
                          : 'Select Vehicle & Material to calculate rate'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="block text-[11px] text-amber-300 font-semibold">
                    {t('enter_override_amount')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="e.g. 3800.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/50 text-base font-bold text-emerald-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Big 56px Dispatch Button */}
            <button
              type="submit"
              disabled={submitting}
              id="record-load-submit-btn"
              className="w-full py-4 sm:py-4.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-extrabold text-base tracking-wide shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> {t('recording_load_progress')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> {t('record_load_btn')}
                </>
              )}
            </button>
          </form>

          {/* Right Col: Live Summary & Last Recorded Load */}
          <div className="space-y-4">
            {/* Last Entry Card */}
            {lastRecordedLoad ? (
              <Card variant="highlight" className="p-5 space-y-3.5 border-emerald-500/40 bg-emerald-950/20 animate-fade-in">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> {t('last_recorded_truck')}
                </div>
                <div className="space-y-1">
                  <div className="text-xl font-extrabold text-white font-mono">
                    {lastRecordedLoad.vehicle?.vehicleNumber}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    {lastRecordedLoad.contractor?.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {lastRecordedLoad.materialType?.name} • {lastRecordedLoad.site?.siteName}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                      lastRecordedLoad.paymentType === 'CASH'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {lastRecordedLoad.paymentType}
                  </span>
                  <div className="text-base font-extrabold text-emerald-400">
                    ₹{Number(lastRecordedLoad.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </Card>
            ) : (
              <Card variant="glass" className="p-5 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'ml' ? 'ലോഡ് എൻട്രിക്ക് തയ്യാറാണ്' : 'Ready for Dispatch'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ml'
                    ? 'വണ്ടി നമ്പർ, മെറ്റീരിയൽ, കോൺട്രാക്ടർ എന്നിവ നൽകി ലോഡ് സേവ് ചെയ്യുക.'
                    : 'Select vehicle, material, and contractor to log truck dispatch in real time.'}
                </p>
              </Card>
            )}

            {/* Quick Tips */}
            <Card variant="glass" className="p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> {language === 'ml' ? 'പ്രധാന വിവരങ്ങൾ' : 'Quick Entry Guide'}
              </h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  {language === 'ml'
                    ? 'സൈറ്റും മെറ്റീരിയലും തനിയെ തിരഞ്ഞെടുക്കപ്പെടും.'
                    : 'Site and material stay sticky for fast repeat dispatches.'}
                </li>
                <li>
                  {language === 'ml'
                    ? 'വണ്ടി നമ്പറിന്റെ അവസാന 4 അക്കങ്ങൾ അടിച്ചാൽ വണ്ടി പെട്ടെന്ന് കണ്ടെത്താം.'
                    : 'Type last 4 digits of vehicle number to find trucks instantly.'}
                </li>
                <li>
                  {language === 'ml'
                    ? 'വാടക തുക മാറ്റാൻ "തുക മാറ്റുക" ക്ലിക്ക് ചെയ്യുക.'
                    : 'Use "Custom Override" for on-site negotiated special rates.'}
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*                        VIEW 2: LOAD REGISTER & HISTORY                   */}
      {/* ========================================================================= */}
      {activeView === 'history' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="glass" className="p-4 sm:p-5">
              <div className="text-xs font-semibold text-slate-400">{t('total_loads')}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {loadsData?.summary.totalLoads ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{t('dispatches')}</div>
            </Card>

            <Card variant="glass" className="p-4 sm:p-5">
              <div className="text-xs font-semibold text-emerald-400">{t('total_turnover')}</div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1 truncate">
                ₹{(loadsData?.summary.totalAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{language === 'ml' ? 'ആകെ വാടക' : 'Total Revenue'}</div>
            </Card>

            <Card variant="glass" className="p-4 sm:p-5">
              <div className="text-xs font-semibold text-blue-400">{t('cash_volume')}</div>
              <div className="text-xl sm:text-2xl font-extrabold text-blue-400 mt-1 truncate">
                ₹{(loadsData?.summary.totalCashAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{loadsData?.summary.cashCount ?? 0} {t('cash')}</div>
            </Card>

            <Card variant="glass" className="p-4 sm:p-5">
              <div className="text-xs font-semibold text-amber-400">{t('credit_outstanding')}</div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-1 truncate">
                ₹{(loadsData?.summary.totalCreditAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{loadsData?.summary.creditCount ?? 0} {t('credit')}</div>
            </Card>
          </div>

          {/* Filter Toolbar with CustomSelect Components */}
          <Card variant="glass" className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('search_loads_ph')}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Filter Site with CustomSelect */}
              <CustomSelect
                options={filterSiteOptions}
                value={filterSite}
                onChange={setFilterSite}
                placeholder={t('all_sites')}
              />

              {/* Filter Contractor with CustomSelect */}
              <CustomSelect
                options={filterContractorOptions}
                value={filterContractor}
                onChange={setFilterContractor}
                placeholder={t('all_contractors')}
              />

              {/* Filter Payment with CustomSelect */}
              <CustomSelect
                options={filterPaymentOptions}
                value={filterPayment}
                onChange={(val) => setFilterPayment(val as any)}
                placeholder={t('all_payments')}
                searchable={false}
              />
            </div>
          </Card>

          {/* Load History List */}
          <div className="space-y-3">
            {historyLoading ? (
              <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
                <span>{language === 'ml' ? 'ലോഡുകൾ ലഭ്യമാക്കുന്നു...' : 'Loading dispatches...'}</span>
              </div>
            ) : loadsData?.loads.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400 text-sm">
                {t('no_loads_found')}
              </div>
            ) : (
              loadsData?.loads.map((load) => (
                <Card
                  key={load.id}
                  variant="glass"
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-white font-mono text-base sm:text-lg tracking-wide">
                          {load.vehicle?.vehicleNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            load.paymentType === 'CASH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {load.paymentType === 'CASH' ? t('cash') : t('credit')}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {load.vehicle?.vehicleType?.name}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-semibold mt-1">
                        {load.contractor?.name} • <span className="text-slate-400">{load.materialType?.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t('select_site')}: {load.site?.siteName} • {t('dispatch_date')}: {new Date(load.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
                        ₹{Number(load.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">{t('per_trip')}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(load)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLoad(load)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*                                EDIT MODAL                                 */}
      {/* ========================================================================= */}
      {editLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative">
            <button
              onClick={() => setEditLoad(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">
              {t('edit')} Load: {editLoad.vehicle?.vehicleNumber}
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <CustomSelect
                label={t('select_contractor')}
                required
                options={contractorOptions}
                value={editForm.contractorId}
                onChange={(val) => setEditForm({ ...editForm, contractorId: val })}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('trip_rate')} (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <CustomSelect
                label={t('payment_terms')}
                required
                searchable={false}
                options={[
                  { value: 'CREDIT', label: t('credit') },
                  { value: 'CASH', label: t('cash') },
                ]}
                value={editForm.paymentType}
                onChange={(val) =>
                  setEditForm({ ...editForm, paymentType: val as PaymentType })
                }
              />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('dispatch_date')}
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditLoad(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  {submitting ? t('recording_load_progress') : t('save')}
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
          confirmText={t('delete')}
          variant="danger"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
