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

  describe('6. Single Trip Slip & WhatsApp Dispatch Formatter', () => {
    function formatSlipNumber(load) {
      if (!load || !load.id) return '#L-0000';
      if (load.id.startsWith('temp-')) {
        return `#L-${load.id.replace('temp-', '').slice(-4)}`;
      }
      const dateStr = load.date ? load.date.split('T')[0].replace(/-/g, '') : '';
      const hashPart = load.id.replace(/-/g, '').slice(0, 4).toUpperCase();
      return dateStr ? `#L-${dateStr.slice(2)}-${hashPart}` : `#L-${hashPart}`;
    }

    function formatSlipDateTime(load) {
      try {
        const rawDate = load.createdAt || load.date;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) {
          return { dateStr: load.date || '', timeStr: '' };
        }
        const dateStr = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = d.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        return { dateStr, timeStr };
      } catch {
        return { dateStr: load.date || '', timeStr: '' };
      }
    }

    function generateTripSlipWhatsAppText(load, businessName, contactMobile, publicUrl) {
      const slipNo = formatSlipNumber(load);
      const { dateStr, timeStr } = formatSlipDateTime(load);
      const dateTimeDisplay = timeStr ? `${dateStr}, ${timeStr}` : dateStr;
      const numAmount = Number(load.amount || 0);
      const formattedAmount = numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      
      const siteName = load.site?.siteName || 'Site Dispatch';
      const siteLocation = load.site?.location ? ` (${load.site.location})` : '';
      const vehicleNum = load.vehicle?.vehicleNumber || 'N/A';
      const vehicleType = load.vehicle?.vehicleType?.name ? ` (${load.vehicle.vehicleType.name})` : '';
      const materialName = load.materialType?.name || 'Material';
      const contractorName = load.contractor?.name || 'Direct / Spot Sale';
      const paymentMode = load.paymentType === 'CASH' ? '💵 CASH [PAID]' : '📝 CREDIT [A/C]';

      const lines = [
        `🚚 *TRIP DISPATCH SLIP*`,
        `🏢 *${businessName || 'Quarry & Material Yard'}*`,
        contactMobile ? `📞 ${contactMobile}` : '',
        `📍 *Site:* ${siteName}${siteLocation}`,
        `🔖 *Slip No:* ${slipNo}`,
        `📅 *Date & Time:* ${dateTimeDisplay}`,
        `───────────────────────────`,
        `🚛 *Vehicle:* ${vehicleNum}${vehicleType}`,
        `📦 *Material:* ${materialName}`,
        `👤 *Contractor (C/O):* ${contractorName}`,
        `💳 *Payment Mode:* ${paymentMode}`,
        `💰 *Total Amount:* ₹${formattedAmount}`,
      ];

      if (load.remarks && load.remarks.trim()) {
        lines.push(`📝 *Remarks:* ${load.remarks.trim()}`);
      }

      if (publicUrl) {
        lines.push(`🔗 *Digital Slip & PDF:* ${publicUrl}`);
      }

      lines.push(`───────────────────────────`);
      lines.push(`_Generated via VLMS Gate System_`);

      return lines.filter((l) => l !== '').join('\n');
    }

    it('formats slip numbers consistently for UUID and date stamps', () => {
      const load = { id: '5a3c663b-dd40-4b3b-b0c0-1f6a0af24136', date: '2026-09-01T00:00:00.000Z' };
      const slipNo = formatSlipNumber(load);
      assert.equal(slipNo, '#L-260901-5A3C');
    });

    it('handles temporary optimistic IDs gracefully', () => {
      const load = { id: 'temp-1788259999', date: '2026-09-01T00:00:00.000Z' };
      const slipNo = formatSlipNumber(load);
      assert.equal(slipNo, '#L-9999');
    });

    it('generates structured WhatsApp text with Indian currency and line items', () => {
      const load = {
        id: '5a3c663b-dd40-4b3b-b0c0-1f6a0af24136',
        date: '2026-09-01T00:00:00.000Z',
        createdAt: '2026-09-01T14:30:00.000Z',
        amount: '6000',
        paymentType: 'CASH',
        site: { siteName: 'Kuruppampady Quarry', location: 'Ernakulam' },
        vehicle: { vehicleNumber: 'KL-40-Q-552', vehicleType: { name: '6-Wheeler' } },
        materialType: { name: 'M-Sand' },
        contractor: { name: 'Shaji Earthmovers' },
        remarks: 'Direct gate delivery',
      };

      const text = generateTripSlipWhatsAppText(
        load,
        'Valiyaparambil Granites',
        '9847012345',
        'https://vlms.app/slip/5a3c663b-dd40-4b3b-b0c0-1f6a0af24136'
      );

      assert.match(text, /TRIP DISPATCH SLIP/);
      assert.match(text, /Valiyaparambil Granites/);
      assert.match(text, /9847012345/);
      assert.match(text, /KL-40-Q-552 \(6-Wheeler\)/);
      assert.match(text, /M-Sand/);
      assert.match(text, /Shaji Earthmovers/);
      assert.match(text, /💵 CASH \[PAID\]/);
      assert.match(text, /₹6,000\.00/);
      assert.match(text, /Direct gate delivery/);
      assert.match(text, /https:\/\/vlms\.app\/slip\/5a3c663b-dd40-4b3b-b0c0-1f6a0af24136/);
    });
  });
});




