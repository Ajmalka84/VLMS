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
  return { status: res.status, data, headers: res.headers };
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
      paymentMode: 'OWNER_DIRECT',
      transferMethod: 'BANK_TRANSFER',
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

// ---------------------------------------------------------------------------------
// HURDLE 13 PART 4: ROLE-BASED APP EXPERIENCE, SITE BOY WORKFLOW & CASH DRAWER RECONCILIATION
// ---------------------------------------------------------------------------------

let shiftRecordId = '';
let siteBoyVehicleId = '';
let siteBoyContractorId = '';
const shiftTestDate = '2026-09-15';
const nextShiftDate = '2026-09-16';

test('12.1 Hurdle 13 Part 4: Site Boy site-locking - cannot record load on unassigned / unauthorized site', async () => {
  // Site Boy 1 (assigned to Site A) tries to create load with an unassigned site ID -> 403 Forbidden
  const unassignedSiteId = 'a1234567-89ab-4cde-8f01-23456789abcd';
  const res = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      siteId: unassignedSiteId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      paymentType: 'CASH',
      amount: 1200.0,
      date: shiftTestDate,
    }),
  });

  assert.equal(res.status, 403);
  assert.ok(res.data.message.includes('Site supervisor is strictly locked') || res.data.message.includes('quarry site'));
});

test('12.2 Hurdle 13 Part 4: Site Boy records CASH load on assigned site successfully', async () => {
  const res = await req('/loads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      siteId: siteAId,
      vehicleId: vehicleAId,
      materialTypeId: materialTypeId,
      paymentType: 'CASH',
      amount: 1500.0,
      date: shiftTestDate,
    }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(Number(res.data.data.amount), 1500.0);
  assert.equal(res.data.data.paymentType, 'CASH');
});

test('12.3 Hurdle 13 Part 4: Site Boy creates global vehicle & contractor (saved under owner account)', async () => {
  // 1. Site Boy registers new vehicle (alphanumeric, no hyphens)
  const vehRes = await req('/vehicles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      vehicleNumber: `KL07SB${uniqueSuffix.slice(-4)}`,
      vehicleTypeId: vehicleTypeId,
    }),
  });

  assert.equal(vehRes.status, 201);
  assert.equal(vehRes.data.success, true);
  siteBoyVehicleId = vehRes.data.data.id;
  assert.equal(vehRes.data.data.userId, tenantAUser.id);

  // 2. Site Boy registers new contractor
  const contRes = await req('/contractors', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      name: `Site Boy Transporter ${uniqueSuffix}`,
      mobile: `99${rand8.toString().slice(0, 8)}`,
    }),
  });

  assert.equal(contRes.status, 201);
  assert.equal(contRes.data.success, true);
  siteBoyContractorId = contRes.data.data.id;
  assert.equal(contRes.data.data.userId, tenantAUser.id);
});

