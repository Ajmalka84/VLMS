import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Site,
  Vehicle,
  VehicleType,
  MaterialType,
  Contractor,
  Rate,
  MasterDataBundle,
  getMasterDataBundleApi,
} from '../api/masterData';
import { useAuth } from './AuthContext';

interface MasterCacheContextType {
  sites: Site[];
  vehicles: Vehicle[];
  vehicleTypes: VehicleType[];
  materials: MaterialType[];
  materialTypes: MaterialType[];
  contractors: Contractor[];
  rates: Rate[];
  ratesMap: Map<string, Rate>;
  resolveRate: (siteId: string, vehicleTypeId: string, materialTypeId: string) => Rate | null;
  isLoading: boolean;
  isInitialized: boolean;
  refreshMasterData: (force?: boolean) => Promise<void>;
}

const MasterCacheContext = createContext<MasterCacheContextType | undefined>(undefined);

export const MasterCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [data, setData] = useState<MasterDataBundle>({
    sites: [],
    vehicles: [],
    vehicleTypes: [],
    materialTypes: [],
    contractors: [],
    rates: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const isFetchingRef = useRef(false);

  // Fast In-Memory Rate Matrix Map: "siteId_vehicleTypeId_materialTypeId" -> Rate
  const ratesMap = useMemo(() => {
    const map = new Map<string, Rate>();
    for (const r of data.rates) {
      const key = `${r.siteId}_${r.vehicleTypeId}_${r.materialTypeId}`;
      map.set(key, r);
    }
    return map;
  }, [data.rates]);

  // Instant 0ms Rate Lookup Resolver
  const resolveRate = useCallback(
    (siteId: string, vehicleTypeId: string, materialTypeId: string): Rate | null => {
      if (!siteId || !vehicleTypeId || !materialTypeId) return null;
      const key = `${siteId}_${vehicleTypeId}_${materialTypeId}`;
      return ratesMap.get(key) || null;
    },
    [ratesMap]
  );

  const userId = user?.id;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch or Refresh the consolidated bundle
  const refreshMasterData = useCallback(async (force = false) => {
    if (!userId || isSuperAdmin) return;
    if (isFetchingRef.current && !force) return;
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const bundle = await getMasterDataBundleApi(force);
      setData(bundle);
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to load master data bundle:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, isSuperAdmin]);

  // Auto-fetch bundle on authentication for Customer users
  useEffect(() => {
    if (userId && !isSuperAdmin) {
      void refreshMasterData();
    } else {
      setData({
        sites: [],
        vehicles: [],
        vehicleTypes: [],
        materialTypes: [],
        contractors: [],
        rates: [],
      });
      setIsInitialized(false);
    }
  }, [userId, isSuperAdmin, refreshMasterData]);

  const value = useMemo(
    () => ({
      sites: data.sites,
      vehicles: data.vehicles,
      vehicleTypes: data.vehicleTypes,
      materials: data.materialTypes,
      materialTypes: data.materialTypes,
      contractors: data.contractors,
      rates: data.rates,
      ratesMap,
      resolveRate,
      isLoading,
      isInitialized,
      refreshMasterData,
    }),
    [data, ratesMap, resolveRate, isLoading, isInitialized, refreshMasterData]
  );

  return <MasterCacheContext.Provider value={value}>{children}</MasterCacheContext.Provider>;
};

export const useMasterCache = (): MasterCacheContextType => {
  const context = useContext(MasterCacheContext);
  if (!context) {
    throw new Error('useMasterCache must be used within a MasterCacheProvider');
  }
  return context;
};
