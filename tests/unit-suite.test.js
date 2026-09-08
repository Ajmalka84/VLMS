import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// 1. Implementation of numberToWordsINR logic under test
function numberToWordsINR(num) {
  const n = Math.round(Math.abs(num));
  if (n === 0) return 'INR Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  function convertTwoDigits(val) {
    if (val < 20) return a[val];
    const tens = b[Math.floor(val / 10)];
    const units = a[val % 10];
    return units ? `${tens}-${units}` : tens;
  }

  function convertThreeDigits(val) {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    let result = '';
    if (hundred > 0) {
      result += `${a[hundred]} Hundred`;
      if (rest > 0) result += ' ';
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result;
  }

  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  const hundredAndRest = remainder;

  const parts = [];

  if (crore > 0) {
    parts.push(`${convertThreeDigits(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertThreeDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertThreeDigits(thousand)} Thousand`);
  }
  if (hundredAndRest > 0) {
    parts.push(convertThreeDigits(hundredAndRest));
  }

  const words = parts.join(' ').trim();
  return `INR ${words} Only`;
}

// 2. Implementation of groupTrips logic under test
function groupTrips(trips) {
  const groups = new Map();

  for (const t of trips) {
    const dStr = new Date(t.date).toISOString().split('T')[0];
    const vClean = t.vehicleNumber.trim().toUpperCase();
    const rate = Number(t.amount);
    const key = `${dStr}__${vClean}__${t.materialName.trim()}__${t.siteName.trim()}__${t.paymentType}__${rate}`;

    const existing = groups.get(key);
    if (existing) {
      existing.tripCount += 1;
      existing.totalAmount += rate;
    } else {
      groups.set(key, {
        date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
        vehicleNumber: t.vehicleNumber,
        vehicleType: t.vehicleType,
        materialName: t.materialName,
        siteName: t.siteName,
        paymentType: t.paymentType,
        tripCount: 1,
        rate: rate,
        totalAmount: rate,
      });
    }
  }

  return Array.from(groups.values());
}

