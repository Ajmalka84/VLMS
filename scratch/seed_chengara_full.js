const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vlms:vlms_dev_password@localhost:5432/vlms?schema=public';

const rawData = `SL No	Date	C/O	Vehicle No	Model	Cash
1	1/9/2026	Sathar Pattimattom	KL 01 BX 2723	Torus 10	
2	1/9/2026	Jabbar Pattimattom	KL 40 Q 552	Torus 10	
3	1/9/2026	Jabbar Pattimattom	KL 17 P 4250	Torus 10	
4	1/9/2026	Ummar Valloorans	KL 63 C 2809	Torus 10	
5	1/9/2026	Jabbar Pattimattom	KL 40 U 4516	Torus 10	
6	1/9/2026	Sathar Pattimattom	KL 05 AM 8577	Torus 10	
7	1/9/2026	Jabbar Pattimattom	KL 40 L 9787	Torus 10	
8	1/9/2026	Ummar Valloorans	KL 67 A 0031	Torus 10	
9	1/9/2026	Jabbar Pattimattom	KL 40 P 5209	Torus 10	
10	1/9/2026	Ummar Valloorans	KL 36 F 3245	Torus 10	
11	1/9/2026	Mubeen	KL 40 W 7527	Mastha	
12	1/9/2026	Jaffer Basheer	KL 45 U 5338	12 Wheel	
13	1/9/2026	Mubeen	KL 08 BP 8454	Mastha	
14	1/9/2026	Ummar Valloorans	KL 44 G 1830	Torus 10	
15	1/9/2026	Mubeen	KL 40 W 5797	Mastha	
16	1/9/2026	Ummar Valloorans	KL 40 N 8919	Torus 10	
17	1/9/2026	Mubeen	KL 40 W 7565	Mastha	
18	1/9/2026	Shashi Thilak	KL 08 BC 7436	Mastha	
19	1/9/2026	Bosco	KL 07 CQ 0518	Torus 10	
20	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
21	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
22	1/9/2026	Franklin	KL 07 CZ 0718	Mastha	
23	1/9/2026		KL 85 B 6116	12 Wheel	8000
24	1/9/2026	Aby Kuzhiyanjal	KL 40 T 0299	Torus 10	
25	1/9/2026	Ummar Valloorans	KL 36 E 6775	Torus 10	
26	1/9/2026	Mubeen	KL 40 W 6504	Mastha	
27	1/9/2026		KL 40 P 6282	12 Wheel	8000
28	1/9/2026	Saleem Chengara	KL 88 H 0398	12 Wheel	
29	1/9/2026	T A Trading	KL 40 T 6667	12 Wheel	
30	1/9/2026	Ummar Valloorans	KL 40 L 6929	Torus 10	
31	1/9/2026	Mubeen	KL 40 U 8901	Mastha	
32	1/9/2026	Baby Kodanad	KL 41 M 545	Torus 10	
33	1/9/2026	Aby Kuzhiyanjal	KL 40 R 4858	Torus 10	
34	1/9/2026	Aby Kuzhiyanjal	KL 40 P 5078	Torus 10	
35	1/9/2026	Ummar Valloorans	KL 40 Q 7204	Torus 10	
36	1/9/2026	Shashi Thilak	KL 39 R 2196	Mastha	
37	1/9/2026	Ummar Valloorans	KL 41 H 5624	Torus 10	
38	1/9/2026	Ummar Valloorans	KL 47 D 2093	Torus 10	
39	1/9/2026	Saleem Chengara	KL 63 H 0398	12 Wheel	
40	1/9/2026	Aby Kuzhiyanjal	KL 40 Q 3299	Torus 10	
41	1/9/2026	Aby Kuzhiyanjal	KL 40 T 0299	Torus 10	
42	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
43	1/9/2026	Bosco	KL 40 Q 552	Torus 10	
44	1/9/2026	T A Trading	KL 39 G 2122	Torus 10	
45	1/9/2026	Bosco	KL 17 P 4250	Torus 10	
46	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
47	1/9/2026	Mubeen	KL 40 W 7565	Mastha	
48	1/9/2026	Franklin	KL 07 CZ 0918	Mastha	
49	1/9/2026	Mubeen	KL 40 W 5797	Mastha	
50	1/9/2026	Bosco	KL 07 CQ 0518	Torus 10	
51	1/9/2026	Ummar Valloorans	KL 40 P 4989	Torus 10	
52	1/9/2026	Jabbar Pattimattom	KL 40 P 5209	Torus 10	
53	1/9/2026	Ummar Valloorans	KL 40 L 3801	Torus 10	
54	1/9/2026	Ummar Valloorans	KL 63 C 2809	Torus 10	
55	1/9/2026	Ummar Valloorans	KL 67 A 0031	Torus 10	
56	1/9/2026	Ummar Valloorans	KL 40 M 0637	Torus 10	
57	1/9/2026	Ummar Valloorans	KL 36 E 6775	Torus 10	
58	1/9/2026	Shashi Thilak	KL 08 BC 7436	Mastha	
59	1/9/2026	Ummar Valloorans	KL 40 N 8919	Torus 10	
60	1/9/2026	Ummar Valloorans	KL 36 F 3245	Torus 10	
61	1/9/2026	Baby Kodanad	KL 47 F 2284	Torus 10	
62	1/9/2026	Ummar Valloorans	KL 44 G 1830	Torus 10	
63	1/9/2026	Ummar Valloorans	KL 40 L 6929	Torus 10	
64	1/9/2026		KL 43 R 2049	Mastha	1600
65	1/9/2026	Dixon (Bosco)	KL 40 U 8901	Mastha	
66	1/9/2026	Dixon (Bosco)	KL 40 V 5553	Mastha	
67	1/9/2026		KL 85 B 6116	12 Wheel	8000
68	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
69	1/9/2026	Dixon (Bosco)	KL 40 W 7565	Mastha	
70	1/9/2026	Baby Kodanad	KL 41 M 545	Torus 10	
71	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
72	1/9/2026	Saleem Chengara	KL 07 DH 5867	12 Wheel	
73	1/9/2026	Bava	KL 40 Q 2504	Torus 10	
74	1/9/2026	Saleem Chengara	KL 07 CZ 0476	12 Wheel	
75	1/9/2026	Baby Kodanad	KL 47 F 2284	Torus 10	
76	1/9/2026	Jaffer Basheer	KL 07 CA 1581	Torus 10	
77	1/9/2026		KL 4 1 R 7350	Mastha	1600
78	1/9/2026	Jaffer Basheer	KL 45 U 5338	12 Wheel	
79	1/9/2026	Jaffer Basheer	KL 08 CB 9067	Torus 10	
80	1/9/2026	Jaffer Basheer	KL 23 Q 8221	12 Wheel	
81	1/9/2026		KL 40 W 7546	12 Wheel	8000
82	1/9/2026	Dixon (Bosco)	KL 40 U 8901	Mastha	
83	1/9/2026	T A Trading	KL 40 T 6667	12 Wheel	
84	1/9/2026	Dixon (Bosco)	KL 40 W 7565	Mastha	
85	1/9/2026	Dixon (Bosco)	KL 40 V 5553	Mastha	
86	1/9/2026	Franklin	KL 07 CZ 0718	Mastha	
87	1/9/2026	Jaffer Basheer	KL 08 BQ 0686	Torus 10	
88	1/9/2026	Baby Kodanad	KL 41 M 545	Torus 10	
89	1/9/2026	Swadhesh Railway	KL 07 DF 9521	Torus 10	
90	1/9/2026	Swadhesh Railway	KL 40 R 5752	Torus 10	
91	1/9/2026	Ummar Valloorans	KL 40 M 0637	Torus 10	
92	1/9/2026	Bosco	KL 07 CQ 0518	Torus 10	
93	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
94	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
95	1/9/2026	Swadhesh Railway	KL 07 DF 9556	Torus 10	
96	1/9/2026	Jabbar Pattimattom	KL 40 P 5209	Torus 10	
97	1/9/2026	Ummar Valloorans	KL 41 J 3528	Torus 10	
98	1/9/2026	Ummar Valloorans	KL 63 C 2809	Torus 10	
99	1/9/2026	Ummar Valloorans	KL 47 D 2093	Torus 10	
100	1/9/2026	Baby Kodanad	KL 47 F 2284	Torus 10	
101	1/9/2026	Ummar Valloorans	KL 36 F 3245	Torus 10	
102	1/9/2026	Ummar Valloorans	KL 40 P 4989	Torus 10	
103	1/9/2026	Ummar Valloorans	KL 67 A 0031	Torus 10	
104	1/9/2026	Ummar Valloorans	KL 30 E 6775	Torus 10	
105	1/9/2026	Ummar Valloorans	KL 40 N 8919	Torus 10	
106	1/9/2026	Ummar Valloorans	KL 40 L 3801	Torus 10	
107	1/9/2026	Saleem Chengara	KL 63 H 0398	12 Wheel	
108	1/9/2026	Dixon (Bosco)	KL 40 U 8901	Mastha	
109	1/9/2026	Saleem Chengara	KL 07 CZ 0476	12 Wheel	
110	1/9/2026		KL 32 U 5577	12 Wheel	8000
111	1/9/2026	Amari	KL 40 L 9787	Torus 10	
112	1/9/2026	Dixon (Bosco)	KL 40 V 5553	Mastha	
113	1/9/2026	Dixon (Bosco)	KL 40 W 7565	Mastha	
114	1/9/2026	Franklin	KL 07 CZ 0718	Mastha	
115	1/9/2026	Saleem Chengara	KL 07 DH 5867	12 Wheel	
116	1/9/2026	Ummar Valloorans	KL 44 G 1830	Torus 10	
117	1/9/2026	Bosco	KL 40 W 6504	Mastha	
118	1/9/2026	Ummar Valloorans	KL 40 N 6622	Torus 10	
119	1/9/2026	Aby Kuzhiyanjal	KL 40 R 4858	Torus 10	
120	1/9/2026	Aby Kuzhiyanjal	KL 40 P 5078	Torus 10	
121	1/9/2026	T A Trading	KL 39 G 2122	Torus 10	
122	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
123	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
124	1/9/2026	Swadhesh Railway	KL 07 DF 9521	Torus 10	
125	1/9/2026	Jaffer Basheer	KL 08 CD 5453	Torus 10	
126	1/9/2026	Jaffer Basheer	KL 08 CA 2142	Torus 10	
127	1/9/2026	Amari	KL 40 L 9787	Torus 10	
128	1/9/2026	Franklin	KL 07 CZ 0718	Mastha	
129	1/9/2026	Swadhesh Railway	KL 40 R 5752	Torus 10	
130	1/9/2026	Baby Kodanad	KL 41 M 545	Torus 10	
131	1/9/2026	Dixon (Bosco)	KL 40 W 7565	Mastha	
132	1/9/2026	Dixon (Bosco)	KL 40 U 8901	Mastha	
133	1/9/2026	Dixon (Bosco)	KL 40 V 5553	Mastha	
134	1/9/2026	Ummar Valloorans	KL 40 N 6622	Torus 10	
135	1/9/2026	Franklin	KL 07 DC 6033	Mastha	
136	1/9/2026	Franklin	KL 07 DC 6044	Mastha	
137	1/9/2026		KL 40 W 7546	12 Wheel	8000
138	1/9/2026	Ummar Valloorans	KL 01 BW 3976	Torus 10	
139	1/9/2026	Amari	KL 40 L 9787	Torus 10	
140	1/9/2026	Ummar Valloorans	KL 40 N 6622	Torus 10	
141	1/9/2026	Ummar Valloorans	KL 40 Q 7204	Torus 10	
142	1/9/2026	Dixon (Bosco)	KL 40 W 7565	Mastha	
143	1/9/2026	Dixon (Bosco)	KL 40 U 8901	Mastha	
144	1/9/2026	Dixon (Bosco)	KL 40 V 5553	Mastha	`;

