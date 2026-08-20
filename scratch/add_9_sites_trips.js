const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vlms:vlms_dev_password@localhost:5432/vlms?schema=public';

const newSitesConfig = [
  { name: 'Kolenchery Crusher Unit', location: 'Kolenchery Junction', pincode: '682311' },
  { name: 'Perumbavoor Quarry Yard', location: 'MC Road Perumbavoor', pincode: '683542' },
  { name: 'Muvattupuzha Hills Quarry', location: 'Pezhakkappilly Muvattupuzha', pincode: '686673' },
  { name: 'Kothamangalam Granite Mine', location: 'Karukadom Kothamangalam', pincode: '686691' },
  { name: 'Piravom Valley Quarry', location: 'Piravom Bridge Road', pincode: '686664' },
  { name: 'Angamaly Bypass Stockyard', location: 'NH 544 Angamaly', pincode: '683572' },
  { name: 'Aluva Riverbank Aggregates', location: 'Bank Road Aluva', pincode: '683101' },
  { name: 'Thripunithura Depot', location: 'Hill Palace Road Thripunithura', pincode: '682301' },
  { name: 'Pattimattom Blue Metal Quarry', location: 'Pattimattom Quarry Zone', pincode: '683562' },
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('Connected to DB');

  // 1. Get Ajmal Test Space User ID
  const userRes = await client.query("SELECT id FROM users WHERE business_name = 'Ajmal Test Space' OR mobile = '9633415164'");
  if (userRes.rows.length === 0) {
    throw new Error('User "Ajmal Test Space" not found');
  }
  const userId = userRes.rows[0].id;
  console.log('Target User ID:', userId);

  // 2. Fetch all vehicle types
  const vtRes = await client.query("SELECT id, name FROM vehicle_types");
  const vtMap = {};
  for (const row of vtRes.rows) {
    vtMap[row.name] = row.id;
  }

  // 3. Fetch all materials
  const matRes = await client.query("SELECT id, name FROM material_types");
  const matList = matRes.rows;

  // 4. Fetch all contractors of this user
  const contRes = await client.query("SELECT id, name FROM contractors WHERE user_id = $1", [userId]);
  const contractors = contRes.rows;

  // 5. Fetch all vehicles of this user
  const vehRes = await client.query("SELECT id, vehicle_number, vehicle_type_id FROM vehicles WHERE user_id = $1", [userId]);
  const vehicles = vehRes.rows;

  if (vehicles.length === 0 || contractors.length === 0) {
    throw new Error('Vehicles or Contractors not found for this user');
  }

  console.log(`Found ${vehicles.length} vehicles, ${contractors.length} contractors, ${matList.length} materials.`);

  let totalSitesCreated = 0;
  let totalTripsCreated = 0;

  for (const sConf of newSitesConfig) {
    // Check if site already exists
    let sRes = await client.query("SELECT id FROM sites WHERE user_id = $1 AND LOWER(site_name) = LOWER($2)", [userId, sConf.name]);
    let siteId;
    if (sRes.rows.length === 0) {
      const insSite = await client.query(
        `INSERT INTO sites (id, user_id, site_name, location, pincode, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [userId, sConf.name, sConf.location, sConf.pincode]
      );
      siteId = insSite.rows[0].id;
      totalSitesCreated++;
      console.log(`Created site: "${sConf.name}" (${siteId})`);
    } else {
      siteId = sRes.rows[0].id;
      console.log(`Using existing site: "${sConf.name}"`);
    }

    // Configure Rate Matrix for this site
    // Default base rates by vehicle model
    const baseRates = {
      'Torus 10': 5000,
      'Mastha': 1600,
      '12 Wheel': 8000,
      'Dumper 10-Wheeler': 4500,
      'Tipper 6-Wheeler': 2500,
    };

    const siteRateMap = {}; // key: `${vtId}_${matId}` => { id, amount }
    for (const [vTypeName, vtId] of Object.entries(vtMap)) {
      const baseAmt = baseRates[vTypeName] || 4000;
      for (const mat of matList) {
        let rRes = await client.query(
          "SELECT id, amount FROM rates WHERE site_id = $1 AND vehicle_type_id = $2 AND material_type_id = $3",
          [siteId, vtId, mat.id]
        );
        if (rRes.rows.length === 0) {
          const insR = await client.query(
            `INSERT INTO rates (id, site_id, vehicle_type_id, material_type_id, amount, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
             RETURNING id, amount`,
            [siteId, vtId, mat.id, baseAmt]
          );
          siteRateMap[`${vtId}_${mat.id}`] = { id: insR.rows[0].id, amount: Number(insR.rows[0].amount) };
        } else {
          siteRateMap[`${vtId}_${mat.id}`] = { id: rRes.rows[0].id, amount: Number(rRes.rows[0].amount) };
        }
      }
    }

    // Determine trip count between 16 and 20
    const tripCount = Math.floor(Math.random() * 5) + 16; // 16, 17, 18, 19, 20

    // Remove previous seeded trips for this site if any
    await client.query("DELETE FROM loads WHERE site_id = $1", [siteId]);

    const dates = [
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
      '2026-09-01'
    ];

    for (let i = 1; i <= tripCount; i++) {
      // Pick random vehicle
      const randomVeh = vehicles[Math.floor(Math.random() * vehicles.length)];
      // Pick random material
      const randomMat = matList[Math.floor(Math.random() * matList.length)];
      // 85% credit with contractor, 15% direct cash sale
      const isCash = Math.random() < 0.15;
      const contractorId = isCash ? null : contractors[Math.floor(Math.random() * contractors.length)].id;
      const paymentType = isCash ? 'CASH' : 'CREDIT';

      // Find rate
      const rateInfo = siteRateMap[`${randomVeh.vehicle_type_id}_${randomMat.id}`] || Object.values(siteRateMap)[0];
      const amount = rateInfo ? rateInfo.amount : 5000;
      const rateId = rateInfo ? rateInfo.id : null;

      const dateStr = dates[i % dates.length];
      const hour = 6 + (i % 12);
      const minute = (i * 7) % 60;
      const tripTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);

      await client.query(
        `INSERT INTO loads (id, site_id, date, vehicle_id, material_type_id, contractor_id, rate_id, amount, payment_type, remarks, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          siteId,
          dateStr,
          randomVeh.id,
          randomMat.id,
          contractorId,
          rateId,
          amount,
          paymentType,
          `Trip #${i} (${sConf.name})`,
          tripTime
        ]
      );
      totalTripsCreated++;
    }

    console.log(`  ➔ Added ${tripCount} trips for "${sConf.name}"`);
  }

  console.log(`\n🎉 DONE! Created 9 sites and ${totalTripsCreated} total trips for Ajmal Test Space.`);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
