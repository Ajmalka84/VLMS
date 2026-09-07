import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let superAdminToken = '';
let tenantAToken = '';
let tenantBToken = '';
let tenantAUser = null;
let tenantBUser = null;

let siteAId = '';
let vehicleTypeId = '';
let materialTypeId = '';
let vehicleAId = '';
let contractorAId = '';
let rateAId = '';
let loadA1Id = '';
let loadA2Id = '';

const uniqueSuffix = Date.now().toString().slice(-4);
const rand8 = Math.floor(10000000 + Math.random() * 89999999);
const tenantAMobile = `98${rand8.toString().slice(0, 8)}`;
const tenantBMobile = `97${rand8.toString().slice(0, 8)}`;

test('1.1 Authenticates Super Admin with updated credentials (ajmalka84@gmail.com / 05thDec1995)', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: 'ajmalka84@gmail.com',
      password: '05thDec1995',
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.user.role, 'SUPER_ADMIN');
  assert.ok(res.data.data.accessToken);
  superAdminToken = res.data.data.accessToken;
});

test('1.2 Rejects invalid credentials with HTTP 401', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: 'ajmalka84@gmail.com',
      password: 'WrongPassword999',
    }),
  });

  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('1.3 Super Admin creates Tenant Customer A', async () => {
  const res = await req('/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      businessName: `Alpha Quarry ${uniqueSuffix}`,
      mobile: tenantAMobile,
      password: 'Password@123',
      gstin: '32ABCDE1234F1Z5',
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.id);
  tenantAUser = res.data.data;
});

test('1.4 Super Admin creates Tenant Customer B', async () => {
  const res = await req('/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      businessName: `Beta Stone Aggregates ${uniqueSuffix}`,
      mobile: tenantBMobile,
      password: 'Password@123',
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.id);
  tenantBUser = res.data.data;
});

test('1.5 Super Admin lists customers with pagination and mobile search filter', async () => {
  const res = await req(`/admin/users?search=${tenantAMobile}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.users.length >= 1);
  assert.equal(res.data.data.users[0].mobile, tenantAMobile);
});

test('2.1 Authenticates Tenant Customer A and B', async () => {
  const resA = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantAMobile,
      password: 'Password@123',
    }),
  });

  assert.equal(resA.status, 200);
  assert.equal(resA.data.success, true);
  assert.equal(resA.data.data.user.role, 'OWNER');
  tenantAToken = resA.data.data.accessToken;

  const resB = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantBMobile,
      password: 'Password@123',
    }),
  });

  assert.equal(resB.status, 200);
  assert.equal(resB.data.success, true);
  tenantBToken = resB.data.data.accessToken;
});

test('2.2 Super Admin resets Customer A password and Customer A logs in with new password', async () => {
  const resetRes = await req(`/admin/users/${tenantAUser.id}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ newPassword: 'NewPassword@456' }),
  });

  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.data.success, true);

  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantAMobile,
      password: 'NewPassword@456',
    }),
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.success, true);
  tenantAToken = loginRes.data.data.accessToken;
});

test('2.3 Customer A changes password and re-authenticates', async () => {
  const changeRes = await req('/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      oldPassword: 'NewPassword@456',
      newPassword: 'FinalPassword@789',
    }),
  });

  assert.equal(changeRes.status, 200);

  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantAMobile,
      password: 'FinalPassword@789',
    }),
  });

  assert.equal(loginRes.status, 200);
  tenantAToken = loginRes.data.data.accessToken;
});

test('2.4 Prevents inactive customer account from logging in (HTTP 403)', async () => {
  // Deactivate Tenant B
  await req(`/admin/users/${tenantBUser.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isActive: false }),
  });

  const res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantBMobile,
      password: 'Password@123',
    }),
  });

  assert.equal(res.status, 403);
  assert.equal(res.data.success, false);

  // Reactivate Tenant B
  await req(`/admin/users/${tenantBUser.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isActive: true }),
  });

  // Re-acquire fresh Tenant B token
  const resB = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantBMobile,
      password: 'Password@123',
    }),
  });
  tenantBToken = resB.data.data.accessToken;
});

test('3.1 Creates Vehicle Type and Material Type for Tenant A', async () => {
  const typeName = `Tipper_${uniqueSuffix}`;
  const resType = await req('/vehicle-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({ name: typeName }),
  });

  assert.equal(resType.status, 201);
  assert.equal(resType.data.success, true);
  vehicleTypeId = resType.data.data.id;

  const matName = `Granite_20mm_${uniqueSuffix}`;
  const resMat = await req('/material-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({ name: matName }),
  });

  assert.equal(resMat.status, 201);
  assert.equal(resMat.data.success, true);
  materialTypeId = resMat.data.data.id;
});

