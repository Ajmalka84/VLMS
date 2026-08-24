import { apiClient } from './client';

export interface Site {
  id: string;
  userId: string;
  siteName: string;
  location: string;
  pincode: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rates: number;
    loads: number;
  };
}

export interface VehicleType {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    vehicles: number;
    rates: number;
  };
}

export interface MaterialType {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    rates: number;
    loads: number;
  };
}

export interface Vehicle {
  id: string;
  userId: string;
  vehicleNumber: string;
  vehicleTypeId: string;
  vehicleType: VehicleType;
  createdAt: string;
  updatedAt: string;
  _count?: {
    loads: number;
  };
}

export interface Contractor {
  id: string;
  userId: string;
  name: string;
  mobile: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    loads: number;
  };
}

export interface Rate {
  id: string;
  siteId: string;
  vehicleTypeId: string;
  materialTypeId: string;
  amount: string | number;
  site: Site;
  vehicleType: VehicleType;
  materialType: MaterialType;
  createdAt: string;
  updatedAt: string;
}

// ----------------- SITES API -----------------
export async function getSitesApi(): Promise<Site[]> {
  return apiClient<Site[]>('/sites');
}

export async function createSiteApi(dto: {
  siteName: string;
  location: string;
  pincode: string;
}): Promise<Site> {
  return apiClient<Site>('/sites', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateSiteApi(
  id: string,
  dto: { siteName?: string; location?: string; pincode?: string; isActive?: boolean },
): Promise<Site> {
  return apiClient<Site>(`/sites/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

// ----------------- VEHICLE TYPES API -----------------
export async function getVehicleTypesApi(): Promise<VehicleType[]> {
  return apiClient<VehicleType[]>('/vehicle-types');
}

export async function createVehicleTypeApi(dto: { name: string }): Promise<VehicleType> {
  return apiClient<VehicleType>('/admin/vehicle-types', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateVehicleTypeApi(
  id: string,
  dto: { name: string },
): Promise<VehicleType> {
  return apiClient<VehicleType>(`/admin/vehicle-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteVehicleTypeApi(id: string): Promise<VehicleType> {
  return apiClient<VehicleType>(`/admin/vehicle-types/${id}`, { method: 'DELETE' });
}

// ----------------- MATERIAL TYPES API -----------------
export async function getMaterialTypesApi(): Promise<MaterialType[]> {
  return apiClient<MaterialType[]>('/material-types');
}

export async function createMaterialTypeApi(dto: { name: string }): Promise<MaterialType> {
  return apiClient<MaterialType>('/admin/material-types', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateMaterialTypeApi(
  id: string,
  dto: { name: string },
): Promise<MaterialType> {
  return apiClient<MaterialType>(`/admin/material-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteMaterialTypeApi(id: string): Promise<MaterialType> {
  return apiClient<MaterialType>(`/admin/material-types/${id}`, { method: 'DELETE' });
}

// ----------------- VEHICLES API -----------------
export async function getVehiclesApi(): Promise<Vehicle[]> {
  return apiClient<Vehicle[]>('/vehicles');
}

export async function createVehicleApi(dto: {
  vehicleNumber: string;
  vehicleTypeId: string;
}): Promise<Vehicle> {
  return apiClient<Vehicle>('/vehicles', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateVehicleApi(
  id: string,
  dto: { vehicleNumber?: string; vehicleTypeId?: string },
): Promise<Vehicle> {
  return apiClient<Vehicle>(`/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteVehicleApi(id: string): Promise<Vehicle> {
  return apiClient<Vehicle>(`/vehicles/${id}`, { method: 'DELETE' });
}

// ----------------- CONTRACTORS API -----------------
export async function getContractorsApi(): Promise<Contractor[]> {
  return apiClient<Contractor[]>('/contractors');
}

export async function createContractorApi(dto: {
  name: string;
  mobile: string;
}): Promise<Contractor> {
  return apiClient<Contractor>('/contractors', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateContractorApi(
  id: string,
  dto: { name?: string; mobile?: string },
): Promise<Contractor> {
  return apiClient<Contractor>(`/contractors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteContractorApi(id: string): Promise<Contractor> {
  return apiClient<Contractor>(`/contractors/${id}`, { method: 'DELETE' });
}

// ----------------- RATES API & LOOKUP -----------------
export async function getRatesApi(siteId?: string): Promise<Rate[]> {
  return apiClient<Rate[]>(`/rates${siteId ? `?siteId=${siteId}` : ''}`);
}

export async function createRateApi(dto: {
  siteId: string;
  vehicleTypeId: string;
  materialTypeId: string;
  amount: number;
}): Promise<Rate> {
  return apiClient<Rate>('/rates', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateRateApi(
  id: string,
  dto: { amount: number },
): Promise<Rate> {
  return apiClient<Rate>(`/rates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteRateApi(id: string): Promise<Rate> {
  return apiClient<Rate>(`/rates/${id}`, { method: 'DELETE' });
}

export async function lookupRateApi(
  siteId: string,
  vehicleTypeId: string,
  materialTypeId: string,
): Promise<Rate> {
  return apiClient<Rate>(
    `/rates/lookup?siteId=${siteId}&vehicleTypeId=${vehicleTypeId}&materialTypeId=${materialTypeId}`,
  );
}

// ----------------- MASTER DATA BUNDLE API -----------------
export interface MasterDataBundle {
  sites: Site[];
  vehicles: Vehicle[];
  vehicleTypes: VehicleType[];
  materialTypes: MaterialType[];
  contractors: Contractor[];
  rates: Rate[];
}

let inFlightBundlePromise: Promise<MasterDataBundle> | null = null;

export async function getMasterDataBundleApi(force = false): Promise<MasterDataBundle> {
  if (inFlightBundlePromise && !force) {
    return inFlightBundlePromise;
  }

  const promise = apiClient<MasterDataBundle>('/master-data/bundle')
    .finally(() => {
      if (inFlightBundlePromise === promise) {
        inFlightBundlePromise = null;
      }
    });

  inFlightBundlePromise = promise;
  return promise;
}


