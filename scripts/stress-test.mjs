import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function runStressTest() {
  console.log('\n======================================================');
  console.log('⚡ VLMS CONCURRENT STRESS & THROUGHPUT TEST (50 CONCURRENT REQUESTS)');
  console.log('======================================================\n');

  // Authenticate as Super Admin to get or create a Tenant Owner
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: 'ajmalka84@gmail.com', password: '05thDec1995' }),
  });
  const json = await loginRes.json();
  const superToken = json.data?.accessToken;

  // Onboard Tenant
  const unique = Date.now().toString().slice(-5);
  const ownerMobile = `98${Math.floor(10000000 + Math.random() * 89999999).toString().slice(0, 8)}`;
  await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superToken}` },
    body: JSON.stringify({
      businessName: `Stress Quarry ${unique}`,
      mobile: ownerMobile,
      password: 'password123',
      subscriptionPlan: 'ANNUAL',
    }),
  });

  const ownerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: ownerMobile, password: 'password123' }),
  });
  const token = (await ownerLogin.json()).data?.accessToken;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Create a site
  const siteRes = await fetch(`${BASE_URL}/sites`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ siteName: `Site Stress ${unique}`, location: 'Ernakulam', pincode: '682001' }),
  });
  const siteId = (await siteRes.json()).data?.id;

  const CONCURRENT_USERS = 50;
  console.log(`Firing ${CONCURRENT_USERS} simultaneous requests across key endpoints with Owner token & Site ID...\n`);

  const endpoints = [
    { name: 'Master Data Bundle', path: '/master-data/bundle' },
    { name: 'Dashboard Summary', path: `/dashboard/summary?siteId=${siteId}` },
    { name: 'Loads Register', path: `/loads?siteId=${siteId}&page=1&limit=25` },
    { name: 'Expenses List', path: `/expenses?siteId=${siteId}&page=1&limit=25` },
    { name: 'Current Drawer', path: `/shifts/current-drawer?siteId=${siteId}` },
    { name: 'Balance Sheet', path: `/reports/balance-sheet?siteId=${siteId}` },
    { name: 'Customer Directory', path: '/admin/users?page=1&limit=25', auth: superToken },
  ];

  for (const ep of endpoints) {
    const start = performance.now();
    const reqHeaders = ep.auth
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${ep.auth}` }
      : headers;

    const promises = Array.from({ length: CONCURRENT_USERS }, () =>
      fetch(`${BASE_URL}${ep.path}`, { headers: reqHeaders })
    );

    const responses = await Promise.all(promises);
    const totalDuration = performance.now() - start;
    const allOk = responses.every((r) => r.status === 200);
    const avgPerReq = (totalDuration / CONCURRENT_USERS).toFixed(2);

    console.log(`▶ ${ep.name.padEnd(25)}: 50 concurrent requests in ${totalDuration.toFixed(2)}ms (throughput: ${(50 / (totalDuration / 1000)).toFixed(1)} req/s) - ${allOk ? '✅ 100% OK' : '❌ SOME FAILED'}`);
  }

  console.log('\n✨ CONCURRENCY TEST COMPLETED SUCCESSFULLY.\n');
}

runStressTest().catch(console.error);
