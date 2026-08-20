const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STANDARD_VEHICLE_TYPES = [
  '6 Wheeler Tipper',
  '10 Wheeler Taurus / Tipper',
  '12 Wheeler Lorry',
  'Tractor Trailer',
  'Mini Truck / Pickup (4 Wheeler)',
];

const STANDARD_MATERIAL_TYPES = [
  'M-Sand (Manufactured Sand)',
  'P-Sand (Plastering Sand)',
  '6mm Metal / Aggregate',
  '12mm Metal / Aggregate',
  '20mm Metal / Aggregate',
  '40mm Metal / Aggregate',
  'Crusher Dust / Quarry Dust',
  'GSB (Granular Sub-Base)',
  'WMM (Wet Mix Macadam)',
  'Boulders / Rubble',
  'Red Earth / Filling Soil',
];

async function main() {
  console.log('🌱 Starting Global Masters seeding...');

  // Seed Vehicle Types
  for (const name of STANDARD_VEHICLE_TYPES) {
    await prisma.vehicleType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ Vehicle Type: ${name}`);
  }

  // Seed Material Types
  for (const name of STANDARD_MATERIAL_TYPES) {
    await prisma.materialType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✓ Material Type: ${name}`);
  }

  console.log('✅ Global Masters seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