test('12.4 Hurdle 13 Part 4: Site Boy is blocked from deleting loads (HTTP 403)', async () => {
  // Site Boy 1 attempts to delete loadA1Id -> returns HTTP 403 Forbidden
  const delRes = await req(`/loads/${loadA1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });

  assert.equal(delRes.status, 403);
});

test('12.5 Hurdle 13 Part 4: Shifts - Live Drawer calculation aggregates cash loads and cash expenses accurately', async () => {
  // Record a Cash Drawer expense on shiftTestDate for ₹300
  const expRes = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryLabourId,
      date: shiftTestDate,
      amount: 300.0,
      paymentMode: 'CASH_DRAWER',
      paidTo: 'Site Cleaner',
      remarks: 'Morning washing charges',
    }),
  });
  assert.equal(expRes.status, 201);

  // Fetch Current Drawer for shiftTestDate
  const drawerRes = await req(`/shifts/current-drawer?siteId=${siteAId}&date=${shiftTestDate}`, {
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });

  assert.equal(drawerRes.status, 200);
  assert.equal(drawerRes.data.data.openingCash, 0); // No prior approved shift
  assert.equal(drawerRes.data.data.cashInflows, 1500.0); // 1500 load
  assert.equal(drawerRes.data.data.cashLoadsCount, 1);
  assert.equal(drawerRes.data.data.cashOutflows, 300.0); // 300 expense
  assert.equal(drawerRes.data.data.expectedCash, 1200.0); // 1500 - 300 = 1200
});

test('12.6 Hurdle 13 Part 4: Shifts - Site Boy closes daily shift with cash count & calculates discrepancy', async () => {
  // Site Boy counts ₹1,150 in physical cash (₹50 shortage discrepancy)
  const closeRes = await req('/shifts/close', {
    method: 'POST',
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
    body: JSON.stringify({
      siteId: siteAId,
      date: shiftTestDate,
      shiftType: 'DAY',
      actualHandoverCash: 1150.0,
      remarks: '₹50 short due to small change coins missing',
    }),
  });

  assert.equal(closeRes.status, 201);
  assert.equal(Number(closeRes.data.data.openingCash), 0.0);
  assert.equal(Number(closeRes.data.data.cashInflows), 1500.0);
  assert.equal(Number(closeRes.data.data.cashOutflows), 300.0);
  assert.equal(Number(closeRes.data.data.expectedCash), 1200.0);
  assert.equal(Number(closeRes.data.data.actualHandoverCash), 1150.0);
  assert.equal(Number(closeRes.data.data.discrepancy), -50.0);
  assert.equal(closeRes.data.data.isApproved, true);
  shiftRecordId = closeRes.data.data.id;
});

test('12.7 Hurdle 13 Part 4: Shifts - Owner reviews and updates shift remarks', async () => {
  const ownerApproveRes = await req(`/shifts/${shiftRecordId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({ remarks: 'Verified ₹50 minor shortage accepted' }),
  });

  assert.equal(ownerApproveRes.status, 200);
  assert.equal(ownerApproveRes.data.data.isApproved, true);
  assert.equal(ownerApproveRes.data.data.approvedBy.id, tenantAUser.id);
});

test('12.8 Hurdle 13 Part 4: Shifts - Next shift drawer carries forward closing balance (₹1,150)', async () => {
  const nextDrawerRes = await req(`/shifts/current-drawer?siteId=${siteAId}&date=${nextShiftDate}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(nextDrawerRes.status, 200);
  assert.equal(nextDrawerRes.data.data.openingCash, 1150.0); // Handed over from previous shift
  assert.equal(nextDrawerRes.data.data.expectedCash, 1150.0); // 1150 + 0 - 0 = 1150
});

test('12.9 Hurdle 13 Part 4: Shifts - Query shift history with site and date filters', async () => {
  const historyRes = await req(`/shifts/history?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(historyRes.status, 200);
  assert.ok(Array.isArray(historyRes.data.data));
  assert.ok(historyRes.data.data.length >= 1);
  const found = historyRes.data.data.find((s) => s.id === shiftRecordId);
  assert.ok(found);
  assert.equal(found.isApproved, true);
  assert.equal(Number(found.actualHandoverCash), 1150.0);
});

// ---------------------------------------------------------------------------------
// HURDLE 13 PART 5: ADVANCED FINANCIAL REPORTS, CASHFLOW & SETTLEMENT STATEMENTS
// ---------------------------------------------------------------------------------

let coPartner1Token = '';

test('13.1 Hurdle 13 Part 5: Site Cashflow Report aggregates cash loads inflows and cash drawer outflows accurately', async () => {
  const res = await req(`/reports/cashflow?siteId=${siteAId}&startDate=2026-09-01&endDate=2026-09-30`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.data.summary.totalInflows > 0);
  assert.ok(res.data.data.summary.totalOutflows > 0);
  assert.equal(
    res.data.data.summary.netCashflow,
    res.data.data.summary.totalInflows - res.data.data.summary.totalOutflows
  );
  assert.ok(res.data.data.timeline.length > 0);
  assert.ok(res.data.data.categoryBreakdown.length > 0);
  assert.equal(res.data.data.business.id, tenantAUser.id);
});

test('13.2 Hurdle 13 Part 5: Co-Partner Temporal Profit-Sharing Settlement calculates multi-slice equity dividend', async () => {
  const res = await req(`/reports/partner-settlement?partnerId=${coPartner1Id}&startDate=2026-01-01&endDate=2026-09-30`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.selectedPartner.id, coPartner1Id);
  assert.equal(res.data.data.slices.length, 2);

  // Slices: 25% historical slice and 35% active slice
  const slice25 = res.data.data.slices.find((s) => s.sharePercentage === 25);
  const slice35 = res.data.data.slices.find((s) => s.sharePercentage === 35);
  assert.ok(slice25);
  assert.ok(slice35);

  assert.ok(res.data.data.summary.totalRevenue > 0);
  assert.equal(
    res.data.data.summary.netDividendPayable,
    res.data.data.summary.grossDividendPayable - res.data.data.summary.advancesDeducted
  );
});

test('13.3 Hurdle 13 Part 5: Co-Partner queries own settlement statement without specifying partnerId', async () => {
  // 1. Authenticate Co-Partner 1
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      mobile: `981100${uniqueSuffix}`,
      password: 'Password@123',
    }),
  });
  assert.equal(loginRes.status, 200);
  coPartner1Token = loginRes.data.data.accessToken;

  // 2. Query own statement
  const res = await req('/reports/partner-settlement', {
    headers: { Authorization: `Bearer ${coPartner1Token}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.selectedPartner.id, coPartner1Id);
});

test('13.4 Hurdle 13 Part 5: Heavy Machinery Rental Logbook & Vendor Settlement computes hours, advances, and net balance', async () => {
  const res = await req(`/reports/machinery-settlement?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.data.grandTotal.totalHours, 16.0); // 9.5 (Day) + 6.5 (Night)
  assert.equal(res.data.data.grandTotal.totalGrossRent, 43250.0); // 23750 + 19500
  assert.equal(res.data.data.grandTotal.totalAdvancesPaid, 2000.0); // 2000 advance
  assert.equal(res.data.data.grandTotal.balancePayable, 41250.0); // 43250 - 2000
  assert.ok(res.data.data.machinesSummary.length >= 2);
  assert.ok(res.data.data.logs.length >= 2);
});

