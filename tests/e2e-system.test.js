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
  assert.equal(resA.data.data.user.role, 'USER');
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

test('3.1 Creates Vehicle Type and Material Type as Super Admin', async () => {
  const typeName = `Tipper_${uniqueSuffix}`;
  const resType = await req('/admin/vehicle-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({ name: typeName }),
  });

  assert.equal(resType.status, 201);
  assert.equal(resType.data.success, true);
  vehicleTypeId = resType.data.data.id;

  const matName = `Granite_20mm_${uniqueSuffix}`;
  const resMat = await req('/admin/material-types', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
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

test('7. Relational Deletion Safeguards block deletion when loads exist (HTTP 400 Bad Request)', async () => {
  // Attempt to delete quarry site with recorded loads
  const siteDelRes = await req(`/sites/${siteAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert.equal(siteDelRes.status, 400);
  assert.equal(siteDelRes.data.success, false);
  assert.ok(siteDelRes.data.message.includes('dispatch load'));

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
