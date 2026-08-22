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

  // Reports & Settlements Module
  settlement_reports_title: { en: 'Settlement Reports', ml: 'സെറ്റിൽമെന്റ് റിപ്പോർട്ടുകൾ' },
  settlement_reports_sub: {
    en: 'Contractor billing aggregation, vehicle/material volume breakdowns, and printable statements.',
    ml: 'കോൺട്രാക്ടർമാരുടെ ബില്ലിംഗ് കണക്കുകൾ, മെറ്റീരിയൽ അളവുകൾ, പ്രിന്റ് ചെയ്യാവുന്ന സ്റ്റേറ്റ്‌മെന്റുകൾ.',
  },
  contractors_overview: { en: 'C/O Contractors Overview', ml: 'എല്ലാ കോൺട്രാക്ടർമാരുടെയും കണക്ക്' },
  contractor_statement: { en: 'Settlement Statement', ml: 'സെറ്റിൽമെന്റ് സ്റ്റേറ്റ്‌മെന്റ്' },
  generate_statement: { en: 'Generate Statement', ml: 'കണക്ക് എടുക്കുക' },
  back_to_contractors: { en: 'Back to Contractors', ml: 'തിരികെ ലിസ്റ്റിലേക്ക്' },
  active_contractors: { en: 'Active Contractors', ml: 'ആക്ടീവ് കോൺട്രാക്ടർമാർ' },
  total_billed: { en: 'Total Billed', ml: 'ആകെ ബിൽ ചെയ്തത്' },
  cash_settled: { en: 'Cash Settled', ml: 'ക്യാഷ് നൽകിയത്' },
  net_payable: { en: 'Net Credit Balance', ml: 'ബാക്കി നിൽക്കുന്ന കടം തുക' },
  statement_for: { en: 'Statement for', ml: 'സ്റ്റേറ്റ്‌മെന്റ്:' },
  billed_to: { en: 'Billed To (C/O Contractor)', ml: 'ബിൽ ചെയ്തത് (കോൺട്രാക്ടർ)' },
  period: { en: 'Period', ml: 'കാലയളവ്' },
  all_time: { en: 'All Time', ml: 'മുഴുവൻ കാലയളവ്' },
  this_month: { en: 'This Month', ml: 'ഈ മാസം' },
  last_7_days: { en: 'Last 7 Days', ml: 'കഴിഞ്ഞ 7 ദിവസം' },
  yesterday: { en: 'Yesterday', ml: 'ഇന്നലെ' },
  custom_range: { en: 'Custom Date Range', ml: 'തീയതി തിരഞ്ഞെടുക്കുക' },
  filter_by_site: { en: 'Filter Site', ml: 'സൈറ്റ് മാറ്റുക' },
  filter_by_payment: { en: 'Payment Mode', ml: 'പേയ്‌മെന്റ്' },
  material_volume_breakdown: { en: 'Material Breakdown', ml: 'മെറ്റീരിയൽ തിരിച്ചുള്ള കണക്ക്' },
  vehicle_fleet_breakdown: { en: 'Vehicle Fleet Breakdown', ml: 'വണ്ടി തിരിച്ചുള്ള കണക്ക്' },
  itemized_trip_log: { en: 'Itemized Dispatch Trips', ml: 'ഓരോ ട്രിപ്പുകളുടെയും വിവരങ്ങൾ' },
  trip_no: { en: 'Trip #', ml: 'ട്രിപ്പ്' },
  date_time: { en: 'Date & Time', ml: 'തീയതി & സമയം' },
  vehicle_no: { en: 'Vehicle No', ml: 'വണ്ടി നമ്പർ' },
  vehicle_type: { en: 'Vehicle Type', ml: 'വണ്ടി തരം' },
  material: { en: 'Material', ml: 'മെറ്റീരിയൽ' },
  site: { en: 'Site', ml: 'സൈറ്റ്' },
  amount: { en: 'Amount (₹)', ml: 'തുക (₹)' },
  download_pdf: { en: 'Download PDF', ml: 'PDF ഡൗൺലോഡ്' },
  print_pdf: { en: 'Print Slip', ml: 'പ്രിന്റ് സ്ലിപ്പ്' },
  export_csv: { en: 'Export CSV', ml: 'CSV ഡൗൺലോഡ്' },
  customize_bill_modal_title: { en: 'Customize Bill Header', ml: 'ബില്ലിലെ പേര് & ഫോൺ മാറ്റുക' },
  customize_bill_modal_sub: {
    en: 'Customize the business or joint-venture name and contact numbers displayed on the PDF bill.',
    ml: 'ബില്ലിൽ കാണിക്കേണ്ട സ്ഥാപനത്തിന്റെ പേരും ഫോൺ നമ്പറുകളും മാറ്റുക.',
  },
  bill_business_name_label: { en: 'Business / Collaboration Name', ml: 'സ്ഥാപനം / പാർട്ണർഷിപ്പ് പേര്' },
  bill_contact_numbers_label: { en: 'Contact Phone Number(s)', ml: 'ഫോൺ നമ്പർ (ഒന്നോ അതിലധികമോ)' },
  bill_contact_numbers_ph: { en: 'e.g. +91 98470 12345 / +91 94470 67890', ml: 'ഉദാ: +91 98470 12345 / +91 94470 67890' },
  bill_contact_numbers_hint: { en: 'Enter single or multiple numbers for joint partners / site managers.', ml: 'പാർട്ണർമാരുടെയോ സൈറ്റ് മാനേജരുടെയോ ഫോൺ നമ്പറുകൾ നൽകാം.' },
  bill_gstin_label: { en: 'GSTIN / Project Reference (Optional)', ml: 'ജി.എസ്.ടി / പ്രോജക്ട് റഫറൻസ് (നിർബന്ധമില്ല)' },
  download_pdf_bill: { en: 'Download PDF Bill', ml: 'ബിൽ PDF ഡൗൺലോഡ് ചെയ്യുക' },
  reset_defaults: { en: 'Reset Defaults', ml: 'റീസെറ്റ് ചെയ്യുക' },
  authorized_signature: { en: 'Authorized Signatory', ml: 'അംഗീകൃത ഒപ്പ്' },
  contractor_signature: { en: 'Contractor Signature', ml: 'കോൺട്രാക്ടറുടെ ഒപ്പ്' },
  no_contractors_found: { en: 'No contractors registered yet.', ml: 'കോൺട്രാക്ടർമാർ ആരും രജിസ്റ്റർ ചെയ്തിട്ടില്ല.' },
  no_settlement_trips: { en: 'No trips recorded for this contractor in the selected period.', ml: 'തിരഞ്ഞെടുത്ത കാലയളവിൽ ഈ കോൺട്രാക്ടർക്ക് ട്രിപ്പുകൾ ഒന്നും രേഖപ്പെടുത്തിയിട്ടില്ല.' },
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

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, []);

  const t = React.useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[language] || entry.en || key;
    },
    [language]
  );

  const value = React.useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
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
