import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function req(path, options = {}) {
  const start = performance.now();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const duration = performance.now() - start;
  const data = await res.json().catch(() => null);
  const serverTimeHeader = res.headers.get('x-response-time');
  const serverTime = serverTimeHeader ? parseFloat(serverTimeHeader) : duration;
  return { status: res.status, data, duration, serverTime, headers: res.headers };
}

const results = [];

async function benchmark(name, targetMs, fn, iterations = 5) {
  const times = [];
  const serverTimes = [];
  let lastStatus = 0;
  let lastData = null;

  for (let i = 0; i < iterations; i++) {
    const res = await fn();
    times.push(res.duration);
    serverTimes.push(res.serverTime);
    lastStatus = res.status;
    lastData = res.data;
  }

  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  const min = Math.min(...times).toFixed(2);
  const max = Math.max(...times).toFixed(2);
  const avgServer = (serverTimes.reduce((a, b) => a + b, 0) / serverTimes.length).toFixed(2);
  const passed = parseFloat(avg) <= targetMs;

  results.push({
    name,
    targetMs,
    avg: `${avg}ms`,
    min: `${min}ms`,
    max: `${max}ms`,
    serverTime: `${avgServer}ms`,
    status: lastStatus,
    passed,
  });

  return { status: lastStatus, data: lastData };
}

