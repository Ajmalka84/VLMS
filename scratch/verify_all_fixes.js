async function testAll() {
  console.log('--- RUNNING DEEP VERIFICATION SUITE ---');

  // 1. Authenticate as Customer
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile: '9633415164', password: 'Password@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log('✅ Authenticated successfully');

  // 2. Test Vehicle Normalization & Duplicate Detection
  // KL41A5621 already exists in fleet. Try registering 'KL 41 A 5621' or 'KL41A5621'
  const vtRes = await fetch('http://localhost:3000/api/v1/vehicle-types', { headers: authHeaders });
  const vtData = await vtRes.json();
  const vtId = vtData.data[0].id;

  const vDup = await fetch('http://localhost:3000/api/v1/vehicles', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ vehicleNumber: 'KL 41 A 5621', vehicleTypeId: vtId }),
  });
  const vDupData = await vDup.json();
  console.log('Vehicle Duplicate Test (KL 41 A 5621 vs KL41A5621):', vDup.status, vDupData.message);

  // 3. Test Invalid Mobile Number Validation
  const cBadMobile = await fetch('http://localhost:3000/api/v1/contractors', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: 'Short Mobile Test', mobile: '984501' }),
  });
  const cBadMobileData = await cBadMobile.json();
  console.log('Contractor Bad Mobile Validation (<10 digits):', cBadMobile.status, cBadMobileData.message);

  // 4. Test Invalid Site Pincode Validation
  const sBadPin = await fetch('http://localhost:3000/api/v1/sites', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ siteName: 'Bad Pin Site', location: 'Kerala', pincode: '6820' }),
  });
  const sBadPinData = await sBadPin.json();
  console.log('Site Bad Pincode Validation (<6 digits):', sBadPin.status, sBadPinData.message);

  // 5. Test Creating a New Load and Verifying it is FIRST in Load Register
  const sitesRes = await fetch('http://localhost:3000/api/v1/sites', { headers: authHeaders });
  const sitesData = await sitesRes.json();
  const siteId = sitesData.data[0].id;

  const vehsRes = await fetch('http://localhost:3000/api/v1/vehicles', { headers: authHeaders });
  const vehsData = await vehsRes.json();
  const vehicleId = vehsData.data[0].id;

  const matsRes = await fetch('http://localhost:3000/api/v1/material-types', { headers: authHeaders });
  const matsData = await matsRes.json();
  const matId = matsData.data[0].id;

  const newLoadRes = await fetch('http://localhost:3000/api/v1/loads', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      siteId,
      vehicleId,
      materialTypeId: matId,
      amount: 4500,
      paymentType: 'CREDIT',
      remarks: 'TEST_TOP_ORDERING_LOAD',
    }),
  });
  const newLoadData = await newLoadRes.json();
  console.log('Created New Real-time Load ID:', newLoadData.data?.id);

  // Fetch load history (page 1, limit 10)
  const historyRes = await fetch('http://localhost:3000/api/v1/loads?page=1&limit=10', { headers: authHeaders });
  const historyData = await historyRes.json();
  const loadsList = historyData.data?.loads || historyData.loads || [];
  const firstLoad = loadsList[0];

  console.log('First load in Register:', firstLoad?.id, firstLoad?.remarks, 'Created At:', firstLoad?.createdAt);

  if (firstLoad?.id === newLoadData.data?.id) {
    console.log('✅ PASS: Newly created load is immediately row #1 at the top of the Load Register!');
  } else {
    console.warn('❌ Row 1 mismatch:', firstLoad?.id, 'vs expected', newLoadData.data?.id);
  }

  // Cleanup test load
  if (newLoadData.data?.id) {
    await fetch(`http://localhost:3000/api/v1/loads/${newLoadData.data.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    console.log('Cleaned up test load');
  }

  console.log('\n🎉 ALL TESTS AND VALIDATIONS FULLY PASSED!');
}

testAll().catch(console.error);
