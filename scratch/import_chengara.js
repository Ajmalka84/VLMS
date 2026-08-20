const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://vlms:vlms_dev_password@localhost:5432/vlms?schema=public';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('Connected to database.');

  // Find users
  const usersRes = await client.query('SELECT id, business_name, mobile FROM users');
  console.log('Users:', usersRes.rows);

  // Find sites
  const sitesRes = await client.query('SELECT id, user_id, site_name, location FROM sites');
  console.log('Sites:', sitesRes.rows);

  // Find vehicle types
  const vtRes = await client.query('SELECT id, name FROM vehicle_types');
  console.log('Vehicle Types:', vtRes.rows);

  // Find materials
  const matRes = await client.query('SELECT id, name FROM material_types');
  console.log('Material Types:', matRes.rows);

  // Find rates
  const ratesRes = await client.query('SELECT r.id, r.site_id, s.site_name, vt.name as vehicle_type, mt.name as material, r.amount FROM rates r JOIN sites s ON r.site_id = s.id JOIN vehicle_types vt ON r.vehicle_type_id = vt.id JOIN material_types mt ON r.material_type_id = mt.id');
  console.log('Rates:', ratesRes.rows);

  // Find contractors
  const contractorsRes = await client.query('SELECT id, user_id, name, mobile FROM contractors');
  console.log('Contractors count:', contractorsRes.rows.length);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