async function runAll() {
  console.log('\n======================================================');
  console.log('🚀 VLMS API PERFORMANCE & LATENCY BENCHMARK SUITE');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. Authenticate Super Admin
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ mobile: 'ajmalka84@gmail.com', password: 'password123' }),
  });
  const superAdminToken = adminLogin.data?.data?.accessToken || '';

  // 2. Onboard / Authenticate Owner Tenant
  const uniqueId = Date.now().toString().slice(-6);
  const ownerMobile = `98${Math.floor(10000000 + Math.random() * 89999999).toString().slice(0, 8)}`;
  const createTenantRes = await req('/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      businessName: `Benchmark Quarry ${uniqueId}`,
      mobile: ownerMobile,
      password: 'password123',
      subscriptionPlan: 'ANNUAL',
      gracePeriodDays: 14,
    }),
  });

  const tenantLoginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ mobile: ownerMobile, password: 'password123' }),
  });
  const ownerToken = tenantLoginRes.data?.data?.accessToken || '';
  const ownerHeaders = { Authorization: `Bearer ${ownerToken}` };

  // Setup sample test entities
  const siteRes = await req('/sites', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ siteName: `Site Alpha ${uniqueId}`, location: 'Ernakulam', pincode: '682001' }),
  });
  const siteId = siteRes.data?.data?.id || '';

  const vtRes = await req('/vehicle-types', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ name: `10 Wheeler ${uniqueId}` }),
  });
  const vehicleTypeId = vtRes.data?.data?.id || '';

  const mtRes = await req('/material-types', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ name: `20mm Aggregate ${uniqueId}` }),
  });
  const materialTypeId = mtRes.data?.data?.id || '';

  const vehRes = await req('/vehicles', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ vehicleNumber: `KL07AA${uniqueId.slice(0, 4)}`, vehicleTypeId }),
  });
  const vehicleId = vehRes.data?.data?.id || '';

  const contRes = await req('/contractors', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ name: `Babu Contractors ${uniqueId}`, mobile: '9847012345' }),
  });
  const contractorId = contRes.data?.data?.id || '';

  const rateRes = await req('/rates', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ siteId, vehicleTypeId, materialTypeId, amount: 3500 }),
  });
  const rateId = rateRes.data?.data?.id || '';

  const machineRes = await req('/machinery', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({ name: 'Hitachi EX210', code: 'HIT-01', defaultRentPerHour: 2200 }),
  });
  const machineryId = machineRes.data?.data?.id || '';

  // Populate sample loads & expenses for rich query benchmarking
  let sampleLoadId = '';
  for (let i = 0; i < 5; i++) {
    const lRes = await req('/loads', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        siteId,
        vehicleId,
        materialTypeId,
        contractorId: i % 2 === 0 ? contractorId : undefined,
        amount: 3500,
        paymentType: i % 2 === 0 ? 'CREDIT' : 'CASH',
        date: new Date().toISOString().split('T')[0],
      }),
    });
    if (i === 0) sampleLoadId = lRes.data?.data?.id;
  }

  let sampleExpenseId = '';
  const cats = await req('/expense-categories', { headers: ownerHeaders });
  const categoryId = cats.data?.data?.[0]?.id || '';
  const expRes = await req('/expenses', {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify({
      siteId,
      categoryId,
      amount: 1500,
      paymentMode: 'CASH_DRAWER',
      date: new Date().toISOString().split('T')[0],
      remarks: 'Benchmark diesel purchase',
    }),
  });
  sampleExpenseId = expRes.data?.data?.id;

  // ----------------------------------------------------
  // BENCHMARKING ALL ENDPOINTS
  // ----------------------------------------------------

  // 1. Health & Telemetry
  await benchmark('GET /health (Health & DB Check)', 30, () => req('/health'));

  // 2. Auth Endpoints
  await benchmark('POST /auth/login (JWT Generation)', 150, () =>
    req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ mobile: ownerMobile, password: 'password123' }),
    })
  );
  await benchmark('GET /auth/me (Session Verification)', 40, () =>
    req('/auth/me', { headers: ownerHeaders })
  );

  // 3. Master Data Bundle & Fast Lookups
  await benchmark('GET /master-data/bundle (Atomic Master Cache)', 35, () =>
    req('/master-data/bundle', { headers: ownerHeaders })
  );
  await benchmark('GET /rates/lookup (Rate Matrix Resolution)', 25, () =>
    req(`/rates/lookup?siteId=${siteId}&vehicleTypeId=${vehicleTypeId}&materialTypeId=${materialTypeId}`, {
      headers: ownerHeaders,
    })
  );
  await benchmark('GET /sites (List Sites)', 30, () => req('/sites', { headers: ownerHeaders }));
  await benchmark('GET /vehicles (List Vehicles)', 30, () => req('/vehicles', { headers: ownerHeaders }));
  await benchmark('GET /material-types (List Material Types)', 30, () => req('/material-types', { headers: ownerHeaders }));
  await benchmark('GET /contractors (List Contractors)', 30, () => req('/contractors', { headers: ownerHeaders }));
  await benchmark('GET /rates (List Rates Matrix)', 30, () => req(`/rates?siteId=${siteId}`, { headers: ownerHeaders }));

  // 4. Loads Fast Path
  await benchmark('POST /loads (Gate Dispatch Create)', 50, () =>
    req('/loads', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        siteId,
        vehicleId,
        materialTypeId,
        contractorId,
        amount: 3500,
        paymentType: 'CASH',
        date: new Date().toISOString().split('T')[0],
      }),
    })
  );
  await benchmark('GET /loads (Paginated Register & Aggregates)', 50, () =>
    req(`/loads?siteId=${siteId}&page=1&limit=25`, { headers: ownerHeaders })
  );
  if (sampleLoadId) {
    await benchmark('GET /loads/:id (Single Load Inspection)', 30, () =>
      req(`/loads/${sampleLoadId}`, { headers: ownerHeaders })
    );
    await benchmark('PATCH /loads/:id (Update Load)', 40, () =>
      req(`/loads/${sampleLoadId}`, {
        method: 'PATCH',
        headers: ownerHeaders,
        body: JSON.stringify({ remarks: 'Updated during benchmark' }),
      })
    );
  }

  // 5. Expenses & Machinery
  await benchmark('GET /expense-categories (List Categories)', 30, () =>
    req('/expense-categories', { headers: ownerHeaders })
  );
  await benchmark('GET /machinery (List Machinery Fleet)', 30, () =>
    req('/machinery', { headers: ownerHeaders })
  );
  await benchmark('POST /expenses (Create Expense Voucher)', 50, () =>
    req('/expenses', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        siteId,
        categoryId,
        amount: 850,
        paymentMode: 'CASH_DRAWER',
        date: new Date().toISOString().split('T')[0],
      }),
    })
  );
  await benchmark('GET /expenses (Paginated Expenses & Totals)', 50, () =>
    req(`/expenses?siteId=${siteId}&page=1&limit=25`, { headers: ownerHeaders })
  );

  // 6. Shifts & Drawer
  await benchmark('GET /shifts/current-drawer (Live Counter Cash)', 40, () =>
    req(`/shifts/current-drawer?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('POST /shifts/close (Close Daily Shift)', 60, () =>
    req('/shifts/close', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        siteId,
        date: new Date().toISOString().split('T')[0],
        actualHandoverCash: 3500,
        remarks: 'Benchmark shift close',
      }),
    })
  );
  await benchmark('GET /shifts/history (Shifts History Register)', 40, () =>
    req(`/shifts/history?siteId=${siteId}`, { headers: ownerHeaders })
  );

  // 7. Contractor Ledgers & Payments
  await benchmark('POST /contractors/payments (Record Payment Collection)', 50, () =>
    req('/contractors/payments', {
      method: 'POST',
      headers: ownerHeaders,
      body: JSON.stringify({
        siteId,
        contractorId,
        date: new Date().toISOString().split('T')[0],
        amount: 5000,
        paymentMode: 'CASH_DRAWER',
        remarks: 'Benchmark collection',
      }),
    })
  );
  await benchmark('GET /contractors/payments (List Collections)', 40, () =>
    req(`/contractors/payments?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /contractors/:id/ledger (Chronological Passbook)', 50, () =>
    req(`/contractors/${contractorId}/ledger?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /contractors/summary (Site Receivables Summary)', 50, () =>
    req(`/contractors/summary?siteId=${siteId}`, { headers: ownerHeaders })
  );

  // 8. Team & Sub-Accounts
  await benchmark('GET /sub-accounts (Team & Quota Bundle)', 40, () =>
    req('/sub-accounts', { headers: ownerHeaders })
  );

  // 9. Financial Reports Engine
  await benchmark('GET /reports/contractors-summary (Contractors Aggregation)', 70, () =>
    req(`/reports/contractors-summary?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/settlement (Contractor PDF Settlement)', 70, () =>
    req(`/reports/settlement?contractorId=${contractorId}&siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/cashflow (Site Cash Inflow/Outflow)', 70, () =>
    req(`/reports/cashflow?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/partner-settlement (Temporal Equity Dividend)', 80, () =>
    req(`/reports/partner-settlement?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/partner-rebalance (Zero-Sum Rebalance Matrix)', 80, () =>
    req(`/reports/partner-rebalance?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/machinery-settlement (Machine Hours & Rent Log)', 70, () =>
    req(`/reports/machinery-settlement?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /reports/balance-sheet (Double-Entry Balance Sheet & Ratios)', 90, () =>
    req(`/reports/balance-sheet?siteId=${siteId}`, { headers: ownerHeaders })
  );

  // 10. Dashboard & Admin
  await benchmark('GET /dashboard/summary (Consolidated Dashboard HUD)', 80, () =>
    req(`/dashboard/summary?siteId=${siteId}`, { headers: ownerHeaders })
  );
  await benchmark('GET /admin/users (Customer Directory)', 60, () =>
    req('/admin/users?page=1&limit=25', { headers: { Authorization: `Bearer ${superAdminToken}` } })
  );

  // Print Summary Table
  console.log('\n📊 BENCHMARK RESULTS TABLE:\n');
  console.table(
    results.map((r) => ({
      'Endpoint / Operation': r.name,
      'Avg Latency': r.avg,
      'Min / Max': `${r.min} / ${r.max}`,
      'Server X-Response-Time': r.serverTime,
      'Target Budget': `< ${r.targetMs}ms`,
      'Status': r.passed ? '✅ PASS' : '⚠️ WARN',
    }))
  );

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n✨ SUMMARY: ${passedCount} / ${results.length} Endpoints within Target Latency Budget.\n`);
}

runAll().catch(console.error);