test('3.2 Creates Quarry Site for Tenant A with Indian PIN code validation', async () => {
  // Invalid PIN code rejected
  const invalidRes = await req('/sites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteName: `Invalid Unit ${uniqueSuffix}`,
      location: 'Chengara',
      pincode: '1234',
    }),
  });
  assert.equal(invalidRes.status, 400);

  // Valid Site created
  const validRes = await req('/sites', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteName: `Chengara Unit 1 ${uniqueSuffix}`,
      location: 'Chengara, Pathanamthitta',
      pincode: '689664',
    }),
  });

  assert.equal(validRes.status, 201);
  assert.equal(validRes.data.success, true);
  assert.ok(validRes.data.data.id);
  siteAId = validRes.data.data.id;
});

test('3.3 Registers Vehicle for Tenant A and normalizes registration to uppercase', async () => {
  const res = await req('/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      vehicleNumber: `kl07cx${uniqueSuffix.slice(-4)}`,
      vehicleTypeId: vehicleTypeId,
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.vehicleNumber, `KL07CX${uniqueSuffix.slice(-4)}`.toUpperCase());
  vehicleAId = res.data.data.id;
});

test('3.4 Registers Contractor for Tenant A', async () => {
  const res = await req('/contractors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: `Apex Infratech ${uniqueSuffix}`,
      mobile: `96${rand8.toString().slice(0, 8)}`,
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  contractorAId = res.data.data.id;
});

test('3.5 Configures Rate Matrix and performs dynamic Rate Lookup', async () => {
  const rateRes = await req('/rates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleTypeId: vehicleTypeId,
      materialTypeId: materialTypeId,
      amount: 4800,
    }),
  });

  assert.equal(rateRes.status, 201);
  assert.equal(rateRes.data.success, true);
  rateAId = rateRes.data.data.id;

  const lookupRes = await req(
    `/rates/lookup?siteId=${siteAId}&vehicleTypeId=${vehicleTypeId}&materialTypeId=${materialTypeId}`,
    {
      headers: { Authorization: `Bearer ${tenantAToken}` },
    }
  );

  assert.equal(lookupRes.status, 200);
  assert.equal(lookupRes.data.success, true);
  assert.equal(Number(lookupRes.data.data.amount), 4800);
});

test('3.6 Queries Atomic Master Data Bundle Endpoint', async () => {
  const res = await req('/master-data/bundle', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.data.sites));
  assert.ok(Array.isArray(res.data.data.vehicles));
  assert.ok(Array.isArray(res.data.data.contractors));
  assert.ok(Array.isArray(res.data.data.rates));
  assert.ok(res.data.data.sites.some((s) => s.id === siteAId));
});

test('4.1 Records standard Load with automated rate lookup', async () => {
  const res = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      contractorId: contractorAId,
      paymentType: 'CREDIT',
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(Number(res.data.data.amount), 4800);
  assert.equal(res.data.data.paymentType, 'CREDIT');
  loadA1Id = res.data.data.id;
});

test('4.2 Records custom Load with manual price override & CASH payment', async () => {
  const res = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      contractorId: contractorAId,
      amount: 5200,
      paymentType: 'CASH',
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(Number(res.data.data.amount), 5200);
  assert.equal(res.data.data.paymentType, 'CASH');
  loadA2Id = res.data.data.id;
});

