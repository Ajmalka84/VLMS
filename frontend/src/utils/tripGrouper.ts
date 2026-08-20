export interface GroupedTripRow {
  date: string;
  vehicleNumber: string;
  vehicleType?: string;
  materialName: string;
  siteName: string;
  paymentType: string;
  tripCount: number;
  rate: number;
  totalAmount: number;
}

/**
 * Groups individual scale dispatches by (Date + Vehicle + Material + Site + Payment + Rate)
 * into consolidated commercial billing rows.
 */
export function groupTrips(
  trips: Array<{
    id?: string;
    date: string | Date;
    vehicleNumber: string;
    vehicleType?: string;
    materialName: string;
    siteName: string;
    paymentType: string;
    amount: number;
  }>
): GroupedTripRow[] {
  const groups = new Map<string, GroupedTripRow>();

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
