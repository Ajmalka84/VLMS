const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null,
          });
        } catch {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

const BASE_HOST = 'localhost';
const BASE_PORT = 3000;

function api(method, path, token = null, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request(
    {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api/v1${path}`,
      method,
      headers,
    },
    body
  );
}

async function runTests() {
  console.log('--- STARTING HURDLE 9 SETTLEMENT REPORTS VERIFICATION ---');

  // 1. Super Admin Login
  console.log('\n[1] Logging in as Super Admin...');
  const saLogin = await api('POST', '/auth/login', null, {
    mobile: '9999999999',
    password: 'Admin@12345',
  });
  if (saLogin.statusCode !== 200 && saLogin.statusCode !== 201) {
    throw new Error(`Admin login failed: ${JSON.stringify(saLogin)}`);
  }
  const saToken = saLogin.data.data.accessToken;

  // 2. Create Tenant 1 (Quarry Customer)
  const mobile1 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`\n[2] Creating Customer: ${mobile1}`);
  const createCust = await api('POST', '/admin/users', saToken, {
    mobile: mobile1,
    password: 'Password123!',
    businessName: 'Highland Stone Aggregates',
  });
  if (createCust.statusCode !== 201 && createCust.statusCode !== 200) {
    throw new Error(`Create customer failed: ${JSON.stringify(createCust)}`);
  }
  
  // Login as Customer 1
  const custLogin = await api('POST', '/auth/login', null, {
    mobile: mobile1,
    password: 'Password123!',
  });
  const customerToken = custLogin.data.data.accessToken;

  // 3. Create Tenant 2 for cross-tenant isolation testing
  const mobile2 = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`\n[3] Creating Tenant 2: ${mobile2}`);
  const createCust2 = await api('POST', '/admin/users', saToken, {
    mobile: mobile2,
    password: 'Password123!',
    businessName: 'Other Quarry',
  });
  const cust2Login = await api('POST', '/auth/login', null, {
    mobile: mobile2,
    password: 'Password123!',
  });
  const customer2Token = cust2Login.data.data.accessToken;

  // 4. Setup Master Data for Customer 1
  console.log('\n[4] Setting up Master Data for Customer 1...');
  // Site
  const siteRes = await api('POST', '/sites', customerToken, {
    siteName: 'Highland Main Quarry',
    location: 'Nelamangala Bypass',
    pincode: '562123',
  });
  const siteId = siteRes.data.data.id;

  // Global Types
  const vtList = await api('GET', '/vehicle-types', customerToken);
  const vehicleTypeId = vtList.data.data[0].id; // e.g. Dumper 10-Wheeler
  const matList = await api('GET', '/material-types', customerToken);
  const mat1Id = matList.data.data[0].id; // e.g. M-Sand
  const mat2Id = matList.data.data[1].id; // e.g. Aggregates 20mm

  // Vehicles
  const veh1 = await api('POST', '/vehicles', customerToken, {
    vehicleNumber: 'KA-04-AB-1111',
    vehicleTypeId,
  });
  const veh1Id = veh1.data.data.id;

  const veh2 = await api('POST', '/vehicles', customerToken, {
    vehicleNumber: 'KA-04-AB-2222',
    vehicleTypeId,
  });
  const veh2Id = veh2.data.data.id;

  // Contractors
  const cont1 = await api('POST', '/contractors', customerToken, {
    name: 'Southern Logistics & Earthmovers',
    mobile: '9845012345',
  });
  const cont1Id = cont1.data.data.id;

  const cont2 = await api('POST', '/contractors', customerToken, {
    name: 'Kaveri Infra Projects',
    mobile: '9845098765',
  });
  const cont2Id = cont2.data.data.id;

  // Rates
  await api('POST', '/rates', customerToken, {
    siteId,
    vehicleTypeId,
    materialTypeId: mat1Id,
    amount: 3500.0,
  });

  await api('POST', '/rates', customerToken, {
    siteId,
    vehicleTypeId,
    materialTypeId: mat2Id,
    amount: 4500.0,
  });

  // 5. Record 4 Dispatches / Loads
  console.log('\n[5] Recording 4 Dispatches across Contractors, Materials, and Payment Types...');
  // Load 1: Cont 1, Mat 1, Veh 1, CREDIT, 2026-08-10 -> 3500
  const l1 = await api('POST', '/loads', customerToken, {
    siteId,
    vehicleId: veh1Id,
    materialTypeId: mat1Id,
    contractorId: cont1Id,
    paymentType: 'CREDIT',
    date: '2026-08-10',
  });
  console.log(`- Load 1 (Cont 1, Mat 1, CREDIT): ₹${l1.data.data.amount}`);

  // Load 2: Cont 1, Mat 2, Veh 2, CREDIT, 2026-08-15 -> 4500
  const l2 = await api('POST', '/loads', customerToken, {
    siteId,
    vehicleId: veh2Id,
    materialTypeId: mat2Id,
    contractorId: cont1Id,
    paymentType: 'CREDIT',
    date: '2026-08-15',
  });
  console.log(`- Load 2 (Cont 1, Mat 2, CREDIT): ₹${l2.data.data.amount}`);

  // Load 3: Cont 1, Mat 1, Veh 1, CASH, 2026-08-18 -> 3500
  const l3 = await api('POST', '/loads', customerToken, {
    siteId,
    vehicleId: veh1Id,
    materialTypeId: mat1Id,
    contractorId: cont1Id,
    paymentType: 'CASH',
    date: '2026-08-18',
  });
  console.log(`- Load 3 (Cont 1, Mat 1, CASH): ₹${l3.data.data.amount}`);

  // Load 4: Cont 2, Mat 2, Veh 2, CREDIT, 2026-08-18 -> 4500
  const l4 = await api('POST', '/loads', customerToken, {
    siteId,
    vehicleId: veh2Id,
    materialTypeId: mat2Id,
    contractorId: cont2Id,
    paymentType: 'CREDIT',
    date: '2026-08-18',
  });
  console.log(`- Load 4 (Cont 2, Mat 2, CREDIT): ₹${l4.data.data.amount}`);

  // 6. Test GET /reports/contractors-summary
  console.log('\n[6] Testing GET /api/v1/reports/contractors-summary...');
  const summaryRes = await api('GET', '/reports/contractors-summary', customerToken);
  const summary = summaryRes.data.data;
  console.log('Grand Total:', summary.grandTotal);
  if (summary.grandTotal.totalTrips !== 4) throw new Error('Expected grandTotal.totalTrips === 4');
  if (summary.grandTotal.totalAmount !== 16000) throw new Error('Expected grandTotal.totalAmount === 16000');
  if (summary.grandTotal.cashAmount !== 3500) throw new Error('Expected grandTotal.cashAmount === 3500');
  if (summary.grandTotal.creditAmount !== 12500) throw new Error('Expected grandTotal.creditAmount === 12500');

  const c1Summary = summary.contractors.find((c) => c.contractor.id === cont1Id);
  console.log('Contractor 1 Stats:', c1Summary.stats);
  if (c1Summary.stats.totalTrips !== 3) throw new Error('Expected c1 totalTrips === 3');
  if (c1Summary.stats.totalAmount !== 11500) throw new Error('Expected c1 totalAmount === 11500');
  if (c1Summary.stats.cashAmount !== 3500) throw new Error('Expected c1 cashAmount === 3500');
  if (c1Summary.stats.creditAmount !== 8000) throw new Error('Expected c1 creditAmount === 8000');

  // 7. Test GET /reports/settlement for Contractor 1
  console.log('\n[7] Testing GET /api/v1/reports/settlement for Contractor 1...');
  const stmtRes = await api('GET', `/reports/settlement?contractorId=${cont1Id}`, customerToken);
  const stmt = stmtRes.data.data;
  console.log('Contractor 1 Statement Summary:', stmt.summary);
  if (stmt.summary.totalTrips !== 3) throw new Error('Expected stmt totalTrips === 3');
  if (stmt.summary.totalAmount !== 11500) throw new Error('Expected stmt totalAmount === 11500');
  if (stmt.summary.creditAmount !== 8000) throw new Error('Expected stmt creditAmount === 8000');

  console.log('Material Breakdown:', stmt.materialBreakdown);
  if (stmt.materialBreakdown.length !== 2) throw new Error('Expected 2 material breakdown items');

  console.log('Vehicle Breakdown:', stmt.vehicleBreakdown);
  if (stmt.vehicleBreakdown.length !== 2) throw new Error('Expected 2 vehicle breakdown items');

  console.log('Trips in Statement:', stmt.trips.length);
  if (stmt.trips.length !== 3) throw new Error('Expected 3 trips in statement');

  // 8. Test Date Range Filter on Settlement (2026-08-12 to 2026-08-18)
  console.log('\n[8] Testing Date Range Filter on Settlement (2026-08-12 to 2026-08-18)...');
  const dateFiltered = await api(
    'GET',
    `/reports/settlement?contractorId=${cont1Id}&startDate=2026-08-12&endDate=2026-08-18`,
    customerToken
  );
  const dateStmt = dateFiltered.data.data;
  console.log('Filtered Trips (excluding 2026-08-10):', dateStmt.summary.totalTrips);
  if (dateStmt.summary.totalTrips !== 2) throw new Error('Expected 2 trips within date range');
  if (dateStmt.summary.totalAmount !== 8000) throw new Error('Expected totalAmount === 8000');

  // 9. Test Payment Type Filter on Settlement (paymentType=CREDIT)
  console.log('\n[9] Testing Payment Filter on Settlement (paymentType=CREDIT)...');
  const creditFiltered = await api(
    'GET',
    `/reports/settlement?contractorId=${cont1Id}&paymentType=CREDIT`,
    customerToken
  );
  const creditStmt = creditFiltered.data.data;
  console.log('Credit Only Trips (excluding CASH):', creditStmt.summary.totalTrips);
  if (creditStmt.summary.totalTrips !== 2) throw new Error('Expected 2 credit trips');
  if (creditStmt.summary.cashAmount !== 0) throw new Error('Expected cashAmount === 0');

  // 10. Test Multi-Tenant Security Isolation
  console.log('\n[10] Testing Multi-Tenant Security Isolation (Customer 2 querying Customer 1 Contractor)...');
  const isolationCheck = await api(
    'GET',
    `/reports/settlement?contractorId=${cont1Id}`,
    customer2Token
  );
  console.log(`Isolation response status code: ${isolationCheck.statusCode}`);
  if (isolationCheck.statusCode !== 403 && isolationCheck.statusCode !== 404) {
    throw new Error('Tenant 2 was able to access Tenant 1 settlement!');
  }

  console.log('\n✅ ALL HURDLE 9 VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
