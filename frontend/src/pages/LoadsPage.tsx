import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck,
  PlusCircle,
  Plus,
  History,
  MapPin,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  Zap,
  UserCheck,
  Download,
  Coins,
} from 'lucide-react';
import {
  Button,
  Input,
  DateInput,
  CustomSelect,
  CustomSelectOption,
  Badge,
  Modal,
  TabBar,
  Card,
  PageHeader,
  MetricCard,
  FilterBar,
  ConfirmModal,
  EmptyState,
  Pagination,
} from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useMasterCache } from '../context/MasterCacheContext';
import {
  SiteModal,
  VehicleModal,
  MaterialTypeModal,
  ContractorModal,
  RateModal,
} from '../components/masters';
import { useDebounce } from '../hooks/useDebounce';
import { useFilterState } from '../hooks/useFilterState';
import { formatINR, formatShortDate } from '../utils/formatters';
import {
  Site,
  Vehicle,
  MaterialType,
  Contractor,
  Rate,
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
import { exportToCsv } from '../utils/csvExporter';
import { queryCache } from '../utils/queryCache';

const STORAGE_KEY_SITE = 'vlms_last_siteId';
const STORAGE_KEY_MATERIAL = 'vlms_last_materialId';
const STORAGE_KEY_CONTRACTOR = 'vlms_last_contractorId';
const STORAGE_KEY_RECENT_VEHICLES = 'vlms_recent_vehicle_ids';

export const LoadsPage: React.FC = () => {
  const { user } = useAuth();
  const isSiteBoy = user?.role === 'SITE_BOY';
  const isCoPartner = user?.role === 'CO_PARTNER';
  const { t, language } = useLanguage();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || searchParams.get('view');
  const [activeView, setActiveView] = useState<'record' | 'history'>(() => {
    if (isCoPartner) return 'history';
    return tabParam === 'history' || tabParam === 'register' ? 'history' : 'record';
  });

  // Sync with searchParams if url query changes
  useEffect(() => {
    if (isCoPartner) {
      if (activeView !== 'history') setActiveView('history');
      return;
    }
    const currentTab = searchParams.get('tab') || searchParams.get('view');
    if (currentTab === 'history' || currentTab === 'register') {
      setActiveView('history');
    } else if (currentTab === 'record' || currentTab === 'entry') {
      setActiveView('record');
    }
  }, [searchParams, isCoPartner, activeView]);

  // Master Cache Context
  const {
    sites,
    vehicles,
    materials,
    contractors,
    resolveRate,
    isLoading: masterLoading,
    isInitialized,
    refreshMasterData,
  } = useMasterCache();

  // Form State
  const [siteId, setSiteId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [materialTypeId, setMaterialTypeId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>('CREDIT');
  const [customAmount, setCustomAmount] = useState('');
  const [isOverride, setIsOverride] = useState(false);

  // Vehicle Fast Search & Recent Shuttle state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const debouncedVehicleSearch = useDebounce(vehicleSearch, 150);

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

  // In-Place Master Creation Modal States
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAddContractorModal, setShowAddContractorModal] = useState(false);
  const [showSetRateModal, setShowSetRateModal] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [lastRecordedLoad, setLastRecordedLoad] = useState<Load | null>(null);

  // History / Register State with useFilterState & SWR Cache
  const [totalLoadsCount, setTotalLoadsCount] = useState<number>(() => {
    const cached = queryCache.get<LoadsResponse>('loads_history_latest');
    return cached?.total ?? 0;
  });
  const [loadsData, setLoadsData] = useState<LoadsResponse | null>(() => {
    return queryCache.get<LoadsResponse>('loads_history_latest') || null;
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterSite, setFilterSite] = useState('');
  const [filterContractor, setFilterContractor] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterPayment, setFilterPayment] = useState<'' | 'CASH' | 'CREDIT'>('');
  const historyFilter = useFilterState({ defaultPreset: 'all', debounceMs: 200 });

  // Edit / Delete Modal State
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
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

  // Smart Defaults Setup from Cache
  useEffect(() => {
    const activeSites = sites.filter((s) => s.isActive !== false);
    if (!isInitialized || activeSites.length === 0) return;

    // 1. Site: Auto-select if Site Boy or 1 site, else restore sticky
    if (isSiteBoy && user?.assignedSiteId) {
      setSiteId(user.assignedSiteId);
      setFilterSite(user.assignedSiteId);
    } else {
      const savedSite = localStorage.getItem(STORAGE_KEY_SITE);
      if (activeSites.length === 1) {
        setSiteId(activeSites[0].id);
      } else if (savedSite && activeSites.some((s) => s.id === savedSite)) {
        setSiteId(savedSite);
      } else if (!siteId && activeSites.length > 0) {
        setSiteId(activeSites[0].id);
      }
    }

    // 2. Material: Auto-select if 1 material, else restore sticky
    const savedMat = localStorage.getItem(STORAGE_KEY_MATERIAL);
    if (materials.length === 1) {
      setMaterialTypeId(materials[0].id);
    } else if (savedMat && materials.some((m) => m.id === savedMat)) {
      setMaterialTypeId(savedMat);
    } else if (!materialTypeId && materials.length > 0) {
      setMaterialTypeId(materials[0].id);
    }

    // 3. Contractor: Restore sticky
    const savedCont = localStorage.getItem(STORAGE_KEY_CONTRACTOR);
    if (savedCont && contractors.some((c) => c.id === savedCont)) {
      setContractorId(savedCont);
    } else if (!contractorId && contractors.length > 0) {
      setContractorId(contractors[0].id);
    }
  }, [isInitialized, sites, materials, contractors, isSiteBoy, user]);

  // Update sticky settings on change
  const handleSiteSelect = (id: string) => {
    setSiteId(id);
    localStorage.setItem(STORAGE_KEY_SITE, id);
  };

  const handleVehicleSelect = (id: string) => {
    setVehicleId(id);
    if (contractors.length > 0) {
      const recentWithVeh = loadsData?.loads.find((l) => l.vehicleId === id && l.contractorId);
      if (recentWithVeh?.contractorId && contractors.some((c) => c.id === recentWithVeh.contractorId)) {
        setContractorId(recentWithVeh.contractorId);
      }
    }
  };

  const handleMaterialSelect = (id: string) => {
    setMaterialTypeId(id);
    localStorage.setItem(STORAGE_KEY_MATERIAL, id);
  };

  const handleContractorSelect = (id: string) => {
    setContractorId(id);
    localStorage.setItem(STORAGE_KEY_CONTRACTOR, id);
  };

  // Filtered vehicles based on debounced search
  const filteredVehicles = useMemo(() => {
    if (!debouncedVehicleSearch.trim()) return vehicles;
    const q = debouncedVehicleSearch.trim().toLowerCase();
    return vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(q));
  }, [vehicles, debouncedVehicleSearch]);

  // Selected vehicle object
  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === vehicleId);
  }, [vehicles, vehicleId]);

  // Recent shuttle vehicles objects (combines stored IDs with recent database loads)
  const recentVehiclesList = useMemo(() => {
    const explicitIds = new Set(recentVehicleIds);
    const historyIds = (loadsData?.loads || []).map((l) => l.vehicleId).filter(Boolean);
    const combinedIds: string[] = [...recentVehicleIds];
    for (const hId of historyIds) {
      if (!explicitIds.has(hId) && combinedIds.length < 6) {
        combinedIds.push(hId);
      }
    }
    return combinedIds
      .map((id) => vehicles.find((v) => v.id === id))
      .filter((v): v is Vehicle => !!v);
  }, [recentVehicleIds, loadsData?.loads, vehicles]);

  // Contractor options for CustomSelect
  const contractorOptions: CustomSelectOption[] = useMemo(() => {
    return [
      {
        value: '',
        label: language === 'ml' ? 'നേരിട്ടുള്ള വില്പന (Direct / Spot Cash)' : 'Direct / Spot Cash Sale (Walk-in)',
        subLabel: language === 'ml' ? 'കരാറുകാരനില്ലാത്ത നേരിട്ടുള്ള കച്ചവടം' : 'Unregistered Cash Buyer',
        icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
      },
      ...contractors.map((c) => ({
        value: c.id,
        label: c.name,
        subLabel: c.mobile ? `+91 ${c.mobile}` : undefined,
        icon: <UserCheck className="w-4 h-4 text-muted" />,
      })),
    ];
  }, [contractors, language]);

  // Site options for CustomSelect
  const siteOptions: CustomSelectOption[] = useMemo(() => {
    return sites
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        value: s.id,
        label: s.siteName,
        subLabel: s.location,
        icon: <MapPin className="w-4 h-4 text-amber-500" />,
      }));
  }, [sites]);

  // Material options for CustomSelect
  const materialOptions: CustomSelectOption[] = useMemo(() => {
    return materials.map((m) => ({
      value: m.id,
      label: m.name,
      icon: <Layers className="w-4 h-4 text-amber-500" />,
    }));
  }, [materials]);

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
      { value: 'direct', label: language === 'ml' ? 'നേരിട്ടുള്ള വില്പന (Direct Sale)' : 'Direct / Walk-in Sale' },
      ...contractors.map((c) => ({
        value: c.id,
        label: c.name,
        subLabel: c.mobile ? `+91 ${c.mobile}` : undefined,
      })),
    ];
  }, [contractors, language, t]);

  // Filter Material options
  const filterMaterialOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: language === 'ml' ? 'എല്ലാ മെറ്റീരിയലുകളും' : 'All Materials' },
      ...materials.map((m) => ({ value: m.id, label: m.name })),
    ];
  }, [materials, language]);

  // Filter Payment options
  const filterPaymentOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_payments') },
      { value: 'CASH', label: t('cash_only') },
      { value: 'CREDIT', label: t('credit_only') },
    ];
  }, [t]);

  // Edit Modal Payment options
  const editPaymentOptions: CustomSelectOption[] = useMemo(() => [
    { value: 'CREDIT', label: t('credit') },
    { value: 'CASH', label: t('cash') },
  ], [t]);

  // Live Auto-Rate Resolution (0ms Instant Cache Resolver)
  useEffect(() => {
    if (!siteId || !vehicleId || !materialTypeId) {
      setResolvedRate(null);
      setRateError(null);
      return;
    }

    const selectedVeh = vehicles.find((v) => v.id === vehicleId);
    if (!selectedVeh) return;

    // 1. Instant 0ms In-Memory Cache Lookup
    const cachedRate = resolveRate(siteId, selectedVeh.vehicleTypeId, materialTypeId);
    if (cachedRate) {
      setResolvedRate(cachedRate);
      setRateError(null);
      setRateLookingUp(false);
      return;
    }

    // 2. Fallback to API if not in client cache
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
  }, [siteId, vehicleId, materialTypeId, vehicles, resolveRate, t]);

  const activeRequestId = useRef(0);

  // Background initial fetch of total load count on mount
  useEffect(() => {
    let isCancelled = false;
    const initialSiteId = isSiteBoy && user?.assignedSiteId ? user.assignedSiteId : undefined;
    getLoadsApi({ siteId: initialSiteId, page: 1, limit: 20 })
      .then((res) => {
        if (!isCancelled) {
          setTotalLoadsCount(res.total);
          queryCache.set('loads_history_latest', res);
          setLoadsData(res);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [isSiteBoy, user?.assignedSiteId]);

  // Load History fetcher with useFilterState
  const fetchLoadsHistory = useCallback(async () => {
    const requestId = ++activeRequestId.current;
    setHistoryLoading(true);
    const targetSiteId = filterSite || (isSiteBoy && user?.assignedSiteId ? user.assignedSiteId : undefined);
    try {
      const res = await getLoadsApi({
        siteId: targetSiteId || undefined,
        contractorId: filterContractor || undefined,
        materialTypeId: filterMaterial || undefined,
        paymentType: filterPayment || undefined,
        search: historyFilter.debouncedSearch.trim() || undefined,
        startDate: historyFilter.startDate || undefined,
        endDate: historyFilter.endDate || undefined,
        page: historyFilter.page,
        limit: 20,
      });
      if (requestId === activeRequestId.current) {
        setLoadsData(res);
        setTotalLoadsCount(res.total);
        queryCache.set('loads_history_latest', res);
      }
    } catch (err: any) {
      if (requestId === activeRequestId.current) {
        toast.error(err.message || 'Failed to fetch loads history');
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setHistoryLoading(false);
      }
    }
  }, [
    filterSite,
    filterContractor,
    filterMaterial,
    filterPayment,
    historyFilter.debouncedSearch,
    historyFilter.startDate,
    historyFilter.endDate,
    historyFilter.page,
    isSiteBoy,
    user?.assignedSiteId,
    toast,
  ]);

  useEffect(() => {
    if (activeView === 'history') {
      void fetchLoadsHistory();
    }
  }, [activeView, fetchLoadsHistory]);

  // Export Loads History to Excel / CSV with Custom Dates
  const handleExportLoadsCSV = async () => {
    try {
      toast.info(language === 'ml' ? 'ഡൗൺലോഡിനായി ലോഡുകൾ എടുക്കുന്നു...' : 'Fetching load ledger for export...');
      const res = await getLoadsApi({
        siteId: filterSite || undefined,
        contractorId: filterContractor || undefined,
        materialTypeId: filterMaterial || undefined,
        paymentType: filterPayment || undefined,
        search: historyFilter.search.trim() || undefined,
        startDate: historyFilter.startDate || undefined,
        endDate: historyFilter.endDate || undefined,
        page: 1,
        limit: 5000,
      });

      if (res.loads.length === 0) {
        toast.warning(language === 'ml' ? 'എക്സ്പോർട്ട് ചെയ്യാൻ ലോഡുകളൊന്നുമില്ല' : 'No load records to export');
        return;
      }

      const headers = [
        '#',
        'Date',
        'Time',
        'Vehicle Number',
        'Vehicle Type',
        'Material',
        'Contractor (C/O)',
        'Quarry Site',
        'Payment Mode',
        'Amount (INR)',
        'Remarks',
      ];

      const rows: (string | number)[][] = res.loads.map((l, idx) => [
        idx + 1,
        new Date(l.date).toLocaleDateString('en-IN'),
        new Date(l.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        l.vehicle.vehicleNumber,
        l.vehicle.vehicleType.name,
        l.materialType.name,
        l.contractor ? l.contractor.name : 'Direct / Walk-in Sale',
        l.site.siteName,
        l.paymentType,
        l.amount,
        l.remarks || '',
      ]);

      const dateSuffix = historyFilter.startDate && historyFilter.endDate
        ? `${historyFilter.startDate}_to_${historyFilter.endDate}`
        : historyFilter.startDate
        ? `from_${historyFilter.startDate}`
        : 'All_Time';

      exportToCsv(
        `Loads_Ledger_${dateSuffix}_${new Date().toISOString().split('T')[0]}`,
        headers,
        rows
      );
      toast.success(language === 'ml' ? 'ലോഡ് ലെഡ്ജർ എക്സ്പോർട്ട് പൂർത്തിയായി!' : 'Loads Ledger exported to CSV/Excel successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export load register');
    }
  };

  // High-Speed Optimistic Record Load Submission
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

    const currentVeh = vehicles.find((v) => v.id === vehicleId);
    const currentMat = materials.find((m) => m.id === materialTypeId);
    const currentSite = sites.find((s) => s.id === siteId);
    const currentCont = contractorId ? contractors.find((c) => c.id === contractorId) : null;
    const finalAmount = finalAmountToSend ?? (resolvedRate ? Number(resolvedRate.amount) : 0);

    // 1. Construct Optimistic Load Entry for Instant UI feedback (<10ms)
    const optimisticLoad: Load = {
      id: `temp-${Date.now()}`,
      siteId,
      vehicleId,
      materialTypeId,
      contractorId: contractorId || null,
      date,
      rateId: resolvedRate?.id || 'manual',
      amount: finalAmount,
      paymentType,
      remarks: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      site: currentSite as Site,
      vehicle: currentVeh as Vehicle,
      materialType: currentMat as MaterialType,
      contractor: currentCont || null,
      rate: (resolvedRate as Rate) || ({
        id: 'manual',
        siteId,
        vehicleTypeId: currentVeh?.vehicleTypeId || '',
        materialTypeId,
        amount: finalAmount,
        site: currentSite as Site,
        vehicleType: currentVeh?.vehicleType as any,
        materialType: currentMat as MaterialType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Rate),
    };

    // Instant Visual Confirmation
    setLastRecordedLoad(optimisticLoad);
    toast.success(`${t('load_saved_success')} ${currentVeh?.vehicleNumber || ''}!`);

    // Update Recent Vehicles immediately
    const updatedRecents = [vehicleId, ...recentVehicleIds.filter((id) => id !== vehicleId)].slice(0, 6);
    setRecentVehicleIds(updatedRecents);
    localStorage.setItem(STORAGE_KEY_RECENT_VEHICLES, JSON.stringify(updatedRecents));

    // Reset cockpit input immediately so operator is ready for next truck
    const savedVehicleId = vehicleId;
    setVehicleId('');
    setVehicleSearch('');
    setIsOverride(false);
    setCustomAmount('');

    setSubmitting(true);

    try {
      const created = await createLoadApi({
        siteId,
        vehicleId: savedVehicleId,
        materialTypeId,
        contractorId: contractorId ? contractorId : undefined,
        date,
        paymentType,
        amount: finalAmountToSend,
      });

      // Update real created entity
      setLastRecordedLoad(created);
      setTotalLoadsCount((prev) => prev + 1);
      setLoadsData((prev) => {
        if (!prev) {
          return {
            loads: [created],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            summary: {
              totalLoads: 1,
              totalAmount: Number(created.amount) || 0,
              totalCashAmount: created.paymentType === 'CASH' ? (Number(created.amount) || 0) : 0,
              totalCreditAmount: created.paymentType === 'CREDIT' ? (Number(created.amount) || 0) : 0,
              cashCount: created.paymentType === 'CASH' ? 1 : 0,
              creditCount: created.paymentType === 'CREDIT' ? 1 : 0,
            },
          };
        }
        const updatedLoads = [created, ...prev.loads.filter((l) => l.id !== created.id)];
        const amt = Number(created.amount) || 0;
        return {
          ...prev,
          loads: updatedLoads,
          total: prev.total + 1,
          summary: prev.summary
            ? {
                ...prev.summary,
                totalLoads: prev.summary.totalLoads + 1,
                totalAmount: prev.summary.totalAmount + amt,
                totalCashAmount:
                  prev.summary.totalCashAmount + (created.paymentType === 'CASH' ? amt : 0),
                totalCreditAmount:
                  prev.summary.totalCreditAmount + (created.paymentType === 'CREDIT' ? amt : 0),
                cashCount: prev.summary.cashCount + (created.paymentType === 'CASH' ? 1 : 0),
                creditCount: prev.summary.creditCount + (created.paymentType === 'CREDIT' ? 1 : 0),
              }
            : prev.summary,
        };
      });
      queryCache.invalidate('dashboard_');
      queryCache.invalidate('rep_');
      if (activeView === 'history') {
        void fetchLoadsHistory();
      }
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
          const loadIdToDelete = load.id;
          setConfirmState(null);
          await deleteLoadApi(loadIdToDelete);
          queryCache.invalidate('dashboard_');
          queryCache.invalidate('rep_');

          // Optimistically remove from local state immediately
          setTotalLoadsCount((prev) => Math.max(0, prev - 1));
          setLoadsData((prev) => {
            if (!prev) return prev;
            const amt = Number(load.amount);
            return {
              ...prev,
              total: Math.max(0, prev.total - 1),
              loads: prev.loads.filter((l) => l.id !== loadIdToDelete),
              summary: {
                ...prev.summary,
                totalLoads: Math.max(0, prev.summary.totalLoads - 1),
                totalAmount: Math.max(0, prev.summary.totalAmount - amt),
                totalCashAmount:
                  load.paymentType === 'CASH'
                    ? Math.max(0, prev.summary.totalCashAmount - amt)
                    : prev.summary.totalCashAmount,
                totalCreditAmount:
                  load.paymentType === 'CREDIT'
                    ? Math.max(0, prev.summary.totalCreditAmount - amt)
                    : prev.summary.totalCreditAmount,
                cashCount:
                  load.paymentType === 'CASH'
                    ? Math.max(0, prev.summary.cashCount - 1)
                    : prev.summary.cashCount,
                creditCount:
                  load.paymentType === 'CREDIT'
                    ? Math.max(0, prev.summary.creditCount - 1)
                    : prev.summary.creditCount,
              },
            };
          });

          toast.success(language === 'ml' ? 'ലോഡ് വിജയകരമായി ഡിലീറ്റ് ചെയ്തു' : 'Load entry removed');
        } catch (err: any) {
          toast.error(err.message || 'Delete failed');
        }
      },
    });
  };

  // Edit Load
  const openEditModal = (load: Load) => {
    setEditError(null);
    setEditLoad(load);
    setEditForm({
      date: load.date.split('T')[0],
      amount: String(load.amount),
      paymentType: load.paymentType,
      contractorId: load.contractorId || '',
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editLoad) return;

    const amt = parseFloat(editForm.amount);
    if (isNaN(amt) || amt <= 0) {
      const msg = 'Please enter a valid trip amount greater than 0';
      setEditError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      const updated = await updateLoadApi(editLoad.id, {
        date: editForm.date,
        amount: amt,
        paymentType: editForm.paymentType,
        contractorId: editForm.contractorId || null,
      });
      queryCache.invalidate('dashboard_');
      queryCache.invalidate('rep_');

      // Optimistically update local loadsData list
      setLoadsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          loads: prev.loads.map((l) => (l.id === updated.id ? updated : l)),
        };
      });

      setEditLoad(null);
      setEditError(null);
      toast.success(language === 'ml' ? 'ലോഡ് വിവരങ്ങൾ അപ്‌ഡേറ്റ് ചെയ്തു' : 'Load entry updated successfully!');
    } catch (err: any) {
      const msg = err.message || 'Update failed';
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('load_management_title')}
          icon={<Truck className="w-5 h-5 text-amber-500" />}
          className="p-0 border-0 bg-transparent"
        />

        {!isCoPartner && (
          <TabBar
            activeTab={activeView}
            onChange={(tabId) => {
              setActiveView(tabId as 'record' | 'history');
              setSearchParams({ tab: tabId }, { replace: true });
            }}
            tabs={[
              {
                id: 'record',
                buttonId: 'view-record-tab',
                label: t('quick_entry'),
                icon: PlusCircle,
              },
              {
                id: 'history',
                buttonId: 'view-history-tab',
                label: `${t('load_register')}`,
                badge: totalLoadsCount,
                icon: History,
              },
            ]}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/*              VIEW 1: ULTIMATE SUPERVISOR DISPATCH COCKPIT                */}
      {/* ========================================================================= */}
      {activeView === 'record' && !isCoPartner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Supervisor Dispatch Cockpit Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card variant="glass" className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleRecordLoad} className="space-y-6">
                {/* 1. Operational Site Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      {t('site')} <span className="text-rose-500">*</span>
                    </label>
                    {!isSiteBoy && (
                      <button
                        type="button"
                        onClick={() => setShowAddSiteModal(true)}
                        className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'ml' ? 'പുതിയ സൈറ്റ്' : 'New Site'}
                      </button>
                    )}
                  </div>
                  <CustomSelect
                    options={siteOptions}
                    value={siteId}
                    onChange={handleSiteSelect}
                    placeholder={t('select_site')}
                    disabled={isSiteBoy && !!user?.assignedSiteId}
                    searchable
                  />
                </div>

                {/* 2. Fast Vehicle Selection with Search & Quick Shuttle Chips */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-500" />
                      {t('vehicle_no')} <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddVehicleModal(true)}
                      className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> {language === 'ml' ? 'പുതിയ വണ്ടി' : 'New Vehicle'}
                    </button>
                  </div>

                  {/* Vehicle Search Box */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                    <input
                      type="text"
                      placeholder={language === 'ml' ? 'വണ്ടി നമ്പർ തിരയുക (ഉദാ: 5678, KL-07...)' : 'Type last 4 digits or reg text (e.g. 5678, KL-07...)'}
                      value={vehicleSearch}
                      onChange={(e) => setVehicleSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface-solid border border-subtle text-primary placeholder:text-muted text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                    />
                    {vehicleSearch && (
                      <button
                        type="button"
                        onClick={() => setVehicleSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Selected Vehicle Banner (Green Highlight) */}
                  {selectedVehicle && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm font-black text-emerald-400">
                          {selectedVehicle.vehicleNumber}
                        </span>
                        <span className="text-xs text-emerald-500/80 font-medium">
                          ({selectedVehicle.vehicleType?.name || 'Standard'})
                        </span>
                      </div>
                      <Badge variant="emerald" size="sm">
                        <Check className="w-3 h-3 mr-1" /> Selected
                      </Badge>
                    </div>
                  )}

                  {/* Vehicle Fast Select Pills */}
                  <div className="max-h-40 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredVehicles.slice(0, 9).map((veh) => {
                      const isSelected = veh.id === vehicleId;
                      return (
                        <button
                          key={veh.id}
                          type="button"
                          onClick={() => handleVehicleSelect(veh.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md shadow-emerald-500/20'
                              : 'bg-surface-solid border-subtle text-primary hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-sm font-extrabold tracking-tight truncate">
                              {veh.vehicleNumber}
                            </span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-950" />}
                          </div>
                          <span className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-slate-900 font-semibold' : 'text-muted'}`}>
                            {veh.vehicleType?.name || 'Standard'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredVehicles.length === 0 && (
                    <div className="p-4 rounded-2xl bg-surface-solid border border-subtle text-center text-xs text-secondary">
                      {language === 'ml' ? 'വണ്ടികളൊന്നും കണ്ടെത്തിയില്ല.' : 'No vehicles found matching search.'}{' '}
                      <button
                        type="button"
                        onClick={() => setShowAddVehicleModal(true)}
                        className="text-amber-500 font-bold underline ml-1 cursor-pointer"
                      >
                        {language === 'ml' ? 'ഇപ്പോൾ ചേർക്കുക' : 'Add Vehicle now'}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Material & Contractor Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Material Type */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        {t('material')} <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddMaterialModal(true)}
                        className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'ml' ? 'പുതിയ മെറ്റീരിയൽ' : 'New Material'}
                      </button>
                    </div>
                    <CustomSelect
                      options={materialOptions}
                      value={materialTypeId}
                      onChange={handleMaterialSelect}
                      placeholder={t('select_material')}
                      searchable
                    />
                  </div>

                  {/* Contractor (Care Of) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                        {language === 'ml' ? 'കരാറുകാരൻ (C/O)' : 'Contractor / C/O'} ({language === 'ml' ? 'ഓപ്ഷണൽ' : 'Optional'})
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddContractorModal(true)}
                        className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> {language === 'ml' ? 'പുതിയ കരാറുകാരൻ' : 'New Contractor'}
                      </button>
                    </div>
                    <CustomSelect
                      options={contractorOptions}
                      value={contractorId}
                      onChange={handleContractorSelect}
                      placeholder={t('all_contractors')}
                      searchable
                    />
                  </div>
                </div>

                {/* 4. Date & Payment Type Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                      {t('dispatch_date')} <span className="text-rose-500">*</span>
                    </label>
                    <DateInput
                      value={date}
                      onChange={(newDate) => setDate(newDate || new Date().toISOString().split('T')[0])}
                    />
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                      {t('payment_terms')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-solid border border-subtle">
                      <button
                        type="button"
                        onClick={() => setPaymentType('CREDIT')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          paymentType === 'CREDIT'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        {t('credit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('CASH')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          paymentType === 'CASH'
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'text-secondary hover:text-primary'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        {t('cash')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Real-Time Dynamic Rate Resolution HUD */}
                <div className="p-4 rounded-2xl bg-surface-solid border border-subtle space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                        {t('trip_rate')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOverride(!isOverride);
                        if (!isOverride && resolvedRate) {
                          setCustomAmount(String(resolvedRate.amount));
                        }
                      }}
                      className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      {isOverride
                        ? language === 'ml' ? 'ഓട്ടോമാറ്റിക് റേറ്റ് ഉപയോഗിക്കുക' : '← Use Master Rate'
                        : language === 'ml' ? 'തുക മാറ്റുക (Custom Override)' : '✎ Custom Amount Override'}
                    </button>
                  </div>

                  {isOverride ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-primary">₹</span>
                        <Input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Enter override trip amount"
                          className="text-lg font-black"
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-amber-500/90 font-medium">
                        {language === 'ml'
                          ? 'ശ്രദ്ധിക്കുക: ഈ ലോഡിന് നൽകുന്ന തുക മാത്രമേ രേഖപ്പെടുത്തൂ (മാസ്റ്റർ റേറ്റ് മാറില്ല).'
                          : 'Custom override will apply only for this load entry without altering master rules.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      {rateLookingUp ? (
                        <div className="flex items-center gap-2 text-xs text-secondary animate-pulse">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                          {language === 'ml' ? 'റേറ്റ് കണക്കാക്കുന്നു...' : 'Resolving configured rate...'}
                        </div>
                      ) : resolvedRate ? (
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
                              {formatINR(Number(resolvedRate.amount))}
                            </div>
                            <span className="text-[10px] text-secondary font-medium">
                              {language === 'ml' ? 'മാസ്റ്റർ ഡാറ്റയിലെ നിശ്ചിത നിരക്ക്' : 'Auto-resolved from Master Data'}
                            </span>
                          </div>
                          <Badge variant="emerald" size="sm">
                            <Check className="w-3 h-3 mr-1" /> Active Rate
                          </Badge>
                        </div>
                      ) : rateError ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 text-rose-400">
                          <div className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{rateError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSetRateModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer self-start sm:self-auto flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Set Master Rate
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">
                          {language === 'ml'
                            ? 'സൈറ്റും വണ്ടിയും മെറ്റീരിയലും തിരഞ്ഞെടുക്കുമ്പോൾ നിരക്ക് കാണാം'
                            : 'Select site, vehicle & material to auto-calculate rate'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Dispatch Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  loadingText={t('recording_load_progress')}
                  leftIcon={<Zap className="w-5 h-5" />}
                  className="w-full py-4 text-base font-black shadow-xl shadow-amber-500/20"
                >
                  {language === 'ml' ? 'ലോഡ് രേഖപ്പെടുത്തുക' : 'DISPATCH & RECORD LOAD'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right 1 Col: Recent Shuttle Trucks & Last Recorded HUD */}
          <div className="space-y-6">
            {/* Recent Shuttle Trucks Card */}
            {recentVehiclesList.length > 0 && (
              <Card variant="glass" className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                      {t('recent_trucks')}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted font-bold tracking-wider uppercase">1-Tap Select</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {recentVehiclesList.map((veh) => {
                    const isSelected = veh.id === vehicleId;
                    return (
                      <button
                        key={`recent-right-${veh.id}`}
                        type="button"
                        onClick={() => handleVehicleSelect(veh.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-surface-solid border-subtle hover:border-amber-500/50 text-primary'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-black tracking-tight">{veh.vehicleNumber}</div>
                          <div className={`text-[11px] ${isSelected ? 'text-slate-900 font-semibold' : 'text-muted'}`}>
                            {veh.vehicleType?.name || 'Standard'}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Last Recorded Load Card */}
            {lastRecordedLoad && (
              <Card variant="glass" className="p-5 space-y-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between border-b border-subtle pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500">
                      {t('last_recorded_truck')}
                    </span>
                  </div>
                  <Badge variant={lastRecordedLoad.paymentType === 'CASH' ? 'emerald' : 'amber'} size="sm">
                    {lastRecordedLoad.paymentType}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-xl font-black text-primary tracking-tight">
                    {lastRecordedLoad.vehicle?.vehicleNumber}
                  </div>
                  <div className="text-xs text-secondary space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">{t('material')}:</span>
                      <span className="font-semibold text-primary">{lastRecordedLoad.materialType?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">{language === 'ml' ? 'കരാറുകാരൻ:' : 'Contractor:'}</span>
                      <span className="font-semibold text-primary">
                        {lastRecordedLoad.contractor ? lastRecordedLoad.contractor.name : (language === 'ml' ? 'നേരിട്ടുള്ള വില്പന' : 'Direct Sale')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">{t('site')}:</span>
                      <span className="font-semibold text-primary">{lastRecordedLoad.site?.siteName}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-subtle flex items-center justify-between">
                    <span className="text-xs text-muted">{t('amount')}</span>
                    <span className="text-lg font-black text-emerald-500">
                      {formatINR(Number(lastRecordedLoad.amount))}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*              VIEW 2: ADVANCED LOAD REGISTER & LEDGER                      */}
      {/* ========================================================================= */}
      {activeView === 'history' && (
        <div className="space-y-6">
          {/* Summary Metrics */}
          {loadsData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                label={t('total_loads')}
                value={loadsData.summary.totalLoads.toLocaleString('en-IN')}
                icon={<Truck className="w-5 h-5 text-amber-500" />}
              />
              <MetricCard
                label={t('total_turnover')}
                value={formatINR(loadsData.summary.totalAmount)}
                icon={<Coins className="w-5 h-5 text-emerald-500" />}
              />
              <MetricCard
                label={t('cash_volume')}
                value={formatINR(loadsData.summary.totalCashAmount)}
                subtext={`${loadsData.summary.cashCount} loads`}
                icon={<Banknote className="w-5 h-5 text-emerald-400" />}
              />
              <MetricCard
                label={t('credit_outstanding')}
                value={formatINR(loadsData.summary.totalCreditAmount)}
                subtext={`${loadsData.summary.creditCount} loads`}
                icon={<CreditCard className="w-5 h-5 text-amber-400" />}
              />
            </div>
          )}

          {/* Filter Bar & Export Actions */}
          <Card variant="glass" className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder={language === 'ml' ? 'വണ്ടി, കരാറുകാരൻ, സൈറ്റ് തിരയുക...' : 'Search vehicle, contractor, site...'}
                  value={historyFilter.search}
                  onChange={(e) => historyFilter.setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-solid border border-subtle text-primary placeholder:text-muted text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExportLoadsCSV}
                  leftIcon={<Download className="w-4 h-4 text-white" />}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 shadow-md shadow-emerald-950/30 cursor-pointer"
                >
                  Export CSV / Excel
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchLoadsHistory()}
                  disabled={historyLoading}
                  leftIcon={<RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />}
                >
                  {language === 'ml' ? 'പുതുക്കുക' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Filter Dropdowns & Date Preset Filter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-subtle">
              <CustomSelect
                options={filterSiteOptions}
                value={filterSite}
                onChange={setFilterSite}
                placeholder={t('all_sites')}
                disabled={isSiteBoy && !!user?.assignedSiteId}
              />
              <CustomSelect
                options={filterContractorOptions}
                value={filterContractor}
                onChange={setFilterContractor}
                placeholder={t('all_contractors')}
              />
              <CustomSelect
                options={filterMaterialOptions}
                value={filterMaterial}
                onChange={setFilterMaterial}
                placeholder={language === 'ml' ? 'എല്ലാ മെറ്റീരിയലുകളും' : 'All Materials'}
              />
              <CustomSelect
                options={filterPaymentOptions}
                value={filterPayment}
                onChange={(val) => setFilterPayment((val as '' | 'CASH' | 'CREDIT') || '')}
                placeholder={t('all_payments')}
              />
            </div>

            <FilterBar
              activePreset={historyFilter.preset}
              onPresetChange={historyFilter.setPreset}
              startDate={historyFilter.startDate}
              onStartDateChange={historyFilter.setStartDate}
              endDate={historyFilter.endDate}
              onEndDateChange={historyFilter.setEndDate}
            />
          </Card>

          {/* Load Register Table */}
          <Card variant="glass" className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-subtle bg-surface-solid text-[11px] font-extrabold uppercase tracking-wider text-secondary">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">{t('date_time')}</th>
                    <th className="py-3.5 px-4">{t('vehicle_no')}</th>
                    <th className="py-3.5 px-4">{t('material')}</th>
                    <th className="py-3.5 px-4">{language === 'ml' ? 'കരാറുകാരൻ' : 'Contractor'}</th>
                    <th className="py-3.5 px-4">{t('site')}</th>
                    <th className="py-3.5 px-4">{t('payment_terms')}</th>
                    <th className="py-3.5 px-4 text-right">{t('amount')}</th>
                    <th className="py-3.5 px-4 text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle text-xs">
                  {loadsData?.loads.map((load, index) => (
                    <tr key={load.id} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3.5 px-4 text-muted font-mono font-medium">
                        {(historyFilter.page - 1) * 20 + index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-primary whitespace-nowrap">
                        <div>{formatShortDate(load.date)}</div>
                        <span className="text-[10px] text-muted">
                          {new Date(load.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-primary">{load.vehicle?.vehicleNumber}</span>
                        <div className="text-[10px] text-muted">{load.vehicle?.vehicleType?.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-secondary whitespace-nowrap">
                        {load.materialType?.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {load.contractor ? (
                          <span className="font-semibold text-primary">{load.contractor.name}</span>
                        ) : (
                          <span className="text-muted italic">{language === 'ml' ? 'നേരിട്ടുള്ള വില്പന' : 'Direct Sale'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-secondary whitespace-nowrap">
                        {load.site?.siteName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={load.paymentType === 'CASH' ? 'emerald' : 'amber'} size="sm">
                          {load.paymentType}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-primary whitespace-nowrap">
                        {formatINR(Number(load.amount))}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isCoPartner ? (
                          <span className="text-[11px] text-muted font-medium italic">
                            View Only
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(load)}
                              title={t('edit')}
                              className="p-1.5 rounded-lg bg-surface-solid border border-subtle text-secondary hover:text-amber-500 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLoad(load)}
                              title={t('delete')}
                              className="p-1.5 rounded-lg bg-surface-solid border border-subtle text-secondary hover:text-rose-500 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {(!loadsData || loadsData.loads.length === 0) && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-secondary">
                        {historyLoading ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-8">
                            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                            <span className="text-xs text-muted">Loading load register...</span>
                          </div>
                        ) : (
                          <EmptyState
                            icon={<Truck className="w-10 h-10 text-muted mx-auto mb-2" />}
                            title={language === 'ml' ? 'ലോഡുകളൊന്നും കണ്ടെത്തിയില്ല' : 'No loads recorded'}
                            description={language === 'ml' ? 'ഫിൽട്ടറുകൾ പരിശോധിക്കുക അല്ലെങ്കിൽ പുതിയ ലോഡ് രേഖപ്പെടുത്തുക' : 'Try adjusting filters or record a new load dispatch'}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {loadsData && loadsData.totalPages > 1 && (
              <div className="p-4 border-t border-subtle">
                <Pagination
                  page={historyFilter.page}
                  totalPages={loadsData.totalPages}
                  onPageChange={(p: number) => historyFilter.setPage(p)}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/*                             IN-PLACE MODALS                               */}
      {/* ========================================================================= */}
      {showAddSiteModal && (
        <SiteModal
          isOpen={showAddSiteModal}
          onClose={() => setShowAddSiteModal(false)}
          onSuccess={(savedSite) => {
            setShowAddSiteModal(false);
            refreshMasterData();
            if (savedSite?.id) {
              handleSiteSelect(savedSite.id);
            }
          }}
        />
      )}

      {showAddVehicleModal && (
        <VehicleModal
          isOpen={showAddVehicleModal}
          onClose={() => setShowAddVehicleModal(false)}
          onSuccess={(savedVehicle) => {
            setShowAddVehicleModal(false);
            refreshMasterData();
            if (savedVehicle?.id) {
              handleVehicleSelect(savedVehicle.id);
              setRecentVehicleIds((prev) => {
                const next = [savedVehicle.id, ...prev.filter((id) => id !== savedVehicle.id)].slice(0, 6);
                try {
                  localStorage.setItem(STORAGE_KEY_RECENT_VEHICLES, JSON.stringify(next));
                } catch {}
                return next;
              });
            }
          }}
        />
      )}

      {showAddMaterialModal && (
        <MaterialTypeModal
          isOpen={showAddMaterialModal}
          onClose={() => setShowAddMaterialModal(false)}
          onSuccess={(savedMat) => {
            setShowAddMaterialModal(false);
            refreshMasterData();
            if (savedMat?.id) {
              handleMaterialSelect(savedMat.id);
            }
          }}
        />
      )}

      {showAddContractorModal && (
        <ContractorModal
          isOpen={showAddContractorModal}
          onClose={() => setShowAddContractorModal(false)}
          onSuccess={(savedCont) => {
            setShowAddContractorModal(false);
            refreshMasterData();
            if (savedCont?.id) {
              handleContractorSelect(savedCont.id);
            }
          }}
        />
      )}

      {showSetRateModal && (
        <RateModal
          isOpen={showSetRateModal}
          onClose={() => setShowSetRateModal(false)}
          initialSiteId={siteId}
          initialVehicleTypeId={selectedVehicle?.vehicleTypeId}
          initialMaterialTypeId={materialTypeId}
          onSuccess={(savedRate) => {
            setShowSetRateModal(false);
            refreshMasterData(true);
            if (savedRate) {
              setResolvedRate(savedRate);
              setRateError(null);
            }
          }}
        />
      )}

      {/* Edit Load Modal */}
      {editLoad && (
        <Modal
          isOpen={!!editLoad}
          onClose={() => setEditLoad(null)}
          title={`${t('edit')} Load: ${editLoad.vehicle?.vehicleNumber}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {editError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                {t('dispatch_date')} <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={editForm.date}
                onChange={(d) => setEditForm((prev) => ({ ...prev, date: d }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                {t('amount')} (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Trip amount"
                className="font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                {t('payment_terms')}
              </label>
              <CustomSelect
                options={editPaymentOptions}
                value={editForm.paymentType}
                onChange={(v) => setEditForm((prev) => ({ ...prev, paymentType: (v as PaymentType) || 'CREDIT' }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-secondary">
                {language === 'ml' ? 'കരാറുകാരൻ' : 'Contractor'}
              </label>
              <CustomSelect
                options={contractorOptions}
                value={editForm.contractorId}
                onChange={(v) => setEditForm((prev) => ({ ...prev, contractorId: v }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
              <Button type="button" variant="outline" onClick={() => setEditLoad(null)}>
                {t('cancel')}
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                {t('save')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