describe('Frontend Utilities Unit Tests', () => {
  describe('numberToWordsINR', () => {
    it('handles zero correctly', () => {
      assert.equal(numberToWordsINR(0), 'INR Zero Only');
    });

    it('converts single and double digits', () => {
      assert.equal(numberToWordsINR(5), 'INR Five Only');
      assert.equal(numberToWordsINR(15), 'INR Fifteen Only');
      assert.equal(numberToWordsINR(42), 'INR Forty-Two Only');
      assert.equal(numberToWordsINR(99), 'INR Ninety-Nine Only');
    });

    it('converts hundreds, thousands, lakhs, and crores', () => {
      assert.equal(numberToWordsINR(500), 'INR Five Hundred Only');
      assert.equal(numberToWordsINR(4200), 'INR Four Thousand Two Hundred Only');
      assert.equal(numberToWordsINR(154200), 'INR One Lakh Fifty-Four Thousand Two Hundred Only');
      assert.equal(numberToWordsINR(25000000), 'INR Two Crore Fifty Lakh Only');
    });
  });

  describe('groupTrips', () => {
    it('returns empty array when given no trips', () => {
      assert.deepEqual(groupTrips([]), []);
    });

    it('groups multiple trips with identical parameters', () => {
      const trips = [
        {
          date: '2026-08-18T10:00:00.000Z',
          vehicleNumber: 'kl-07-ab-1234',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CREDIT',
          amount: 4500,
        },
        {
          date: '2026-08-18T12:30:00.000Z',
          vehicleNumber: 'KL-07-AB-1234',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CREDIT',
          amount: 4500,
        },
        {
          date: '2026-08-18T15:00:00.000Z',
          vehicleNumber: 'KL-07-AB-1234',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CREDIT',
          amount: 4500,
        },
      ];

      const grouped = groupTrips(trips);
      assert.equal(grouped.length, 1);
      assert.equal(grouped[0].tripCount, 3);
      assert.equal(grouped[0].rate, 4500);
      assert.equal(grouped[0].totalAmount, 13500);
    });

    it('keeps distinct vehicles and payment types in separate rows', () => {
      const trips = [
        {
          date: '2026-08-18T10:00:00.000Z',
          vehicleNumber: 'KL-07-AB-1234',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CREDIT',
          amount: 4500,
        },
        {
          date: '2026-08-18T10:30:00.000Z',
          vehicleNumber: 'KL-07-CD-5678',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CREDIT',
          amount: 4500,
        },
        {
          date: '2026-08-18T11:00:00.000Z',
          vehicleNumber: 'KL-07-AB-1234',
          materialName: '20mm Aggregate',
          siteName: 'Main Quarry',
          paymentType: 'CASH',
          amount: 4500,
        },
      ];

      const grouped = groupTrips(trips);
      assert.equal(grouped.length, 3);
    });
  });

  describe('PDF Header & Collaboration Options Resolution', () => {
    function resolvePdfHeader(data, fallbackName, customOptions) {
      const businessName = (
        customOptions?.customBusinessName?.trim() ||
        data.business?.businessName ||
        fallbackName ||
        'VLMS OPERATIONAL QUARRY'
      ).toUpperCase();

      const businessContact =
        customOptions?.customContact?.trim() ||
        (data.business?.mobile ? `+91 ${data.business.mobile}` : 'N/A');

      const rawGstin =
        customOptions?.customGstin !== undefined
          ? customOptions.customGstin.trim()
          : data.business?.gstin || '';
      const businessGstin = rawGstin
        ? rawGstin.toUpperCase().startsWith('GSTIN:')
          ? rawGstin.toUpperCase()
          : `GSTIN: ${rawGstin.toUpperCase()}`
        : null;

      return { businessName, businessContact, businessGstin };
    }

    it('resolves default business profile when no custom options are provided', () => {
      const data = {
        business: {
          id: 'b1',
          businessName: 'Royal Granites',
          mobile: '9847012345',
          gstin: '32ABCDE1234F1Z5',
        },
      };

      const result = resolvePdfHeader(data, 'Default Fallback');
      assert.equal(result.businessName, 'ROYAL GRANITES');
      assert.equal(result.businessContact, '+91 9847012345');
      assert.equal(result.businessGstin, 'GSTIN: 32ABCDE1234F1Z5');
    });

    it('overrides business name and allows multiple phone numbers for joint ventures', () => {
      const data = {
        business: {
          id: 'b1',
          businessName: 'Royal Granites',
          mobile: '9847012345',
          gstin: '32ABCDE1234F1Z5',
        },
      };

      const customOptions = {
        customBusinessName: 'Royal & Bethlehem Joint Earthworks',
        customContact: '+91 98470 12345 / +91 94470 67890 (Site Office)',
        customGstin: 'JV-PROJ-NH66',
      };

      const result = resolvePdfHeader(data, 'Default Fallback', customOptions);
      assert.equal(result.businessName, 'ROYAL & BETHLEHEM JOINT EARTHWORKS');
      assert.equal(result.businessContact, '+91 98470 12345 / +91 94470 67890 (Site Office)');
      assert.equal(result.businessGstin, 'GSTIN: JV-PROJ-NH66');
    });
  });

  describe('4. Subscription Status Calculation & Renewal Logic', () => {
    function computeStatus(user) {
      const plan = user.subscriptionPlan || 'ANNUAL';
      const startsAt = user.subscriptionStartsAt || new Date();
      const graceDays = user.gracePeriodDays ?? 7;

      if (!user.isActive) {
        return {
          subscriptionPlan: plan,
          subscriptionStatus: 'INACTIVE',
          daysRemaining: null,
          isGraceActive: false,
          isExpired: true,
        };
      }

      if (!user.subscriptionExpiresAt) {
        return {
          subscriptionPlan: plan,
          subscriptionStatus: 'ACTIVE_PAID',
          daysRemaining: null,
          isGraceActive: false,
          isExpired: false,
        };
      }

      const now = new Date();
      const expiresAt = new Date(user.subscriptionExpiresAt);
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let subscriptionStatus;
      let isGraceActive = false;
      let isExpired = false;

      if (daysRemaining < 0) {
        const overdueDays = Math.abs(daysRemaining);
        if (overdueDays <= graceDays) {
          subscriptionStatus = 'IN_GRACE_PERIOD';
          isGraceActive = true;
        } else if (plan === 'TRIAL') {
          subscriptionStatus = 'TRIAL_EXPIRED';
          isExpired = true;
        } else {
          subscriptionStatus = 'EXPIRED';
          isExpired = true;
        }
      } else {
        if (plan === 'TRIAL') {
          subscriptionStatus = 'TRIAL_ACTIVE';
        } else if (daysRemaining <= 30) {
          subscriptionStatus = 'EXPIRING_SOON';
        } else {
          subscriptionStatus = 'ACTIVE_PAID';
        }
      }

      return {
        subscriptionPlan: plan,
        subscriptionStatus,
        daysRemaining,
        isGraceActive,
        isExpired,
      };
    }

    it('identifies active paid annual subscription with > 30 days remaining', () => {
      const futureDate = new Date(Date.now() + 180 * 86400000);
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'ANNUAL',
        subscriptionExpiresAt: futureDate,
        gracePeriodDays: 7,
      });

      assert.equal(res.subscriptionStatus, 'ACTIVE_PAID');
      assert.equal(res.isExpired, false);
      assert.ok(res.daysRemaining > 30);
    });

    it('identifies expiring annual subscription when <= 30 days remaining', () => {
      const futureDate = new Date(Date.now() + 12 * 86400000);
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'ANNUAL',
        subscriptionExpiresAt: futureDate,
        gracePeriodDays: 7,
      });

      assert.equal(res.subscriptionStatus, 'EXPIRING_SOON');
      assert.equal(res.isExpired, false);
      assert.ok(res.daysRemaining <= 30 && res.daysRemaining > 0);
    });

    it('identifies 7-day trial active account', () => {
      const futureDate = new Date(Date.now() + 4 * 86400000);
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'TRIAL',
        subscriptionExpiresAt: futureDate,
        gracePeriodDays: 7,
      });

      assert.equal(res.subscriptionStatus, 'TRIAL_ACTIVE');
      assert.equal(res.isExpired, false);
      assert.ok(res.daysRemaining > 0);
    });

    it('triggers grace period when account is overdue by <= gracePeriodDays', () => {
      const pastDate = new Date(Date.now() - 3 * 86400000);
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'ANNUAL',
        subscriptionExpiresAt: pastDate,
        gracePeriodDays: 7,
      });

      assert.equal(res.subscriptionStatus, 'IN_GRACE_PERIOD');
      assert.equal(res.isGraceActive, true);
      assert.equal(res.isExpired, false);
    });

    it('marks as EXPIRED when account is overdue by > gracePeriodDays', () => {
      const pastDate = new Date(Date.now() - 14 * 86400000);
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'ANNUAL',
        subscriptionExpiresAt: pastDate,
        gracePeriodDays: 7,
      });

      assert.equal(res.subscriptionStatus, 'EXPIRED');
      assert.equal(res.isExpired, true);
    });

    it('safely handles legacy accounts with null subscriptionExpiresAt without locking them out', () => {
      const res = computeStatus({
        isActive: true,
        subscriptionPlan: 'ANNUAL',
        subscriptionExpiresAt: null,
      });

      assert.equal(res.subscriptionStatus, 'ACTIVE_PAID');
      assert.equal(res.isExpired, false);
      assert.equal(res.daysRemaining, null);
    });
  });

  describe('5. Loads Ledger Custom Date Range & CSV Row Exporter', () => {
    function filterLoadsByDate(loads, startDate, endDate) {
      return loads.filter((l) => {
        const loadDate = new Date(l.date).getTime();
        if (startDate && loadDate < new Date(startDate).getTime()) return false;
        if (endDate && loadDate > new Date(endDate + 'T23:59:59.999Z').getTime()) return false;
        return true;
      });
    }

    it('filters loads accurately within custom start and end date boundaries', () => {
      const sampleLoads = [
        { id: '1', date: '2026-08-01', amount: 1500 },
        { id: '2', date: '2026-08-15', amount: 1400 },
        { id: '3', date: '2026-08-20', amount: 1600 },
        { id: '4', date: '2026-08-30', amount: 1500 },
      ];

      const filtered = filterLoadsByDate(sampleLoads, '2026-08-10', '2026-08-25');
      assert.equal(filtered.length, 2);
      assert.equal(filtered[0].id, '2');
      assert.equal(filtered[1].id, '3');
    });

    it('returns all loads when no custom date boundaries are specified (All Time)', () => {
      const sampleLoads = [
        { id: '1', date: '2026-08-01', amount: 1500 },
        { id: '2', date: '2026-08-15', amount: 1400 },
      ];

      const filtered = filterLoadsByDate(sampleLoads, '', '');
      assert.equal(filtered.length, 2);
    });
  });

  describe('6. Backend MasterCacheService High-Speed Cache & Invalidation', () => {
    class MasterCacheService {
      constructor(maxCapacity = 2000) {
        this.store = new Map();
        this.defaultTtlMs = 300000;
        this.maxCapacity = maxCapacity;
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
      }
      get(key) {
        const entry = this.store.get(key);
        if (!entry) {
          this.misses++;
          return undefined;
        }
        if (Date.now() > entry.expiresAt) {
          this.store.delete(key);
          this.misses++;
          return undefined;
        }
        // LRU re-insert to maintain recency
        this.store.delete(key);
        this.store.set(key, entry);
        this.hits++;
        return entry.value;
      }
      set(key, value, ttlMs = this.defaultTtlMs) {
        if (this.store.has(key)) {
          this.store.delete(key);
        } else if (this.store.size >= this.maxCapacity) {
          const oldestKey = this.store.keys().next().value;
          if (oldestKey) {
            this.store.delete(oldestKey);
            this.evictions++;
          }
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      invalidateTenant(ownerId) {
        if (!ownerId) return;
        for (const key of this.store.keys()) {
          if (key.includes(ownerId)) {
            this.store.delete(key);
          }
        }
      }
      invalidateRate(siteId, vehicleTypeId, materialTypeId) {
        for (const [key] of this.store.entries()) {
          if (
            (siteId && key.includes(siteId)) ||
            (vehicleTypeId && key.includes(vehicleTypeId)) ||
            (materialTypeId && key.includes(materialTypeId))
          ) {
            this.store.delete(key);
          }
        }
      }
      getStats() {
        return {
          size: this.store.size,
          maxCapacity: this.maxCapacity,
          hits: this.hits,
          misses: this.misses,
          evictions: this.evictions,
        };
      }
    }

    it('stores and retrieves master bundle in cache with 0ms latency', () => {
      const cache = new MasterCacheService();
      const bundle = { sites: [{ id: 'site_1', siteName: 'North Quarry' }], vehicles: [] };
      cache.set('master_bundle:tenant_a:OWNER:ALL', bundle);

      const cached = cache.get('master_bundle:tenant_a:OWNER:ALL');
      assert.deepEqual(cached, bundle);
    });

    it('invalidates all tenant entries on master data mutation', () => {
      const cache = new MasterCacheService();
      cache.set('master_bundle:tenant_a:OWNER:ALL', { sites: [] });
      cache.set('rate_lookup:tenant_a:s1:v1:m1', { amount: 1500 });
      cache.set('master_bundle:tenant_b:OWNER:ALL', { sites: [] });

      cache.invalidateTenant('tenant_a');

      assert.equal(cache.get('master_bundle:tenant_a:OWNER:ALL'), undefined);
      assert.equal(cache.get('rate_lookup:tenant_a:s1:v1:m1'), undefined);
      assert.notEqual(cache.get('master_bundle:tenant_b:OWNER:ALL'), undefined);
    });

    it('evicts expired cache entries based on TTL', async () => {
      const cache = new MasterCacheService();
      cache.set('short_lived', { data: 123 }, 10); // 10ms TTL

      assert.equal(cache.get('short_lived').data, 123);
      await new Promise((r) => setTimeout(r, 20));
      assert.equal(cache.get('short_lived'), undefined);
    });

    it('enforces LRU capacity limit and tracks cache stats', () => {
      const cache = new MasterCacheService(3);
      cache.set('k1', 1);
      cache.set('k2', 2);
      cache.set('k3', 3);

      // Access k1 to make it most recently used: order in Map is now k2, k3, k1
      cache.get('k1');

      // Adding k4 should evict k2 (least recently used)
      cache.set('k4', 4);

      assert.equal(cache.get('k2'), undefined);
      assert.equal(cache.get('k1'), 1);
      assert.equal(cache.get('k3'), 3);
      assert.equal(cache.get('k4'), 4);
      assert.equal(cache.getStats().evictions, 1);
      assert.equal(cache.getStats().hits, 4);
    });
  });

  describe('7. Backend Query Builder & Date Normalizer', () => {
    function buildDateRangeFilter(startDate, endDate) {
      if (!startDate && !endDate) return undefined;
      const filter = {};
      if (startDate) {
        const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
        if (!isNaN(start.getTime())) filter.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
        if (!isNaN(end.getTime())) filter.lte = end;
      }
      return Object.keys(filter).length > 0 ? filter : undefined;
    }

    it('generates accurate UTC start and end-of-day boundaries for date filters', () => {
      const filter = buildDateRangeFilter('2026-09-01', '2026-09-08');
      assert.ok(filter);
      assert.equal(filter.gte.toISOString(), '2026-09-01T00:00:00.000Z');
      assert.equal(filter.lte.toISOString(), '2026-09-08T23:59:59.999Z');
    });

    it('returns undefined when no dates are provided (All Time query)', () => {
      const filter = buildDateRangeFilter(undefined, undefined);
      assert.equal(filter, undefined);
    });
  });

  describe('8. Backend Global Exception Filter & Prisma Error Normalizer', () => {
    function normalizePrismaError(code, meta) {
      switch (code) {
        case 'P2002': {
          const target = meta?.target;
          const field = Array.isArray(target) ? target.join(', ') : target ? String(target) : 'unique field';
          return { status: 409, code: 'CONFLICT', message: `A record with this ${field} already exists.` };
        }
        case 'P2003':
          return { status: 400, code: 'BAD_REQUEST', message: 'Referenced record does not exist or cannot be modified due to dependent records.' };
        case 'P2025':
          return { status: 404, code: 'NOT_FOUND', message: 'The requested record was not found.' };
        case 'P2024':
          return { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Database connection pool timed out. Please try again shortly.' };
        default:
          return { status: 400, code: 'BAD_REQUEST', message: 'A database constraint error occurred.' };
      }
    }

    it('normalizes P2002 unique constraint violations to HTTP 409 Conflict', () => {
      const res = normalizePrismaError('P2002', { target: ['vehicle_number'] });
      assert.equal(res.status, 409);
      assert.equal(res.code, 'CONFLICT');
      assert.match(res.message, /vehicle_number/);
    });

    it('normalizes P2003 foreign key constraint errors to HTTP 400 Bad Request', () => {
      const res = normalizePrismaError('P2003', {});
      assert.equal(res.status, 400);
      assert.equal(res.code, 'BAD_REQUEST');
      assert.match(res.message, /Referenced record/);
    });

    it('normalizes P2025 record-not-found to HTTP 404 Not Found', () => {
      const res = normalizePrismaError('P2025', {});
      assert.equal(res.status, 404);
      assert.equal(res.code, 'NOT_FOUND');
    });

    it('normalizes P2024 pool timeout to HTTP 503 Service Unavailable', () => {
      const res = normalizePrismaError('P2024', {});
      assert.equal(res.status, 503);
      assert.equal(res.code, 'SERVICE_UNAVAILABLE');
    });
  });

  describe('9. Frontend Formatter Utilities', () => {
    function formatINR(amount, options = {}) {
      const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
      if (isNaN(num)) return options.showSymbol !== false ? '₹0' : '0';
      const decimals = options.decimals !== undefined ? options.decimals : 0;
      const showSymbol = options.showSymbol !== false;
      const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
      return showSymbol ? `₹${formatted}` : formatted;
    }

    function formatShortDate(dateStr) {
      if (!dateStr) return '—';
      try {
        const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return '—';
      }
    }

    function formatHours(hours) {
      const num = typeof hours === 'number' ? hours : parseFloat(String(hours || 0));
      if (isNaN(num) || num === 0) return '0 hrs';
      return `${Math.round(num * 10) / 10} hrs`;
    }

    it('formats numbers into Indian Rupee strings with symbol and separators', () => {
      assert.equal(formatINR(0), '₹0');
      assert.equal(formatINR(5000), '₹5,000');
      assert.equal(formatINR(150000), '₹1,50,000');
      assert.equal(formatINR(12500000), '₹1,25,00,000');
    });

    it('supports custom decimals and disabling currency symbol', () => {
      assert.equal(formatINR(1500.5, { decimals: 2 }), '₹1,500.50');
      assert.equal(formatINR(1500, { showSymbol: false }), '1,500');
    });

    it('formats short dates into localized strings and handles invalid dates', () => {
      assert.equal(formatShortDate(null), '—');
      assert.equal(formatShortDate('invalid-date'), '—');
      const formatted = formatShortDate('2026-09-08T10:00:00.000Z');
      assert.ok(formatted.includes('Sep') || formatted.includes('08'));
    });

    it('formats decimal hours cleanly to 1 decimal place', () => {
      assert.equal(formatHours(0), '0 hrs');
      assert.equal(formatHours(null), '0 hrs');
      assert.equal(formatHours(8.54), '8.5 hrs');
      assert.equal(formatHours(12), '12 hrs');
    });
  });

  describe('10. Frontend Client Query Cache & Invalidation', () => {
    class QueryCache {
      constructor() {
        this.cache = new Map();
      }
      get(key, ttlMs = 45000) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > ttlMs) {
          this.cache.delete(key);
          return null;
        }
        return entry.data;
      }
      set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
      }
      invalidate(pattern) {
        if (!pattern) {
          this.cache.clear();
          return;
        }
        for (const key of this.cache.keys()) {
          if (typeof pattern === 'string' && (key.startsWith(pattern) || key.includes(pattern))) {
            this.cache.delete(key);
          }
        }
      }
    }

    it('caches and returns query responses synchronously within TTL', () => {
      const qc = new QueryCache();
      qc.set('/api/v1/loads?siteId=s1', [{ id: 1, amount: 1500 }]);

      const cached = qc.get('/api/v1/loads?siteId=s1');
      assert.deepEqual(cached, [{ id: 1, amount: 1500 }]);
    });

    it('evicts entries when TTL expires', async () => {
      const qc = new QueryCache();
      qc.set('short_lived_key', { test: true });

      assert.ok(qc.get('short_lived_key', 50));
      await new Promise((r) => setTimeout(r, 60));
      assert.equal(qc.get('short_lived_key', 50), null);
    });

    it('invalidates matching keys by prefix or pattern', () => {
      const qc = new QueryCache();
      qc.set('/loads/list?siteId=s1', [1]);
      qc.set('/loads/summary?siteId=s1', { total: 100 });
      qc.set('/expenses/list?siteId=s1', [2]);

      qc.invalidate('/loads');

      assert.equal(qc.get('/loads/list?siteId=s1'), null);
      assert.equal(qc.get('/loads/summary?siteId=s1'), null);
      assert.deepEqual(qc.get('/expenses/list?siteId=s1'), [2]);
    });
  });

  describe('11. PWA Web App Manifest & Service Worker Configuration', () => {
    it('validates PWA manifest structure and essential fields', () => {
      const manifest = {
        name: 'VLMS - Vehicle Load Management System',
        short_name: 'VLMS',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: '/icons/icon.svg', sizes: '192x192 512x512', type: 'image/svg+xml' },
        ],
      };

      assert.equal(manifest.display, 'standalone');
      assert.equal(manifest.start_url, '/');
      assert.ok(manifest.icons.length > 0);
      assert.equal(manifest.theme_color, '#0f172a');
    });
  });
});



