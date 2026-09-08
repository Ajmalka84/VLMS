import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  PlusCircle,
  Plus,
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
  Download,
  Lock,
  Coins,
} from 'lucide-react';
import {
  Button,
  Input,
  DateInput,
  SearchBar,
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
  StatusBadge,
  EmptyState,
} from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useMasterCache } from '../context/MasterCacheContext';
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
  const { t, language } = useLanguage();
  const toast = useToast();
  const [activeView, setActiveView] = useState<'record' | 'history'>('record');

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
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [lastRecordedLoad, setLastRecordedLoad] = useState<Load | null>(null);

  // History / Register State with useFilterState
  const [loadsData, setLoadsData] = useState<LoadsResponse | null>(null);
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

    const isSiteBoy = user?.role === 'SITE_BOY';

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
  }, [isInitialized, sites, materials, contractors]);

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

  // Filtered vehicles based on debounced search (last 4 digits or reg text)
  const filteredVehicles = useMemo(() => {
    if (!debouncedVehicleSearch.trim()) return vehicles;
    const q = debouncedVehicleSearch.trim().toLowerCase();
    return vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(q));
  }, [vehicles, debouncedVehicleSearch]);

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
        subLabel: `+91 ${c.mobile}`,
        icon: <UserCheck className="w-4 h-4 text-slate-400" />,
      })),
    ];
  }, [contractors, language]);

  // Site options for CustomSelect (only active sites for new loads)
  const siteOptions: CustomSelectOption[] = useMemo(() => {
    return sites
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        value: s.id,
        label: s.siteName,
        subLabel: s.location,
        icon: <MapPin className="w-4 h-4 text-amber-400" />,
      }));
  }, [sites]);

  // Material options for CustomSelect
  const materialOptions: CustomSelectOption[] = useMemo(() => {
    return materials.map((m) => ({
      value: m.id,
      label: m.name,
      icon: <Layers className="w-4 h-4 text-amber-400" />,
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
      ...contractors.map((c) => ({ value: c.id, label: c.name, subLabel: `+91 ${c.mobile}` })),
    ];
  }, [contractors, language, t]);

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

  const historyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      historyAbortRef.current?.abort();
    };
  }, []);

  // Load History fetcher with useFilterState
  const fetchLoadsHistory = useCallback(async () => {
    if (historyAbortRef.current) {
      historyAbortRef.current.abort();
    }
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setHistoryLoading(true);
    try {
      const res = await getLoadsApi({
        siteId: filterSite || undefined,
        contractorId: filterContractor || undefined,
        materialTypeId: filterMaterial || undefined,
        paymentType: filterPayment || undefined,
        search: historyFilter.debouncedSearch.trim() || undefined,
        startDate: historyFilter.startDate || undefined,
        endDate: historyFilter.endDate || undefined,
        page: historyFilter.page,
        limit: 20,
      }, { signal: controller.signal });
      setLoadsData(res);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to fetch loads history');
      }
    } finally {
      setHistoryLoading(false);
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
          icon={<Truck className="w-5 h-5 text-amber-400" />}
          className="p-0 border-0 bg-transparent"
        />

        <TabBar
          activeTab={activeView}
          onChange={(tabId) => setActiveView(tabId as 'record' | 'history')}
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
              badge: loadsData?.total ?? 0,
              icon: History,
            },
          ]}
        />
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
            {/* Context Bar: Adaptive Site Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {t('select_site')} <span className="text-amber-400">*</span>
                  </label>
                  {!isSiteBoy && sites.length === 1 && (
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {language === 'ml' ? 'ഓട്ടോ സെലക്ട്' : 'Single Site Active'}
                    </span>
                  )}
                </div>
                {!isSiteBoy && (
                  <Link
                    to="/settings?tab=sites"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Site
                  </Link>
                )}
              </div>

              {isSiteBoy ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {sites.find((s) => s.id === siteId)?.siteName || 'Assigned Quarry Site'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {sites.find((s) => s.id === siteId)?.location || 'Field Location'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Assigned Site
                  </span>
                </div>
              ) : sites.length <= 3 ? (
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
              ) : (
                <CustomSelect
                  options={siteOptions}
                  value={siteId}
                  onChange={handleSiteSelect}
                  placeholder={t('select_site')}
                  searchPlaceholder="Search operational site..."
                />
              )}
            </div>

            {/* Vehicle Selector: Search + Recent Shuttles + Tappable Chips */}
            <div className="space-y-3 p-4 rounded-3xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> {t('select_vehicle')} <span className="text-amber-400">*</span>
                </label>
                <div className="flex items-center gap-3">
                  {selectedVehicle && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {selectedVehicle.vehicleNumber} ({selectedVehicle.vehicleType?.name})
                    </span>
                  )}
                  <Link
                    to="/settings?tab=vehicles"
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Vehicle
                  </Link>
                </div>
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
                        onClick={() => handleVehicleSelect(v.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          vehicleId === v.id
                            ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span>{v.vehicleNumber}</span>
                        <span className="text-[10px] opacity-75">({v.vehicleType?.name || 'Std'})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Vehicles or Pick from Grid */}
              <SearchBar
                placeholder={t('search_vehicle_ph')}
                value={vehicleSearch}
                onChange={setVehicleSearch}
                className="uppercase font-mono"
              />

              {/* Vehicle Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredVehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVehicleSelect(v.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      vehicleId === v.id
                        ? 'bg-blue-500/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Truck className={`w-4 h-4 shrink-0 ${vehicleId === v.id ? 'text-blue-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-sm font-mono font-extrabold text-white tracking-wide">
                          {v.vehicleNumber}
                        </div>
                        <div className="text-[11px] text-blue-400 font-semibold">
                          {v.vehicleType?.name || 'Standard'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Material Type: Compact Searchable Select with Sticky Default */}
            <div className="space-y-2">
              <CustomSelect
                label={t('select_material')}
                required
                options={materialOptions}
                value={materialTypeId}
                onChange={handleMaterialSelect}
                placeholder="Select loaded material..."
                searchPlaceholder="Search M-Sand, 20mm, Mannu, Rubble..."
              />
            </div>

            {/* Contractor Selector using CustomSelect Dropdown */}
            <div className="space-y-2">
              <CustomSelect
                label={t('select_contractor')}
                required
                labelRight={
                  <Link
                    to="/settings?tab=contractors"
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Contractor
                  </Link>
                }
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

            {/* Compact Date Row with DateInput */}
            <DateInput
              label={t('dispatch_date')}
              value={date}
              onChange={setDate}
              id="cockpit-date-picker"
              clearable={false}
            />

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
                          ₹{Math.round(Number(resolvedRate.amount)).toLocaleString('en-IN')}
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
                  <Input
                    label={t('enter_override_amount')}
                    type="number"
                    inputMode="numeric"
                    step="any"
                    min="1"
                    required
                    placeholder="e.g. 3800.00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    leftIcon={<span className="font-bold text-slate-500">₹</span>}
                    className="text-base font-bold text-emerald-400"
                  />
                </div>
              )}
            </div>

            {/* Big Dispatch Button */}
            <Button
              type="submit"
              disabled={submitting}
              id="record-load-submit-btn"
              variant="primary"
              size="lg"
              loading={submitting}
              loadingText={t('recording_load_progress')}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              fullWidth
              className="py-4 sm:py-4.5 text-base tracking-wide shadow-xl shadow-amber-500/20"
            >
              {t('record_load_btn')}
            </Button>
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
                  <Badge variant={lastRecordedLoad.paymentType === 'CASH' ? 'emerald' : 'amber'} size="sm">
                    {lastRecordedLoad.paymentType}
                  </Badge>
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
            <MetricCard
              label={t('total_loads')}
              value={loadsData?.summary.totalLoads ?? 0}
              subLabel={t('dispatches')}
              icon={<Truck className="w-5 h-5 text-amber-400" />}
              variant="default"
            />
            <MetricCard
              label={t('total_turnover')}
              value={formatINR(loadsData?.summary.totalAmount ?? 0)}
              subLabel={language === 'ml' ? 'ആകെ വാടക' : 'Total Revenue'}
              icon={<Coins className="w-5 h-5 text-emerald-400" />}
              variant="emerald"
            />
            <MetricCard
              label={t('cash_volume')}
              value={formatINR(loadsData?.summary.totalCashAmount ?? 0)}
              subLabel={`${loadsData?.summary.cashCount ?? 0} ${t('cash')}`}
              icon={<Banknote className="w-5 h-5 text-blue-400" />}
              variant="blue"
            />
            <MetricCard
              label={t('credit_outstanding')}
              value={formatINR(loadsData?.summary.totalCreditAmount ?? 0)}
              subLabel={`${loadsData?.summary.creditCount ?? 0} ${t('credit')}`}
              icon={<CreditCard className="w-5 h-5 text-amber-400" />}
              variant="amber"
            />
          </div>

          {/* Filter Toolbar with Reusable FilterBar component */}
          <FilterBar
            activePreset={historyFilter.preset}
            onPresetChange={historyFilter.setPreset}
            startDate={historyFilter.startDate}
            onStartDateChange={historyFilter.setStartDate}
            endDate={historyFilter.endDate}
            onEndDateChange={historyFilter.setEndDate}
            search={historyFilter.search}
            onSearchChange={historyFilter.setSearch}
            searchPlaceholder={t('search_loads_ph')}
            onExportCSV={handleExportLoadsCSV}
            exportLabel={language === 'ml' ? 'ലെഡ്ജർ എക്സ്പോർട്ട്' : 'Export CSV'}
          >
            {/* Filter Site with CustomSelect (Owner/Co-Partner only) */}
            {!isSiteBoy && (
              <CustomSelect
                options={filterSiteOptions}
                value={filterSite}
                onChange={setFilterSite}
                placeholder={t('all_sites')}
              />
            )}

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
          </FilterBar>


          {/* Load History List */}
          <div className="space-y-3 relative z-10">
            {historyLoading ? (
              <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
                <span>{language === 'ml' ? 'ലോഡുകൾ ലഭ്യമാക്കുന്നു...' : 'Loading dispatches...'}</span>
              </div>
            ) : loadsData?.loads.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-8 h-8 text-slate-500" />}
                title={t('no_loads_found')}
                description={language === 'ml' ? 'തിരഞ്ഞെടുത്ത തീയതികളിൽ ലോഡുകൾ ഒന്നും ലഭ്യമല്ല' : 'No load records match your filter criteria'}
              />
            ) : (
              loadsData?.loads.map((load) => (
                <Card
                  key={load.id}
                  variant="glass"
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all content-visibility-auto"
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
                        <Badge variant={load.paymentType === 'CASH' ? 'emerald' : 'amber'} size="sm">
                          {load.paymentType === 'CASH' ? t('cash') : t('credit')}
                        </Badge>
                        <span className="text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {load.vehicle?.vehicleType?.name}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-semibold mt-1">
                        {load.contractor ? (
                          <span>{load.contractor.name}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">
                            {language === 'ml' ? 'നേരിട്ടുള്ള വില്പന (Direct Sale)' : 'Direct / Walk-in Sale'}
                          </span>
                        )}{' '}
                        • <span className="text-slate-400">{load.materialType?.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {t('select_site')}: {load.site?.siteName} • {t('dispatch_date')}: {formatShortDate(load.date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-xl font-extrabold text-emerald-400">
                        {formatINR(load.amount)}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">{t('per_trip')}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Edit button: Check if Site Boy has exceeded 2h window */}
                      {(() => {
                        const isSiteBoy = user?.role === 'SITE_BOY';
                        const isOlderThan2Hours =
                          isSiteBoy &&
                          (Date.now() - new Date(load.createdAt).getTime()) / (1000 * 60 * 60) > 2;

                        if (isOlderThan2Hours) {
                          return (
                            <span
                              className="p-2 text-slate-600 cursor-not-allowed text-xs font-semibold"
                              title="Locked: Edits only permitted within 2 hours of creation"
                            >
                              <Lock className="w-4 h-4" />
                            </span>
                          );
                        }

                        return (
                          <button
                            onClick={() => openEditModal(load)}
                            className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title={t('edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        );
                      })()}

                      {/* Delete button: Only for Owner and Super Admin */}
                      {(user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') && (
                        <button
                          onClick={() => handleDeleteLoad(load)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editLoad && (
        <Modal
          isOpen={!!editLoad}
          onClose={() => setEditLoad(null)}
          title={`${t('edit')} Load: ${editLoad.vehicle?.vehicleNumber}`}
          icon={<Truck className="w-5 h-5" />}
          maxWidth="md"
        >
          {editError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-snug">{editError}</span>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <CustomSelect
              label={t('select_contractor')}
              required
              options={contractorOptions}
              value={editForm.contractorId}
              onChange={(val) => setEditForm({ ...editForm, contractorId: val })}
            />

            <Input
              label={`${t('trip_rate')} (₹)`}
              type="number"
              inputMode="numeric"
              step="any"
              min="1"
              required
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              leftIcon={<span className="font-bold text-slate-500">₹</span>}
              className="text-emerald-400 font-bold"
            />

            <CustomSelect
              label={t('payment_terms')}
              required
              searchable={false}
              options={editPaymentOptions}
              value={editForm.paymentType}
              onChange={(val) =>
                setEditForm({ ...editForm, paymentType: val as PaymentType })
              }
            />


            <DateInput
              label={t('dispatch_date')}
              value={editForm.date}
              onChange={(val) => setEditForm({ ...editForm, date: val })}
              clearable={false}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setEditLoad(null)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                loadingText={t('recording_load_progress')}
              >
                {t('save')}
              </Button>
            </div>
          </form>
        </Modal>
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
