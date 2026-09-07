import { apiClient } from './client';

export interface PartnerSiteShare {
  id: string;
  siteId: string;
  sharePercentage: string | number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  site: {
    id: string;
    siteName: string;
    location: string;
    isActive: boolean;
  };
}

export interface CoPartner {
  id: string;
  name: string;
  mobile: string;
  role: 'CO_PARTNER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  partnerShares: PartnerSiteShare[];
}

export interface SiteBoy {
  id: string;
  name: string;
  mobile: string;
  role: 'SITE_BOY';
  isActive: boolean;
  assignedSiteId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedSite: {
    id: string;
    siteName: string;
    location: string;
    isActive: boolean;
  } | null;
}

export interface QuotaMetric {
  active: number;
  max: number;
}

export interface SubAccountsBundle {
  coPartners: CoPartner[];
  siteBoys: SiteBoy[];
  quotas: {
    coPartner: QuotaMetric;
    siteBoy: QuotaMetric;
  };
}

export interface CreateCoPartnerDto {
  name: string;
  mobile: string;
  password: string;
  siteShares: {
    siteId: string;
    sharePercentage: number;
    effectiveFrom?: string;
  }[];
}

export interface UpdateCoPartnerDto {
  name?: string;
  password?: string;
  isActive?: boolean;
  siteShares?: {
    siteId: string;
    sharePercentage: number;
    effectiveFrom?: string;
    isActive?: boolean;
  }[];
}

export interface CreateSiteBoyDto {
  name: string;
  mobile: string;
  password: string;
  assignedSiteId: string;
}

export interface UpdateSiteBoyDto {
  name?: string;
  password?: string;
  assignedSiteId?: string;
  isActive?: boolean;
}

export async function getSubAccountsApi(): Promise<SubAccountsBundle> {
  return apiClient<SubAccountsBundle>('/sub-accounts');
}

export async function createCoPartnerApi(dto: CreateCoPartnerDto): Promise<CoPartner> {
  return apiClient<CoPartner>('/sub-accounts/co-partners', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateCoPartnerApi(
  id: string,
  dto: UpdateCoPartnerDto,
): Promise<CoPartner> {
  return apiClient<CoPartner>(`/sub-accounts/co-partners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function createSiteBoyApi(dto: CreateSiteBoyDto): Promise<SiteBoy> {
  return apiClient<SiteBoy>('/sub-accounts/site-boys', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateSiteBoyApi(
  id: string,
  dto: UpdateSiteBoyDto,
): Promise<SiteBoy> {
  return apiClient<SiteBoy>(`/sub-accounts/site-boys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteSubAccountApi(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/sub-accounts/${id}`, {
    method: 'DELETE',
  });
}
