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
});