function normalizeVehicle(veh) {
  return veh.replace(/\s+/g, ' ').replace('KL 4 1', 'KL 41').trim();
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('Connected to DB');

  // 1. Ensure User "Ajmal Test Space"
  let userRes = await client.query("SELECT id, business_name FROM users WHERE business_name = 'Ajmal Test Space' OR mobile = '9633415164'");
  let userId;
  if (userRes.rows.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin@12345', 10);
    const insertUser = await client.query(
      `INSERT INTO users (id, business_name, mobile, password_hash, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), 'Ajmal Test Space', '9633415164', $1, true, NOW(), NOW())
       RETURNING id`,
      [hash]
    );
    userId = insertUser.rows[0].id;
    console.log('Created user "Ajmal Test Space":', userId);
  } else {
    userId = userRes.rows[0].id;
    await client.query("UPDATE users SET business_name = 'Ajmal Test Space' WHERE id = $1", [userId]);
    console.log('Using existing user:', userId);
  }

  // 2. Ensure Site "Chengara"
  let siteRes = await client.query("SELECT id FROM sites WHERE user_id = $1 AND LOWER(site_name) = 'chengara'", [userId]);
  let siteId;
  if (siteRes.rows.length === 0) {
    const insertSite = await client.query(
      `INSERT INTO sites (id, user_id, site_name, location, pincode, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'Chengara', 'Chengara Quarry Site', '683549', NOW(), NOW())
       RETURNING id`,
      [userId]
    );
    siteId = insertSite.rows[0].id;
    console.log('Created site "Chengara":', siteId);
  } else {
    siteId = siteRes.rows[0].id;
    console.log('Using site "Chengara":', siteId);
  }

  // 3. Ensure Vehicle Types: "Torus 10", "Mastha", "12 Wheel"
  const neededTypes = ['Torus 10', 'Mastha', '12 Wheel'];
  const typeMap = {};
  for (const tName of neededTypes) {
    let tRes = await client.query("SELECT id FROM vehicle_types WHERE LOWER(name) = LOWER($1)", [tName]);
    if (tRes.rows.length === 0) {
      const ins = await client.query(
        "INSERT INTO vehicle_types (id, name, created_at, updated_at) VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id",
        [tName]
      );
      typeMap[tName] = ins.rows[0].id;
      console.log('Created vehicle type:', tName, typeMap[tName]);
    } else {
      typeMap[tName] = tRes.rows[0].id;
    }
  }

  // 4. Ensure Material: "Gravel"
  let matRes = await client.query("SELECT id FROM material_types WHERE LOWER(name) = 'gravel'");
  let materialId;
  if (matRes.rows.length === 0) {
    const insMat = await client.query(
      "INSERT INTO material_types (id, name, created_at, updated_at) VALUES (gen_random_uuid(), 'Gravel', NOW(), NOW()) RETURNING id",
    );
    materialId = insMat.rows[0].id;
  } else {
    materialId = matRes.rows[0].id;
  }

  // 5. Ensure Rates for Chengara + (Torus 10: 5000, Mastha: 1600, 12 Wheel: 8000)
  const defaultRates = {
    '12 Wheel': 8000,
    'Mastha': 1600,
    'Torus 10': 5000,
  };
  const rateMap = {};

  for (const [vTypeName, defaultAmt] of Object.entries(defaultRates)) {
    const vTypeId = typeMap[vTypeName];
    let rRes = await client.query(
      "SELECT id, amount FROM rates WHERE site_id = $1 AND vehicle_type_id = $2 AND material_type_id = $3",
      [siteId, vTypeId, materialId]
    );
    if (rRes.rows.length === 0) {
      const insRate = await client.query(
        `INSERT INTO rates (id, site_id, vehicle_type_id, material_type_id, amount, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, amount`,
        [siteId, vTypeId, materialId, defaultAmt]
      );
      rateMap[vTypeName] = { id: insRate.rows[0].id, amount: Number(insRate.rows[0].amount) };
      console.log(`Created rate for ${vTypeName}: ₹${defaultAmt}`);
    } else {
      rateMap[vTypeName] = { id: rRes.rows[0].id, amount: Number(rRes.rows[0].amount) };
    }
  }

  // Parse lines
  const lines = rawData.trim().split('\n').slice(1);
  console.log(`Parsed ${lines.length} lines.`);

  // 6. Ensure Contractors
  const contractorNames = new Set();
  for (const line of lines) {
    const parts = line.split('\t');
    const co = parts[2] ? parts[2].trim() : '';
    if (co) contractorNames.add(co);
  }

  const contractorMap = {};
  for (const cName of contractorNames) {
    let cRes = await client.query("SELECT id FROM contractors WHERE user_id = $1 AND LOWER(name) = LOWER($2)", [userId, cName]);
    if (cRes.rows.length === 0) {
      const insC = await client.query(
        `INSERT INTO contractors (id, user_id, name, mobile, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, '9800000000', NOW(), NOW())
         RETURNING id`,
        [userId, cName]
      );
      contractorMap[cName] = insC.rows[0].id;
      console.log('Created contractor:', cName);
    } else {
      contractorMap[cName] = cRes.rows[0].id;
    }
  }

  // 7. Ensure Vehicles
  const vehicleMap = {};
  for (const line of lines) {
    const parts = line.split('\t');
    const rawVeh = parts[3];
    const model = parts[4] ? parts[4].trim() : 'Torus 10';
    if (!rawVeh) continue;
    const vehNo = normalizeVehicle(rawVeh);
    const vTypeId = typeMap[model] || typeMap['Torus 10'];

    if (!vehicleMap[vehNo]) {
      let vRes = await client.query("SELECT id FROM vehicles WHERE user_id = $1 AND vehicle_number = $2", [userId, vehNo]);
      if (vRes.rows.length === 0) {
        const insV = await client.query(
          `INSERT INTO vehicles (id, user_id, vehicle_number, vehicle_type_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
           RETURNING id`,
          [userId, vehNo, vTypeId]
        );
        vehicleMap[vehNo] = insV.rows[0].id;
        console.log('Created vehicle:', vehNo, `(${model})`);
      } else {
        vehicleMap[vehNo] = vRes.rows[0].id;
      }
    }
  }

  // 8. Clear previous loads for 2026-09-01 for this site if re-running
  await client.query("DELETE FROM loads WHERE site_id = $1 AND date = '2026-09-01'", [siteId]);

  // 9. Insert Loads
  let insertedCount = 0;
  const baseTime = new Date('2026-09-01T06:00:00.000Z');

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    const slNo = parseInt(parts[0], 10);
    const coName = parts[2] ? parts[2].trim() : '';
    const rawVeh = parts[3];
    const vehNo = normalizeVehicle(rawVeh);
    const model = parts[4] ? parts[4].trim() : 'Torus 10';
    const cashStr = parts[5] ? parts[5].trim() : '';

    const vehicleId = vehicleMap[vehNo];
    const contractorId = coName ? contractorMap[coName] : null;
    const rateInfo = rateMap[model] || rateMap['Torus 10'];

    let paymentType = 'CREDIT';
    let amount = rateInfo.amount;

    if (cashStr) {
      paymentType = 'CASH';
      amount = parseFloat(cashStr) || rateInfo.amount;
    }

    const loadTime = new Date(baseTime.getTime() + i * 180000); // 3 mins apart starting 6 AM

    await client.query(
      `INSERT INTO loads (id, site_id, date, vehicle_id, material_type_id, contractor_id, rate_id, amount, payment_type, remarks, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, '2026-09-01', $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [
        siteId,
        vehicleId,
        materialId,
        contractorId,
        rateInfo.id,
        amount,
        paymentType,
        `Imported Trip #${slNo}`,
        loadTime
      ]
    );

    insertedCount++;
  }

  console.log(`\n🎉 SUCCESS! Inserted ${insertedCount} loads for site "Chengara" under "Ajmal Test Space" on 2026-09-01.`);
  await client.end();
}

run().catch(err => {
  console.error('Error seeding data:', err);
  process.exit(1);
});