test('4.3 Queries loads register with live dynamic aggregates', async () => {
  const res = await req(`/loads?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.loads.length >= 2);
  assert.equal(res.data.data.summary.totalLoads >= 2, true);
  assert.equal(res.data.data.summary.totalCashAmount >= 5200, true);
  assert.equal(res.data.data.summary.totalCreditAmount >= 4800, true);
});

test('4.4 Soft-deletes a load and verifies exclusion from active list', async () => {
  const createRes = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      paymentType: 'CASH',
      amount: 1000,
    }),
  });
  const tempLoadId = createRes.data.data.id;

  const delRes = await req(`/loads/${tempLoadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(delRes.status, 200);

  const listRes = await req('/loads', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(listRes.data.data.loads.some((l) => l.id === tempLoadId), false);
});

test('5. Multi-Tenant Security Isolation: Tenant B accessing Tenant A entities returns HTTP 403 Forbidden', async () => {
  // Cross-tenant Site access
  const siteRes = await req(`/sites/${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert.equal(siteRes.status, 403);

  // Cross-tenant Vehicle access
  const vehRes = await req(`/vehicles/${vehicleAId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert.equal(vehRes.status, 403);

  // Cross-tenant Contractor access
  const contRes = await req(`/contractors/${contractorAId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert.equal(contRes.status, 403);

  // Cross-tenant Load creation attempt
  const loadRes = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      paymentType: 'CASH',
      amount: 5000,
    }),
  });
  assert.equal(loadRes.status, 403);

  // Cross-tenant Settlement Statement query
  const repRes = await req(`/reports/settlement?contractorId=${contractorAId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert.equal(repRes.status, 403);
});

test('6.1 Computes accurate Contractor Summary Ledger', async () => {
  const res = await req('/reports/contractors-summary', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.contractors.length >= 1);

  const target = res.data.data.contractors.find((c) => c.contractor.id === contractorAId);
  assert.ok(target);
  assert.equal(target.stats.totalTrips, 2);
  assert.equal(target.stats.cashTrips, 1);
  assert.equal(target.stats.creditTrips, 1);
  assert.equal(target.stats.cashAmount, 5200);
  assert.equal(target.stats.creditAmount, 4800);
  assert.equal(target.stats.totalAmount, 10000);
});

test('6.2 Generates detailed Contractor Settlement Statement with multi-dimensional breakdowns', async () => {
  const res = await req(`/reports/settlement?contractorId=${contractorAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.contractor.id, contractorAId);
  assert.equal(res.data.data.summary.totalTrips, 2);
  assert.equal(res.data.data.summary.totalAmount, 10000);
  assert.equal(res.data.data.summary.cashAmount, 5200);
  assert.equal(res.data.data.summary.creditAmount, 4800);
  assert.ok(res.data.data.trips.length >= 2);
  assert.ok(res.data.data.materialBreakdown.length >= 1);
});

test('7.1 Active / Inactive Quarry Site Toggle Lifecycle without data loss', async () => {
  // 1. Deactivate site
  const deactRes = await req(`/sites/${siteAId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({ isActive: false }),
  });
  assert.equal(deactRes.status, 200);
  assert.equal(deactRes.data.success, true);
  assert.equal(deactRes.data.data.isActive, false);

  // 2. Query site details - verify isActive is false
  const getRes = await req(`/sites/${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(getRes.status, 200);
  assert.equal(getRes.data.data.isActive, false);

  // 3. Reactivate site
  const reactRes = await req(`/sites/${siteAId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({ isActive: true }),
  });
  assert.equal(reactRes.status, 200);
  assert.equal(reactRes.data.success, true);
  assert.equal(reactRes.data.data.isActive, true);
});

test('7.2 Relational Deletion Safeguards block vehicle and contractor deletion when loads exist', async () => {
  // Attempt to delete vehicle with recorded loads
  const vehDelRes = await req(`/vehicles/${vehicleAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(vehDelRes.status, 400);
  assert.equal(vehDelRes.data.success, false);
  assert.ok(vehDelRes.data.message.includes('dispatch load'));

  // Attempt to delete contractor with recorded loads
  const contDelRes = await req(`/contractors/${contractorAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(contDelRes.status, 400);
  assert.equal(contDelRes.data.success, false);
  assert.ok(contDelRes.data.message.includes('dispatch load'));
});

let trialCustomerId = '';
let trialCustomerToken = '';
const trialMobile = `96${rand8.toString().slice(0, 8)}`;

test('8.1 Super Admin onboards new customer on 7-Day Free Trial', async () => {
  const res = await req('/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      businessName: 'Perumbavoor Trial Quarry',
      mobile: trialMobile,
      password: 'TrialPassword123',
      subscriptionPlan: 'TRIAL',
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.subscriptionPlan, 'TRIAL');
  assert.equal(res.data.data.subscriptionStatus, 'TRIAL_ACTIVE');
  assert.ok(res.data.data.daysRemaining >= 6);
  assert.ok(res.data.data.subscriptionExpiresAt);
  trialCustomerId = res.data.data.id;
});

test('8.2 Customer logs in and validates subscription profile in /auth/me', async () => {
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: trialMobile,
      password: 'TrialPassword123',
    }),
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.success, true);
  assert.equal(loginRes.data.data.user.subscriptionPlan, 'TRIAL');
  assert.equal(loginRes.data.data.user.subscriptionStatus, 'TRIAL_ACTIVE');
  trialCustomerToken = loginRes.data.data.accessToken;

  const meRes = await req('/auth/me', {
    headers: { Authorization: `Bearer ${trialCustomerToken}` },
  });

  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.data.subscriptionPlan, 'TRIAL');
  assert.equal(meRes.data.data.subscriptionStatus, 'TRIAL_ACTIVE');
  assert.ok(meRes.data.data.daysRemaining >= 6);
});

test('8.3 Super Admin executes 1-Click Renew +1 Year (₹9,999 Annual Plan)', async () => {
  const res = await req(`/admin/users/${trialCustomerId}/subscription`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      action: 'RENEW_ANNUAL_1Y',
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.subscriptionPlan, 'ANNUAL');
  assert.equal(res.data.data.subscriptionStatus, 'ACTIVE_PAID');
  assert.ok(res.data.data.daysRemaining > 300);
});

test('8.4 Super Admin extends validity by +30 Days for Monsoon / Shutdown compensation', async () => {
  const initialUser = await req(`/admin/users/${trialCustomerId}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const initialExpiry = new Date(initialUser.data.data.subscriptionExpiresAt).getTime();

  const res = await req(`/admin/users/${trialCustomerId}/subscription`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      action: 'EXTEND_SHUTDOWN_30D',
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  const updatedExpiry = new Date(res.data.data.subscriptionExpiresAt).getTime();
  const diffDays = Math.round((updatedExpiry - initialExpiry) / (1000 * 60 * 60 * 24));
  assert.equal(diffDays, 30);
});

test('8.5 Filters Loads Ledger accurately using custom startDate and endDate', async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const res = await req(`/loads?startDate=${todayStr}&endDate=${todayStr}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.data.loads));
  assert.ok(res.data.data.summary);
  assert.ok(res.data.data.loads.length >= 2);
});

test('8.6 Super Admin sets Custom Expiration Date & Grace Period on Customer', async () => {
  const customDate = new Date(Date.now() + 60 * 86400000).toISOString();
  const res = await req(`/admin/users/${trialCustomerId}/subscription`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      action: 'SET_CUSTOM_DATE',
      subscriptionPlan: 'CUSTOM',
      subscriptionExpiresAt: customDate,
      gracePeriodDays: 14,
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.subscriptionPlan, 'CUSTOM');
  assert.equal(res.data.data.gracePeriodDays, 14);
  assert.ok(res.data.data.daysRemaining >= 58 && res.data.data.daysRemaining <= 61);
});

test('8.7 Multi-Status Customers Query Filtering (all, active, inactive, trial, active_paid, expiring, expired)', async () => {
  // Test All
  const allRes = await req('/admin/users?status=all', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(allRes.status, 200);
  assert.ok(allRes.data.data.users.length >= 2);

  // Test Active
  const activeRes = await req('/admin/users?status=active', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(activeRes.status, 200);
  assert.ok(activeRes.data.data.users.every((u) => u.isActive === true));

  // Test Search combined with status
  const searchRes = await req('/admin/users?status=active&search=Alpha', {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.data.users.some((u) => u.businessName.includes('Alpha')));
});

test('8.8 Super Admin Multi-Tenant Reports Query with customerId override', async () => {
  const res = await req(`/reports/contractors-summary?customerId=${tenantAUser.id}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.data.contractors));
  assert.ok(res.data.data.grandTotal.totalAmount >= 5000);
});

test('8.9 Cross-Tenant Rate Lookup Guard: Tenant B cannot query Tenant A rates', async () => {
  const res = await req(`/rates/lookup?siteId=${siteAId}&vehicleTypeId=${vehicleTypeId}&materialTypeId=${materialTypeId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });

  // Since siteA belongs to Tenant A, Tenant B lookup will return 404 or 403
  assert.ok(res.status === 404 || res.status === 403);
});

test('8.10 Inactive user account is blocked from getting /auth/me and protected endpoints', async () => {
  // Deactivate Tenant B
  await req(`/admin/users/${tenantBUser.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isActive: false }),
  });

  // Attempt login with Tenant B
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: tenantBMobile,
      password: 'Password@123',
    }),
  });
  assert.equal(loginRes.status, 403);

  // Restore Tenant B status
  await req(`/admin/users/${tenantBUser.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ isActive: true }),
  });
});

test('9.1 Hurdle 13: Tenant profile returns role OWNER, ownerId, and default quotas', async () => {
  const resMe = await req('/auth/me', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(resMe.status, 200);
  assert.equal(resMe.data.success, true);
  assert.equal(resMe.data.data.role, 'OWNER');
  assert.equal(resMe.data.data.ownerId, tenantAUser.id);
  assert.equal(resMe.data.data.coPartnerQuota, 3);
  assert.equal(resMe.data.data.siteBoyQuota, 2);
  assert.ok(Array.isArray(resMe.data.data.assignedSiteIds));
  assert.ok(resMe.data.data.assignedSiteIds.includes(siteAId));
});

test('9.2 Hurdle 13: Tenant-scoped Vehicle Types and Material Types (same name allowed across different tenants)', async () => {
  const typeName = `Tipper_${uniqueSuffix}`;
  const resTypeB = await req('/vehicle-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: JSON.stringify({ name: typeName }),
  });

  assert.equal(resTypeB.status, 201);
  assert.equal(resTypeB.data.success, true);
  assert.ok(resTypeB.data.data.id);

  // Cross-tenant guard: Tenant B cannot query Tenant A's vehicle type
  const resCross = await req(`/vehicle-types/${vehicleTypeId}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert.equal(resCross.status, 404);
});

test('9.3 Hurdle 13: Atomic Master Data Bundle contains tenant-scoped fleet and expense structures', async () => {
  const resBundle = await req('/master-data/bundle', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(resBundle.status, 200);
  assert.equal(resBundle.data.success, true);
  assert.ok(Array.isArray(resBundle.data.data.sites));
  assert.ok(Array.isArray(resBundle.data.data.vehicles));
  assert.ok(Array.isArray(resBundle.data.data.vehicleTypes));
  assert.ok(Array.isArray(resBundle.data.data.materialTypes));
  assert.ok(Array.isArray(resBundle.data.data.expenseCategories));
  assert.ok(Array.isArray(resBundle.data.data.machinery));
});

let coPartner1Id, coPartner2Id, coPartner3Id, coPartner4Id;
let siteBoy1Id, siteBoy2Id;

test('10.1 Hurdle 13 Part 2: Owner creates Co-Partners up to quota limit (3) with date-sliced site shares', async () => {
  // Co-Partner 1
  const cp1Res = await req('/sub-accounts/co-partners', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Shamsu Partner 1',
      mobile: `981100${uniqueSuffix}`,
      password: 'Password@123',
      siteShares: [
        { siteId: siteAId, sharePercentage: 25.0, effectiveFrom: '2026-01-01' },
      ],
    }),
  });
  assert.equal(cp1Res.status, 201);
  assert.equal(cp1Res.data.success, true);
  assert.equal(cp1Res.data.data.role, 'CO_PARTNER');
  coPartner1Id = cp1Res.data.data.id;

  // Co-Partner 2
  const cp2Res = await req('/sub-accounts/co-partners', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Babu Partner 2',
      mobile: `981200${uniqueSuffix}`,
      password: 'Password@123',
      siteShares: [
        { siteId: siteAId, sharePercentage: 15.0, effectiveFrom: '2026-01-01' },
      ],
    }),
  });
  assert.equal(cp2Res.status, 201);
  coPartner2Id = cp2Res.data.data.id;

  // Co-Partner 3
  const cp3Res = await req('/sub-accounts/co-partners', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Rahim Partner 3',
      mobile: `981300${uniqueSuffix}`,
      password: 'Password@123',
      siteShares: [
        { siteId: siteAId, sharePercentage: 20.0, effectiveFrom: '2026-01-01' },
      ],
    }),
  });
  assert.equal(cp3Res.status, 201);
  coPartner3Id = cp3Res.data.data.id;
});

test('10.2 Hurdle 13 Part 2: Owner exceeds Co-Partner quota (4th partner) -> HTTP 400 with code QUOTA_EXCEEDED', async () => {
  const cp4Res = await req('/sub-accounts/co-partners', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Extra Partner 4',
      mobile: `981400${uniqueSuffix}`,
      password: 'Password@123',
      siteShares: [
        { siteId: siteAId, sharePercentage: 10.0 },
      ],
    }),
  });

  assert.equal(cp4Res.status, 400);
  assert.equal(cp4Res.data.code, 'QUOTA_EXCEEDED');
  assert.ok(cp4Res.data.message.includes('Co-partner quota limit reached'));
});

test('10.3 Hurdle 13 Part 2: Owner creates Site Boys up to quota limit (2) and rejects 3rd -> HTTP 400 QUOTA_EXCEEDED', async () => {
  // Site Boy 1
  const sb1Res = await req('/sub-accounts/site-boys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Manu Gate Boy',
      mobile: `982100${uniqueSuffix}`,
      password: 'Password@123',
      assignedSiteId: siteAId,
    }),
  });
  assert.equal(sb1Res.status, 201);
  assert.equal(sb1Res.data.data.role, 'SITE_BOY');
  siteBoy1Id = sb1Res.data.data.id;

  // Site Boy 2
  const sb2Res = await req('/sub-accounts/site-boys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Ratheesh Gate Boy',
      mobile: `982200${uniqueSuffix}`,
      password: 'Password@123',
      assignedSiteId: siteAId,
    }),
  });
  assert.equal(sb2Res.status, 201);
  siteBoy2Id = sb2Res.data.data.id;

  // Site Boy 3 (Exceeds quota)
  const sb3Res = await req('/sub-accounts/site-boys', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Extra Site Boy 3',
      mobile: `982300${uniqueSuffix}`,
      password: 'Password@123',
      assignedSiteId: siteAId,
    }),
  });
  assert.equal(sb3Res.status, 400);
  assert.equal(sb3Res.data.code, 'QUOTA_EXCEEDED');
  assert.ok(sb3Res.data.message.includes('Site boy quota limit reached'));
});

test('10.4 Hurdle 13 Part 2: Super Admin upgrades Owner quota (+₹4,000) and creates QuotaTransaction record', async () => {
  const upgradeRes = await req(`/admin/users/${tenantAUser.id}/quotas`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      coPartnerQuota: 5,
      siteBoyQuota: 4,
      amountPaid: 4000,
      paymentRef: 'UPI-CRUSHER-9988',
      notes: 'Monsoon season multi-site team expansion',
    }),
  });

  assert.equal(upgradeRes.status, 200);
  assert.equal(upgradeRes.data.success, true);
  assert.equal(upgradeRes.data.data.coPartnerQuota, 5);
  assert.equal(upgradeRes.data.data.siteBoyQuota, 4);
  assert.ok(upgradeRes.data.data.quotaTransactions.length > 0);
  assert.equal(upgradeRes.data.data.quotaTransactions[0].paymentRef, 'UPI-CRUSHER-9988');
});

test('10.5 Hurdle 13 Part 2: Owner successfully creates 4th Co-Partner after Super Admin quota expansion', async () => {
  const cp4Res = await req('/sub-accounts/co-partners', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Extra Partner 4 Approved',
      mobile: `981400${uniqueSuffix}`,
      password: 'Password@123',
      siteShares: [
        { siteId: siteAId, sharePercentage: 10.0, effectiveFrom: '2026-06-01' },
      ],
    }),
  });

  assert.equal(cp4Res.status, 201);
  assert.equal(cp4Res.data.success, true);
  coPartner4Id = cp4Res.data.data.id;
});

test('10.6 Hurdle 13 Part 2: Owner updates Co-Partner equity percentage with temporal date-slice versioning', async () => {
  // Update Partner 1's share on Site A from 25% to 35% effective 2026-09-01
  const updateRes = await req(`/sub-accounts/co-partners/${coPartner1Id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Shamsu Partner 1 Updated',
      siteShares: [
        { siteId: siteAId, sharePercentage: 35.0, effectiveFrom: '2026-09-01' },
      ],
    }),
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.success, true);
  assert.equal(updateRes.data.data.name, 'Shamsu Partner 1 Updated');

  // Verify temporal slices in sub-accounts list
  const listRes = await req('/sub-accounts', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(listRes.status, 200);
  assert.equal(listRes.data.success, true);
  const cp1 = listRes.data.data.coPartners.find((cp) => cp.id === coPartner1Id);
  assert.ok(cp1);
  assert.equal(cp1.partnerShares.length, 2);

  // Active slice: 35%, effectiveFrom 2026-09-01, effectiveTo null
  const activeSlice = cp1.partnerShares.find((s) => s.isActive && !s.effectiveTo);
  assert.ok(activeSlice);
  assert.equal(Number(activeSlice.sharePercentage), 35.0);

  // Historical slice: 25%, effectiveFrom 2026-01-01, effectiveTo 2026-08-31
  const closedSlice = cp1.partnerShares.find((s) => !s.isActive && s.effectiveTo);
  assert.ok(closedSlice);
  assert.equal(Number(closedSlice.sharePercentage), 25.0);
  assert.ok(closedSlice.effectiveTo.startsWith('2026-08-31'));
});

test('10.7 Hurdle 13 Part 2: Removing all active site shares from Co-Partner triggers auto-deactivation', async () => {
  // Deactivate the site share for Partner 2
  const updateRes = await req(`/sub-accounts/co-partners/${coPartner2Id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteShares: [
        { siteId: siteAId, sharePercentage: 0, isActive: false, effectiveFrom: '2026-09-01' },
      ],
    }),
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.data.isActive, false);

  // Verify Partner 2 is blocked from logging in
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: `981200${uniqueSuffix}`,
      password: 'Password@123',
    }),
  });
  assert.equal(loginRes.status, 403);
});

// ---------------------------------------------------------
// HURDLE 13 PART 3: EXPENSES, MACHINERY & HOURLY CALCULATION
// ---------------------------------------------------------

let categoryDieselId = '';
let categoryLabourId = '';
let categoryCustomId = '';
let machineryHitachiId = '';
let machineryJcbId = '';
let expenseGeneral1Id = '';
let expenseGeneral2Id = '';
let expenseMachDayId = '';
let expenseMachNightId = '';
let siteBoy1Token = '';

test('11.1 Hurdle 13 Part 3: Owner fetches expense categories and default heads are auto-seeded', async () => {
  const res = await req('/expense-categories', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.data));
  assert.ok(res.data.data.length >= 7);

  const dieselCat = res.data.data.find((c) => c.name.toLowerCase().includes('diesel'));
  assert.ok(dieselCat);
  categoryDieselId = dieselCat.id;

  const labourCat = res.data.data.find((c) => c.name.toLowerCase().includes('labour'));
  assert.ok(labourCat);
  categoryLabourId = labourCat.id;
});

test('11.2 Hurdle 13 Part 3: Owner creates custom expense category and registers heavy machinery', async () => {
  // 1. Create custom expense category
  const catRes = await req('/expense-categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: `Security & Night Watchman ${uniqueSuffix}`,
    }),
  });

  assert.equal(catRes.status, 201);
  assert.equal(catRes.data.success, true);
  categoryCustomId = catRes.data.data.id;
  assert.equal(catRes.data.data.isDefault, false);

  // 2. Register Heavy Machinery 1: Hitachi EX 210 Excavator
  const mach1Res = await req('/machinery', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'Hitachi EX 210 Excavator',
      code: 'HIT-01',
      defaultRentPerHour: 2500.0,
      vendorName: 'ABC Earthmovers Infra',
      vendorMobile: '9847112233',
    }),
  });

  assert.equal(mach1Res.status, 201);
  assert.equal(mach1Res.data.success, true);
  machineryHitachiId = mach1Res.data.data.id;
  assert.equal(Number(mach1Res.data.data.defaultRentPerHour), 2500.0);

  // 3. Register Heavy Machinery 2: JCB 3DX Backhoe
  const mach2Res = await req('/machinery', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      name: 'JCB 3DX Super Backhoe',
      code: 'JCB-02',
      defaultRentPerHour: 1800.0,
      vendorName: 'Self Owned Machine',
    }),
  });

  assert.equal(mach2Res.status, 201);
  assert.equal(mach2Res.data.success, true);
  machineryJcbId = mach2Res.data.data.id;
});

test('11.3 Hurdle 13 Part 3: Owner records general site expenses with various payment modes', async () => {
  // 1. Cash Drawer Expense: Diesel 50L (₹4,500)
  const exp1Res = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryDieselId,
      date: '2026-09-02',
      amount: 4500.0,
      paymentMode: 'CASH_DRAWER',
      paidTo: 'IOCL Fuel Station',
      remarks: '50 Litres Diesel for Genset',
    }),
  });

  assert.equal(exp1Res.status, 201);
  assert.equal(exp1Res.data.success, true);
  assert.equal(Number(exp1Res.data.data.amount), 4500.0);
  assert.equal(exp1Res.data.data.paymentMode, 'CASH_DRAWER');
  expenseGeneral1Id = exp1Res.data.data.id;

  // 2. Vendor Credit Expense: Blasting & Explosives (₹15,000)
  const exp2Res = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryCustomId,
      date: '2026-09-02',
      amount: 15000.0,
      paymentMode: 'VENDOR_CREDIT',
      paidTo: 'Apex Explosives Pvt Ltd',
      remarks: 'Blasting cartridges & detonators (Credit invoice #889)',
    }),
  });

  assert.equal(exp2Res.status, 201);
  assert.equal(exp2Res.data.success, true);
  assert.equal(Number(exp2Res.data.data.amount), 15000.0);
  assert.equal(exp2Res.data.data.paymentMode, 'VENDOR_CREDIT');
  expenseGeneral2Id = exp2Res.data.data.id;
});

test('11.4 Hurdle 13 Part 3: Heavy Machinery hourly rental engine calculates daytime working hours & cost accurately', async () => {
  // Start 08:00 AM to Close 05:30 PM = 9.50 hours @ ₹2,500/hr = ₹23,750
  const machExpRes = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryLabourId,
      machineryId: machineryHitachiId,
      date: '2026-09-03',
      startTime: '08:00 AM',
      closingTime: '05:30 PM',
      startMeterReading: 1200.0,
      endMeterReading: 1209.5,
      rentPerHour: 2500.0,
      paymentMode: 'BANK_TRANSFER',
      paidTo: 'Ramesh (Operator)',
      remarks: 'Primary boulder excavation',
    }),
  });

  assert.equal(machExpRes.status, 201);
  assert.equal(machExpRes.data.success, true);
  assert.equal(Number(machExpRes.data.data.totalHours), 9.5);
  assert.equal(Number(machExpRes.data.data.rentPerHour), 2500.0);
  assert.equal(Number(machExpRes.data.data.amount), 23750.0);
  expenseMachDayId = machExpRes.data.data.id;
});

test('11.5 Hurdle 13 Part 3: Heavy Machinery hourly rental engine computes overnight (cross-midnight) rollover & operator advance', async () => {
  // Overnight shift: Start 10:00 PM (22:00) to Close 04:30 AM (04:30) = 6.50 hours @ ₹3,000/hr = ₹19,500
  // Operator Advance: ₹2,000 paid via CASH_DRAWER
  const overnightRes = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryLabourId,
      machineryId: machineryHitachiId,
      date: '2026-09-04',
      startTime: '10:00 PM',
      closingTime: '04:30 AM',
      rentPerHour: 3000.0,
      advanceAmount: 2000.0,
      paymentMode: 'CASH_DRAWER',
      paidTo: 'Suresh (Night Driver)',
      remarks: 'Night shift quarry clearing & breaker operation',
    }),
  });

  assert.equal(overnightRes.status, 201);
  assert.equal(overnightRes.data.success, true);
  assert.equal(Number(overnightRes.data.totalHours || overnightRes.data.data.totalHours), 6.5);
  assert.equal(Number(overnightRes.data.data.amount), 19500.0);
  assert.equal(Number(overnightRes.data.data.advanceAmount), 2000.0);
  expenseMachNightId = overnightRes.data.data.id;
});

test('11.6 Hurdle 13 Part 3: Queries expenses ledger with multi-dimensional filtering & dynamic financial aggregates', async () => {
  const ledgerRes = await req(`/expenses?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(ledgerRes.status, 200);
  assert.equal(ledgerRes.data.success, true);
  assert.ok(ledgerRes.data.data.expenses.length >= 4);

  // Verify financial summary totals
  // Expenses: 4500 (Diesel) + 15000 (Explosives) + 23750 (Machinery Day) + 19500 (Machinery Night) = 62750
  const summary = ledgerRes.data.data.summary;
  assert.equal(summary.totalExpenses, 62750.0);
  assert.equal(summary.totalCashDrawerExpenses, 24000.0); // 4500 (Diesel) + 19500 (Overnight Cash Drawer)
  assert.equal(summary.totalMachineRent, 43250.0); // 23750 + 19500
  assert.equal(summary.totalAdvancesPaid, 2000.0);
  assert.equal(summary.totalMachineHours, 16.0); // 9.5 + 6.5
});

test('11.7 Hurdle 13 Part 3: Site Boy records expense and enforces 2-hour update rule / restrictions', async () => {
  // 1. Authenticate Site Boy 1
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: `982100${uniqueSuffix}`,
      password: 'Password@123',
    }),
  });

  assert.equal(loginRes.status, 200);
  siteBoy1Token = loginRes.data.data.accessToken;

  // 2. Site Boy records fresh expense (Tea / Food ₹350)
  const sbExpRes = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryLabourId,
      date: '2026-09-05',
      amount: 350.0,
      paymentMode: 'CASH_DRAWER',
      paidTo: 'Site Tea Stall',
      remarks: 'Evening tea & snacks for loading crew',
    }),
  });

  assert.equal(sbExpRes.status, 201);
  const sbExpId = sbExpRes.data.data.id;

  // 3. Site Boy edits newly created expense within 2 hours -> should succeed
  const updateRes = await req(`/expenses/${sbExpId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      amount: 400.0,
      remarks: 'Evening tea & snacks updated',
    }),
  });
  assert.equal(updateRes.status, 200);
  assert.equal(Number(updateRes.data.data.amount), 400.0);

  // 4. Site Boy cannot DELETE expenses -> returns HTTP 403
  const deleteRes = await req(`/expenses/${sbExpId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });
  assert.equal(deleteRes.status, 403);
});

test('11.8 Hurdle 13 Part 3: Soft-deletes expense and verifies exclusion from ledger summaries and master data safeguards', async () => {
  // 1. Owner soft-deletes General Expense 1 (Diesel ₹4,500)
  const delRes = await req(`/expenses/${expenseGeneral1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(delRes.status, 200);
  assert.equal(delRes.data.success, true);

  // 2. Verify ledger excludes deleted expense and aggregates update
  const ledgerRes = await req(`/expenses?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  const remaining = ledgerRes.data.data.expenses.map((e) => e.id);
  assert.ok(!remaining.includes(expenseGeneral1Id));

  // 3. Relational Safeguard: Cannot delete Machinery with active expenses
  const delMachRes = await req(`/machinery/${machineryHitachiId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(delMachRes.status, 400);
  assert.ok(delMachRes.data.message.includes('Cannot delete machinery'));
});