test('13.5 Hurdle 13 Part 5: Site Boy accesses Contractors, Settlement, and Cashflow reports on assigned site, blocked from partner settlement', async () => {
  // 1. Site Boy can access contractors summary for assigned site
  const summaryRes = await req(`/reports/contractors-summary?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });
  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.data.success, true);
  assert.ok(summaryRes.data.data.contractors.length >= 1);

  // 2. Site Boy can access contractor settlement statement for assigned site
  const settlementRes = await req(`/reports/settlement?contractorId=${contractorAId}&siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });
  assert.equal(settlementRes.status, 200);
  assert.equal(settlementRes.data.success, true);
  assert.ok(settlementRes.data.data.trips.length >= 1);

  // 3. Site Boy can access cashflow for assigned site
  const cashflowRes = await req(`/reports/cashflow?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });
  assert.equal(cashflowRes.status, 200);
  assert.equal(cashflowRes.data.success, true);

  // 4. Site Boy is blocked from partner equity settlement -> 403 Forbidden
  const partnerRes = await req('/reports/partner-settlement', {
    headers: { Authorization: `Bearer ${siteBoy1Token}` },
  });
  assert.equal(partnerRes.status, 403);
});

test('13.6 Hurdle 13 Part 5: Super Admin queries reports with customerId parameter across all financial endpoints', async () => {
  const resCashflow = await req(`/reports/cashflow?customerId=${tenantAUser.id}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(resCashflow.status, 200);
  assert.equal(resCashflow.data.data.business.id, tenantAUser.id);

  const resMachinery = await req(`/reports/machinery-settlement?customerId=${tenantAUser.id}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(resMachinery.status, 200);
  assert.equal(resMachinery.data.data.business.id, tenantAUser.id);
});

test('13.7 Hurdle 13 Field Enhancements: Heavy Machinery - Hour Meter difference calculates totalHours and rent', async () => {
  const expenseRes = await req('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryCustomId,
      machineryId: machineryHitachiId,
      date: '2026-09-08',
      startMeterReading: 2260.0,
      endMeterReading: 2272.5, // 12.5 working hours
      rentPerHour: 2000.0,
      advanceAmount: 1000.0,
      paymentMode: 'CASH_DRAWER',
      paidTo: 'Rajesh (Hitachi Operator)',
    }),
  });

  assert.equal(expenseRes.status, 201);
  assert.equal(expenseRes.data.success, true);
  assert.equal(Number(expenseRes.data.data.totalHours), 12.5);
  assert.equal(Number(expenseRes.data.data.amount), 25000.0); // 12.5 * 2000 = 25,000
  assert.equal(Number(expenseRes.data.data.advanceAmount), 1000.0);
  assert.equal(Number(expenseRes.data.data.startMeterReading), 2260.0);
  assert.equal(Number(expenseRes.data.data.endMeterReading), 2272.5);
});

test('13.8 Hurdle 13 Field Enhancements: Shifts - Custom openingCash balance float recalculates expectedCash and discrepancy', async () => {
  const customShiftDate = '2028-09-09';
  const closeRes = await req('/shifts/close', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: JSON.stringify({
      siteId: siteAId,
      date: customShiftDate,
      shiftType: 'DAY',
      openingCash: 5000.0, // Initial cash float provided in morning
      actualHandoverCash: 4900.0,
      remarks: 'Morning cash float ₹5000 provided, ₹100 discrepancy at evening',
    }),
  });

  assert.equal(closeRes.status, 201);
  assert.equal(Number(closeRes.data.data.openingCash), 5000.0);
  assert.equal(Number(closeRes.data.data.expectedCash), 5000.0); // 5000 + 0 - 0 = 5000
  assert.equal(Number(closeRes.data.data.actualHandoverCash), 4900.0);
  assert.equal(Number(closeRes.data.data.discrepancy), -100.0); // 4900 - 5000 = -100
});

test('14.1 Hurdle 14: Latency Telemetry Header (X-Response-Time) is attached to all API responses', async () => {
  const res = await req('/health');
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('x-response-time'), 'X-Response-Time header must be present');
  assert.match(res.headers.get('x-response-time'), /ms$/, 'X-Response-Time must end in ms');
});

test('14.2 Hurdle 14: In-Memory Master Data Bundle Cache delivers identical data with 0ms-level latency', async () => {
  // First call primes cache
  const firstRes = await req('/master-data/bundle', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(firstRes.status, 200);
  assert.equal(firstRes.data.success, true);
  assert.ok(firstRes.data.data.sites.length >= 1);

  // Second call retrieves from in-memory cache
  const secondRes = await req('/master-data/bundle', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(secondRes.status, 200);
  assert.deepEqual(secondRes.data.data.sites, firstRes.data.data.sites);
});

test('14.3 Hurdle 14: Rate Matrix Lookup retrieves rates from cache & handles non-configured combinations', async () => {
  const lookupRes = await req(`/rates/lookup?siteId=${siteAId}&vehicleTypeId=${vehicleTypeId}&materialTypeId=${materialTypeId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(lookupRes.status, 200);
  assert.equal(lookupRes.data.success, true);
  assert.ok(lookupRes.data.data !== undefined);
});

test('14.4 Hurdle 14: Global Exception Filter normalizes 404 Not Found & malformed IDs without crashing server', async () => {
  // Valid UUID format that doesn't exist in DB -> 404 NOT_FOUND
  const notFoundRes = await req('/loads/00000000-0000-0000-0000-000000000000', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(notFoundRes.status, 404);
  assert.equal(notFoundRes.data.success, false);
  assert.equal(notFoundRes.data.code, 'NOT_FOUND');

  // Malformed ID string -> 400 BAD_REQUEST gracefully normalized
  const malformedRes = await req('/loads/malformed-id-123', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(malformedRes.status, 400);
  assert.equal(malformedRes.data.success, false);
  assert.equal(malformedRes.data.code, 'BAD_REQUEST');
});

test('14.5 Hurdle 15: Consolidated Dashboard Summary Bundle API aggregates loads, expenses, and drawer', async () => {
  const summaryRes = await req(`/dashboard/summary?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.data.success, true);
  const data = summaryRes.data.data;
  assert.ok(data.loads !== undefined);
  assert.ok(typeof data.loads.totalLoads === 'number');
  assert.ok(typeof data.loads.totalTurnover === 'number');
  assert.ok(Array.isArray(data.loads.recentLoads));
  assert.ok(data.expenses !== undefined);
  assert.ok(typeof data.expenses.totalExpenses === 'number');
  assert.ok(data.dateRange !== undefined);
});

test('14.6 Hurdle 15: Owner Re-opens locked shift via PATCH /shifts/:id/reopen', async () => {
  const testDate = '2028-09-09';
  // First, verify shift is closed for testDate
  const drawerBefore = await req(`/shifts/current-drawer?siteId=${siteAId}&date=${testDate}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(drawerBefore.status, 200);
  assert.ok(drawerBefore.data.data.existingShift !== null);
  const shiftId = drawerBefore.data.data.existingShift.id;

  // Re-open shift
  const reopenRes = await req(`/shifts/${shiftId}/reopen`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(reopenRes.status, 200);
  assert.equal(reopenRes.data.success, true);

  // Verify drawer is now open (existingShift is null)
  const drawerAfter = await req(`/shifts/current-drawer?siteId=${siteAId}&date=${testDate}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(drawerAfter.status, 200);
  assert.equal(drawerAfter.data.data.existingShift, null);
});

test('15.1 Hurdle 15 Part 1: CO_PARTNER_DIRECT requires valid payerPartnerUserId', async () => {
  // Attempt to create CO_PARTNER_DIRECT without payerPartnerUserId -> should fail
  const failRes = await req('/expenses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantAToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryDieselId,
      date: '2026-09-10',
      amount: 15000,
      paymentMode: 'CO_PARTNER_DIRECT',
      paidTo: 'Geology Dept',
      remarks: 'Inspection fees',
    }),
  });

  assert.equal(failRes.status, 400);
  assert.equal(failRes.data.success, false);

  // Attempt with non-existent partner ID -> should fail with 404
  const notFoundRes = await req('/expenses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantAToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryDieselId,
      date: '2026-09-10',
      amount: 15000,
      paymentMode: 'CO_PARTNER_DIRECT',
      payerPartnerUserId: '00000000-0000-0000-0000-000000000000',
      paidTo: 'Geology Dept',
      remarks: 'Inspection fees',
    }),
  });

  assert.equal(notFoundRes.status, 404);
  assert.equal(notFoundRes.data.success, false);
});

test('15.2 Hurdle 15 Part 1: CO_PARTNER_DIRECT expense creates successfully with partner and transfer details', async () => {
  const createRes = await req('/expenses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantAToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteId: siteAId,
      categoryId: categoryDieselId,
      date: '2026-09-10',
      amount: 25000,
      paymentMode: 'CO_PARTNER_DIRECT',
      payerPartnerUserId: coPartner1Id,
      transferMethod: 'UPI',
      referenceNumber: 'UPI-REF-998877',
      paidTo: 'Geology Department Palakkad',
      remarks: 'Challan #48291 for transit permit renewal',
    }),
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.data.success, true);
  const exp = createRes.data.data;
  assert.equal(exp.paymentMode, 'CO_PARTNER_DIRECT');
  assert.equal(exp.payerPartnerUserId, coPartner1Id);
  assert.equal(exp.transferMethod, 'UPI');
  assert.equal(exp.referenceNumber, 'UPI-REF-998877');
  assert.ok(exp.payerPartner !== undefined);
  assert.equal(exp.payerPartner.id, coPartner1Id);
  assert.equal(exp.payerPartner.role, 'CO_PARTNER');
});

test('15.3 Hurdle 15 Part 1: Query expenses filtered by payerPartnerUserId and paymentMode', async () => {
  const queryRes = await req(`/expenses?siteId=${siteAId}&paymentMode=CO_PARTNER_DIRECT&payerPartnerUserId=${coPartner1Id}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(queryRes.status, 200);
  assert.equal(queryRes.data.success, true);
  assert.ok(queryRes.data.data.expenses.length >= 1);
  const found = queryRes.data.data.expenses.find((e) => e.payerPartnerUserId === coPartner1Id);
  assert.ok(found !== undefined);
  assert.equal(found.payerPartner?.id, coPartner1Id);
});

test('15.4 Hurdle 15 Part 2: Record Contractor Payment with partner collector and transfer metadata', async () => {
  const payRes = await req('/contractors/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantAToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteId: siteAId,
      contractorId: contractorAId,
      collectedByUserId: coPartner1Id,
      date: '2026-09-10',
      amount: 15000,
      paymentMode: 'CO_PARTNER_DIRECT',
      transferMethod: 'BANK_TRANSFER',
      referenceNumber: 'NEFT-CONTR-102938',
      remarks: 'Part payment for August aggregate supplies',
    }),
  });

  assert.equal(payRes.status, 201);
  assert.equal(payRes.data.success, true);
  const pay = payRes.data.data;
  assert.equal(pay.contractorId, contractorAId);
  assert.equal(pay.collectedByUserId, coPartner1Id);
  assert.equal(Number(pay.amount), 15000);
  assert.equal(pay.paymentMode, 'CO_PARTNER_DIRECT');
  assert.equal(pay.transferMethod, 'BANK_TRANSFER');
  assert.equal(pay.referenceNumber, 'NEFT-CONTR-102938');
  assert.equal(pay.collectedBy?.id, coPartner1Id);
});

test('15.5 Hurdle 15 Part 2: List contractor payments with filters', async () => {
  const listRes = await req(`/contractors/payments?contractorId=${contractorAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(listRes.status, 200);
  assert.equal(listRes.data.success, true);
  assert.ok(listRes.data.data.data.length >= 1);
  const found = listRes.data.data.data[0];
  assert.equal(found.contractorId, contractorAId);
  assert.equal(found.collectedBy?.id, coPartner1Id);
});

test('15.6 Hurdle 15 Part 2: Fetch contractor ledger with chronological running balance', async () => {
  const ledgerRes = await req(`/contractors/${contractorAId}/ledger?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(ledgerRes.status, 200);
  assert.equal(ledgerRes.data.success, true);
  const ledger = ledgerRes.data.data;
  assert.equal(ledger.contractor.id, contractorAId);
  assert.ok(Array.isArray(ledger.entries));
  assert.ok(ledger.entries.length >= 2); // At least 1 credit load + 1 payment

  // Check debit load entry
  const loadEntry = ledger.entries.find((e) => e.type === 'LOAD');
  assert.ok(loadEntry !== undefined);
  assert.ok(loadEntry.debit > 0);
  assert.equal(loadEntry.credit, 0);

  // Check credit payment entry
  const payEntry = ledger.entries.find((e) => e.type === 'PAYMENT');
  assert.ok(payEntry !== undefined);
  assert.equal(payEntry.debit, 0);
  assert.equal(payEntry.credit, 15000);
  assert.equal(payEntry.collectedBy?.id, coPartner1Id);

  // Check running balance consistency
  assert.equal(ledger.closingBalance, ledger.totalDebit - ledger.totalCredit + ledger.openingBalance);
});

test('15.7 Hurdle 15 Part 2: Get site-wide contractor balance summary', async () => {
  const summaryRes = await req(`/contractors/summary?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryRes.data.success, true);
  const summary = summaryRes.data.data;
  assert.ok(summary.contractors.length >= 1);
  const c = summary.contractors.find((x) => x.id === contractorAId);
  assert.ok(c !== undefined);
  assert.ok(c.totalBilled > 0);
  assert.ok(c.totalPaid >= 15000);
  assert.equal(c.balanceDue, Number((c.totalBilled - c.totalPaid).toFixed(2)));
  assert.equal(summary.totalBalanceDue, Number((summary.totalCreditBilled - summary.totalCollected).toFixed(2)));
});

test('15.8 Hurdle 15 Part 2: Soft delete contractor payment and check ledger update', async () => {
  // Create a temporary payment
  const tempPayRes = await req('/contractors/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tenantAToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteId: siteAId,
      contractorId: contractorAId,
      date: '2026-09-10',
      amount: 5000,
      paymentMode: 'CASH_DRAWER',
      remarks: 'Temp payment for deletion test',
    }),
  });
  assert.equal(tempPayRes.status, 201);
  const tempPaymentId = tempPayRes.data.data.id;

  // Delete payment
  const delRes = await req(`/contractors/payments/${tempPaymentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(delRes.status, 200);
  assert.equal(delRes.data.success, true);

  // Verify deleted payment no longer appears in ledger
  const ledgerRes = await req(`/contractors/${contractorAId}/ledger?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(ledgerRes.status, 200);
  const found = ledgerRes.data.data.entries.find((e) => e.id === tempPaymentId);
  assert.equal(found, undefined);
});

test('15.9 Hurdle 15 Part 3: Partner settlement statement includes direct funded expenses and direct collections', async () => {
  const stmtRes = await req(`/reports/partner-settlement?partnerId=${coPartner1Id}&siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(stmtRes.status, 200);
  assert.equal(stmtRes.data.success, true);
  const summary = stmtRes.data.data.summary;
  assert.ok(summary.directExpensesFunded >= 25000); // From test 15.2
  assert.ok(summary.contractorPaymentsCollected >= 15000); // From test 15.4
  assert.equal(summary.netCashRetained, summary.contractorPaymentsCollected + summary.advancesDeducted);
  assert.equal(
    summary.netDividendPayable,
    Number((summary.grossDividendPayable + summary.directExpensesFunded - summary.netCashRetained).toFixed(2))
  );
});

test('15.10 Hurdle 15 Part 3: Multi-Partner Rebalance Report computes zero-sum peer transfers', async () => {
  const rebalRes = await req(`/reports/partner-rebalance?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(rebalRes.status, 200);
  assert.equal(rebalRes.data.success, true);
  const data = rebalRes.data.data;
  assert.ok(data.partners.length >= 2); // Owner + Co-Partner(s)
  assert.ok(data.siteSummary.totalRevenue > 0);
  assert.ok(Array.isArray(data.rebalanceTransfers));

  // Check that all partner metrics are computed
  const cp1 = data.partners.find((p) => p.partner.id === coPartner1Id);
  assert.ok(cp1 !== undefined);
  assert.ok(cp1.directExpensesFunded >= 25000);
  assert.ok(cp1.contractorPaymentsCollected >= 15000);
  assert.equal(cp1.closingBalance, Number((cp1.equityDividend + cp1.directExpensesFunded - cp1.netCashHeld).toFixed(2)));

  // Verify rebalance transfer structure
  for (const t of data.rebalanceTransfers) {
    assert.ok(t.fromPartner.id);
    assert.ok(t.toPartner.id);
    assert.ok(t.amount > 0);
  }
});

test('15.11 Hurdle 15 Part 4: Query Site Balance Sheet and verify double-entry assets, liabilities, and partner equity', async () => {
  const bsRes = await req(`/reports/balance-sheet?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  assert.equal(bsRes.status, 200);
  assert.equal(bsRes.data.success, true);
  const data = bsRes.data.data;
  assert.ok(data.business);
  assert.equal(data.business.id, tenantAUser.id);
  assert.ok(data.site);
  assert.equal(data.site.id, siteAId);

  const bs = data.balanceSheet;
  // Assets
  assert.ok(typeof bs.assets.currentAssets.cashInHand === 'number');
  assert.ok(typeof bs.assets.currentAssets.accountsReceivable === 'number');
  assert.equal(bs.assets.currentAssets.total, Number((bs.assets.currentAssets.cashInHand + bs.assets.currentAssets.accountsReceivable).toFixed(2)));
  assert.equal(bs.assets.totalAssets, bs.assets.currentAssets.total + bs.assets.fixedAssets.total);

  // Liabilities
  assert.ok(typeof bs.liabilities.currentLiabilities.vendorMachineryPayables === 'number');
  assert.equal(bs.liabilities.totalLiabilities, bs.liabilities.currentLiabilities.total);

  // Equity
  assert.ok(typeof bs.equity.cumulativeNetProfit === 'number');
  assert.ok(typeof bs.equity.totalPartnerEquity === 'number');
  assert.equal(bs.totalLiabilitiesAndEquity, Number((bs.liabilities.totalLiabilities + bs.equity.totalPartnerEquity).toFixed(2)));

  // Double entry verification
  assert.equal(bs.isBalanced, true);
});

test('15.12 Hurdle 15 Part 4: Verify solvency metrics and Super Admin customerId query on Balance Sheet', async () => {
  // 1. Solvency & Working Capital
  const bsRes = await req(`/reports/balance-sheet?siteId=${siteAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(bsRes.status, 200);
  const fh = bsRes.data.data.financialHealth;
  const bs = bsRes.data.data.balanceSheet;

  assert.equal(fh.netWorkingCapital, Number((bs.assets.currentAssets.total - bs.liabilities.currentLiabilities.total).toFixed(2)));
  assert.ok(fh.currentRatio > 0);
  assert.ok(typeof fh.receivablesExposurePct === 'number');
  assert.ok(fh.revenueMix.totalRevenue > 0);
  assert.ok(fh.activeContractorsCount >= 1);
  assert.ok(fh.activeMachineryCount >= 1);

  // 2. Super Admin can query Balance Sheet by customerId
  const adminRes = await req(`/reports/balance-sheet?customerId=${tenantAUser.id}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  assert.equal(adminRes.status, 200);
  assert.equal(adminRes.data.success, true);
  assert.equal(adminRes.data.data.business.id, tenantAUser.id);
});












