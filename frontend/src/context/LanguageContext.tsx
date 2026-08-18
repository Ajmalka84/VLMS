import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ml';

export interface Translations {
  [key: string]: {
    en: string;
    ml: string;
  };
}

export const translations = {
  // Navigation & Common
  app_name: { en: 'VLMS', ml: 'വി.എൽ.എം.എസ്' },
  dashboard: { en: 'Dashboard', ml: 'ഡാഷ്‌ബോർഡ്' },
  customers: { en: 'Customers', ml: 'കസ്റ്റമേഴ്‌സ്' },
  global_master: { en: 'Global Master', ml: 'ഗ്ലോബൽ മാസ്റ്റർ' },
  loads: { en: 'Loads', ml: 'ലോഡുകൾ' },
  reports: { en: 'Reports', ml: 'റിപ്പോർട്ടുകൾ' },
  master_data: { en: 'Master Data', ml: 'മാസ്റ്റർ ഡാറ്റ' },
  logout: { en: 'Sign Out', ml: 'ലോഗ് ഔട്ട്' },
  active: { en: 'Active', ml: 'ആക്ടീവ്' },
  inactive: { en: 'Inactive', ml: 'ഇനാക്ടീവ്' },
  save: { en: 'Save', ml: 'സേവ് ചെയ്യുക' },
  cancel: { en: 'Cancel', ml: 'റദ്ദാക്കുക' },
  delete: { en: 'Delete', ml: 'ഡിലീറ്റ്' },
  edit: { en: 'Edit', ml: 'എഡിറ്റ്' },
  actions: { en: 'Actions', ml: 'നടപടികൾ' },
  all: { en: 'All', ml: 'എല്ലാം' },

  // Loads Page
  load_management_title: { en: 'Load Management', ml: 'ലോഡ് മാനേജ്‌മെന്റ്' },
  load_management_sub: {
    en: 'Record on-site vehicle loads with automated rate resolution and dispatch logs.',
    ml: 'വാഹനങ്ങളുടെ ലോഡ് പെട്ടെന്ന് രേഖപ്പെടുത്തുക, വാടക തുക തനിയെ കണക്കാക്കുക.',
  },
  quick_entry: { en: 'Quick Entry', ml: 'പുതിയ ലോഡ് എൻട്രി' },
  load_register: { en: 'Load Register', ml: 'ലോഡ് രജിസ്റ്റർ' },

  // Quick Entry Form Steps
  select_site: { en: '1. Operational Site', ml: '1. സൈറ്റ് / ക്വാറി' },
  select_vehicle: { en: '2. Vehicle Number', ml: '2. വണ്ടി നമ്പർ' },
  recent_trucks: { en: 'Recent Shuttle Trucks', ml: 'അടുത്തിടെ വന്ന വണ്ടികൾ' },
  search_vehicle_ph: {
    en: 'Type 4 digits or letters (e.g. 5555, KL-07)...',
    ml: 'വണ്ടി നമ്പർ അടിക്കുക (ഉദാ: 5555, KL-07)...',
  },
  select_material: { en: '3. Material Loaded', ml: '3. മെറ്റീരിയൽ' },
  select_contractor: { en: '4. C/O Contractor', ml: '4. കോൺട്രാക്ടർ (C/O)' },
  select_contractor_ph: { en: 'Select Contractor / C/O', ml: 'കോൺട്രാക്ടറെ തിരഞ്ഞെടുക്കുക' },
  payment_terms: { en: '5. Payment Terms', ml: '5. പേയ്‌മെന്റ് രീതി' },
  cash: { en: 'CASH', ml: 'ക്യാഷ് (പണം)' },
  credit: { en: 'CREDIT', ml: 'കടം (ക്രെഡിറ്റ്)' },
  dispatch_date: { en: 'Dispatch Date', ml: 'തീയതി' },
  today: { en: 'Today', ml: 'ഇന്ന്' },
  change_date: { en: 'Change Date', ml: 'തീയതി മാറ്റുക' },

  // Rate Section
  trip_rate: { en: 'Trip Rate', ml: 'വാടക തുക' },
  auto_resolved_from_matrix: { en: 'Auto-resolved from Rate Matrix', ml: 'മാസ്റ്റർ റേറ്റിൽ നിന്ന് തനിയെ കണക്കാക്കിയത്' },
  custom_override: { en: 'Custom Override', ml: 'തുക മാറ്റുക (Override)' },
  use_auto_rate: { en: 'Use Auto-Resolved Rate', ml: 'ഓട്ടോ റേറ്റ് ഉപയോഗിക്കുക' },
  enter_override_amount: { en: 'Enter Custom Amount (₹)', ml: 'പുതിയ വാടക തുക അടിക്കുക (₹)' },
  resolving_rate: { en: 'Resolving Rate...', ml: 'റേറ്റ് കണക്കാക്കുന്നു...' },
  no_rate_found: { en: 'No rate configured for this combination', ml: 'ഈ കോമ്പിനേഷന് റേറ്റ് നൽകിയിട്ടില്ല' },

  // Submit Action
  record_load_btn: { en: 'RECORD LOAD', ml: 'ലോഡ് സേവ് ചെയ്യുക' },
  recording_load_progress: { en: 'Recording Load...', ml: 'സേവ് ചെയ്യുന്നു...' },
  last_recorded_truck: { en: 'Last Recorded Truck', ml: 'അവസാനം രേഖപ്പെടുത്തിയ വണ്ടി' },
  load_saved_success: { en: 'Load recorded successfully for', ml: 'ലോഡ് വിജയകരമായി സേവ് ചെയ്തു:' },

  // Load Register / Metrics
  total_loads: { en: 'Total Loads', ml: 'ആകെ ലോഡുകൾ' },
  total_turnover: { en: 'Total Turnover', ml: 'ആകെ തുക' },
  cash_volume: { en: 'Cash Volume', ml: 'ക്യാഷ് തുക' },
  credit_outstanding: { en: 'Credit Pending', ml: 'കടം തുക' },
  dispatches: { en: 'Dispatches', ml: 'ലോഡുകൾ' },
  search_loads_ph: { en: 'Search vehicle number or contractor...', ml: 'വണ്ടി നമ്പർ അല്ലെങ്കിൽ കോൺട്രാക്ടർ തിരയുക...' },
  all_sites: { en: 'All Sites', ml: 'എല്ലാ സൈറ്റുകളും' },
  all_contractors: { en: 'All Contractors', ml: 'എല്ലാ കോൺട്രാക്ടർമാരും' },
  all_payments: { en: 'All Payments (Cash & Credit)', ml: 'ക്യാഷും കടവും' },
  cash_only: { en: 'CASH Only', ml: 'ക്യാഷ് മാത്രം' },
  credit_only: { en: 'CREDIT Only', ml: 'കടം മാത്രം' },
  per_trip: { en: 'per trip', ml: 'ഒരു ട്രിപ്പ്' },
  no_loads_found: { en: 'No loads found matching filter criteria.', ml: 'ലോഡുകൾ ഒന്നും കണ്ടെത്തിയില്ല.' },
};

export type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANG_STORAGE_KEY = 'vlms_preferred_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'ml' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
