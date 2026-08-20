const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Raw Chengara dataset provided by user
const CHENGARA_RAW_DATA = [
  { sl: 1, date: '2026-09-01', co: 'Sathar Pattimattom', vehicle: 'KL 01 BX 2723', model: 'Torus 10', cash: null },
  { sl: 2, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 Q 552', model: 'Torus 10', cash: null },
  { sl: 3, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 17 P 4250', model: 'Torus 10', cash: null },
  { sl: 4, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 63 C 2809', model: 'Torus 10', cash: null },
  { sl: 5, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 U 4516', model: 'Torus 10', cash: null },
  { sl: 6, date: '2026-09-01', co: 'Sathar Pattimattom', vehicle: 'KL 05 AM 8577', model: 'Torus 10', cash: null },
  { sl: 7, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 L 9787', model: 'Torus 10', cash: null },
  { sl: 8, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 67 A 0031', model: 'Torus 10', cash: null },
  { sl: 9, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 P 5209', model: 'Torus 10', cash: null },
  { sl: 10, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 36 F 3245', model: 'Torus 10', cash: null },
  { sl: 11, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 7527', model: 'Mastha', cash: null },
  { sl: 12, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 45 U 5338', model: '12 Wheel', cash: null },
  { sl: 13, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 08 BP 8454', model: 'Mastha', cash: null },
  { sl: 14, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 44 G 1830', model: 'Torus 10', cash: null },
  { sl: 15, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 5797', model: 'Mastha', cash: null },
  { sl: 16, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 8919', model: 'Torus 10', cash: null },
  { sl: 17, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 18, date: '2026-09-01', co: 'Shashi Thilak', vehicle: 'KL 08 BC 7436', model: 'Mastha', cash: null },
  { sl: 19, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 07 CQ 0518', model: 'Torus 10', cash: null },
  { sl: 20, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 21, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 22, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 CZ 0718', model: 'Mastha', cash: null },
  { sl: 23, date: '2026-09-01', co: null, vehicle: 'KL 85 B 6116', model: '12 Wheel', cash: 8000 },
  { sl: 24, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 T 0299', model: 'Torus 10', cash: null },
  { sl: 25, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 36 E 6775', model: 'Torus 10', cash: null },
  { sl: 26, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 6504', model: 'Mastha', cash: null },
  { sl: 27, date: '2026-09-01', co: null, vehicle: 'KL 40 P 6282', model: '12 Wheel', cash: 8000 },
  { sl: 28, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 88 H 0398', model: '12 Wheel', cash: null },
  { sl: 29, date: '2026-09-01', co: 'T A Trading', vehicle: 'KL 40 T 6667', model: '12 Wheel', cash: null },
  { sl: 30, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 L 6929', model: 'Torus 10', cash: null },
  { sl: 31, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 32, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 41 M 545', model: 'Torus 10', cash: null },
  { sl: 33, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 R 4858', model: 'Torus 10', cash: null },
  { sl: 34, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 P 5078', model: 'Torus 10', cash: null },
  { sl: 35, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 Q 7204', model: 'Torus 10', cash: null },
  { sl: 36, date: '2026-09-01', co: 'Shashi Thilak', vehicle: 'KL 39 R 2196', model: 'Mastha', cash: null },
  { sl: 37, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 41 H 5624', model: 'Torus 10', cash: null },
  { sl: 38, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 47 D 2093', model: 'Torus 10', cash: null },
  { sl: 39, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 63 H 0398', model: '12 Wheel', cash: null },
  { sl: 40, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 Q 3299', model: 'Torus 10', cash: null },
  { sl: 41, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 T 0299', model: 'Torus 10', cash: null },
  { sl: 42, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 43, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 40 Q 552', model: 'Torus 10', cash: null },
  { sl: 44, date: '2026-09-01', co: 'T A Trading', vehicle: 'KL 39 G 2122', model: 'Torus 10', cash: null },
  { sl: 45, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 17 P 4250', model: 'Torus 10', cash: null },
  { sl: 46, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 47, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 48, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 CZ 0918', model: 'Mastha', cash: null },
  { sl: 49, date: '2026-09-01', co: 'Mubeen', vehicle: 'KL 40 W 5797', model: 'Mastha', cash: null },
  { sl: 50, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 07 CQ 0518', model: 'Torus 10', cash: null },
  { sl: 51, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 P 4989', model: 'Torus 10', cash: null },
  { sl: 52, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 P 5209', model: 'Torus 10', cash: null },
  { sl: 53, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 L 3801', model: 'Torus 10', cash: null },
  { sl: 54, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 63 C 2809', model: 'Torus 10', cash: null },
  { sl: 55, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 67 A 0031', model: 'Torus 10', cash: null },
  { sl: 56, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 M 0637', model: 'Torus 10', cash: null },
  { sl: 57, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 36 E 6775', model: 'Torus 10', cash: null },
  { sl: 58, date: '2026-09-01', co: 'Shashi Thilak', vehicle: 'KL 08 BC 7436', model: 'Mastha', cash: null },
  { sl: 59, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 8919', model: 'Torus 10', cash: null },
  { sl: 60, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 36 F 3245', model: 'Torus 10', cash: null },
  { sl: 61, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 47 F 2284', model: 'Torus 10', cash: null },
  { sl: 62, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 44 G 1830', model: 'Torus 10', cash: null },
  { sl: 63, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 L 6929', model: 'Torus 10', cash: null },
  { sl: 64, date: '2026-09-01', co: null, vehicle: 'KL 43 R 2049', model: 'Mastha', cash: 1600 },
  { sl: 65, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 66, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 V 5553', model: 'Mastha', cash: null },
  { sl: 67, date: '2026-09-01', co: null, vehicle: 'KL 85 B 6116', model: '12 Wheel', cash: 8000 },
  { sl: 68, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 69, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 70, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 41 M 545', model: 'Torus 10', cash: null },
  { sl: 71, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 72, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 07 DH 5867', model: '12 Wheel', cash: null },
  { sl: 73, date: '2026-09-01', co: 'Bava', vehicle: 'KL 40 Q 2504', model: 'Torus 10', cash: null },
  { sl: 74, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 07 CZ 0476', model: '12 Wheel', cash: null },
  { sl: 75, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 47 F 2284', model: 'Torus 10', cash: null },
  { sl: 76, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 07 CA 1581', model: 'Torus 10', cash: null },
  { sl: 77, date: '2026-09-01', co: null, vehicle: 'KL 41 R 7350', model: 'Mastha', cash: 1600 },
  { sl: 78, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 45 U 5338', model: '12 Wheel', cash: null },
  { sl: 79, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 08 CB 9067', model: 'Torus 10', cash: null },
  { sl: 80, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 23 Q 8221', model: '12 Wheel', cash: null },
  { sl: 81, date: '2026-09-01', co: null, vehicle: 'KL 40 W 7546', model: '12 Wheel', cash: 8000 },
  { sl: 82, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 83, date: '2026-09-01', co: 'T A Trading', vehicle: 'KL 40 T 6667', model: '12 Wheel', cash: null },
  { sl: 84, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 85, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 V 5553', model: 'Mastha', cash: null },
  { sl: 86, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 CZ 0718', model: 'Mastha', cash: null },
  { sl: 87, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 08 BQ 0686', model: 'Torus 10', cash: null },
  { sl: 88, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 41 M 545', model: 'Torus 10', cash: null },
  { sl: 89, date: '2026-09-01', co: 'Swadhesh Railway', vehicle: 'KL 07 DF 9521', model: 'Torus 10', cash: null },
  { sl: 90, date: '2026-09-01', co: 'Swadhesh Railway', vehicle: 'KL 40 R 5752', model: 'Torus 10', cash: null },
  { sl: 91, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 M 0637', model: 'Torus 10', cash: null },
  { sl: 92, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 07 CQ 0518', model: 'Torus 10', cash: null },
  { sl: 93, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 94, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 95, date: '2026-09-01', co: 'Swadhesh Railway', vehicle: 'KL 07 DF 9556', model: 'Torus 10', cash: null },
  { sl: 96, date: '2026-09-01', co: 'Jabbar Pattimattom', vehicle: 'KL 40 P 5209', model: 'Torus 10', cash: null },
  { sl: 97, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 41 J 3528', model: 'Torus 10', cash: null },
  { sl: 98, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 63 C 2809', model: 'Torus 10', cash: null },
  { sl: 99, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 47 D 2093', model: 'Torus 10', cash: null },
  { sl: 100, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 47 F 2284', model: 'Torus 10', cash: null },
  { sl: 101, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 36 F 3245', model: 'Torus 10', cash: null },
  { sl: 102, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 P 4989', model: 'Torus 10', cash: null },
  { sl: 103, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 67 A 0031', model: 'Torus 10', cash: null },
  { sl: 104, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 30 E 6775', model: 'Torus 10', cash: null },
  { sl: 105, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 8919', model: 'Torus 10', cash: null },
  { sl: 106, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 L 3801', model: 'Torus 10', cash: null },
  { sl: 107, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 63 H 0398', model: '12 Wheel', cash: null },
  { sl: 108, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 109, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 07 CZ 0476', model: '12 Wheel', cash: null },
  { sl: 110, date: '2026-09-01', co: null, vehicle: 'KL 32 U 5577', model: '12 Wheel', cash: 8000 },
  { sl: 111, date: '2026-09-01', co: 'Amari', vehicle: 'KL 40 L 9787', model: 'Torus 10', cash: null },
  { sl: 112, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 V 5553', model: 'Mastha', cash: null },
  { sl: 113, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 114, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 CZ 0718', model: 'Mastha', cash: null },
  { sl: 115, date: '2026-09-01', co: 'Saleem Chengara', vehicle: 'KL 07 DH 5867', model: '12 Wheel', cash: null },
  { sl: 116, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 44 G 1830', model: 'Torus 10', cash: null },
  { sl: 117, date: '2026-09-01', co: 'Bosco', vehicle: 'KL 40 W 6504', model: 'Mastha', cash: null },
  { sl: 118, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 6622', model: 'Torus 10', cash: null },
  { sl: 119, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 R 4858', model: 'Torus 10', cash: null },
  { sl: 120, date: '2026-09-01', co: 'Aby Kuzhiyanjal', vehicle: 'KL 40 P 5078', model: 'Torus 10', cash: null },
  { sl: 121, date: '2026-09-01', co: 'T A Trading', vehicle: 'KL 39 G 2122', model: 'Torus 10', cash: null },
  { sl: 122, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 123, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 124, date: '2026-09-01', co: 'Swadhesh Railway', vehicle: 'KL 07 DF 9521', model: 'Torus 10', cash: null },
  { sl: 125, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 08 CD 5453', model: 'Torus 10', cash: null },
  { sl: 126, date: '2026-09-01', co: 'Jaffer Basheer', vehicle: 'KL 08 CA 2142', model: 'Torus 10', cash: null },
  { sl: 127, date: '2026-09-01', co: 'Amari', vehicle: 'KL 40 L 9787', model: 'Torus 10', cash: null },
  { sl: 128, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 CZ 0718', model: 'Mastha', cash: null },
  { sl: 129, date: '2026-09-01', co: 'Swadhesh Railway', vehicle: 'KL 40 R 5752', model: 'Torus 10', cash: null },
  { sl: 130, date: '2026-09-01', co: 'Baby Kodanad', vehicle: 'KL 41 M 545', model: 'Torus 10', cash: null },
  { sl: 131, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 132, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 133, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 V 5553', model: 'Mastha', cash: null },
  { sl: 134, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 6622', model: 'Torus 10', cash: null },
  { sl: 135, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6033', model: 'Mastha', cash: null },
  { sl: 136, date: '2026-09-01', co: 'Franklin', vehicle: 'KL 07 DC 6044', model: 'Mastha', cash: null },
  { sl: 137, date: '2026-09-01', co: null, vehicle: 'KL 40 W 7546', model: '12 Wheel', cash: 8000 },
  { sl: 138, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 01 BW 3976', model: 'Torus 10', cash: null },
  { sl: 139, date: '2026-09-01', co: 'Amari', vehicle: 'KL 40 L 9787', model: 'Torus 10', cash: null },
  { sl: 140, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 N 6622', model: 'Torus 10', cash: null },
  { sl: 141, date: '2026-09-01', co: 'Ummar Valloorans', vehicle: 'KL 40 Q 7204', model: 'Torus 10', cash: null },
  { sl: 142, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 W 7565', model: 'Mastha', cash: null },
  { sl: 143, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 U 8901', model: 'Mastha', cash: null },
  { sl: 144, date: '2026-09-01', co: 'Dixon (Bosco)', vehicle: 'KL 40 V 5553', model: 'Mastha', cash: null },
];

// Mapping raw model names to standard vehicle type names
function mapModelToVehicleType(rawModel) {
  if (!rawModel) return '10 Wheeler Taurus / Tipper';
  const m = rawModel.toLowerCase();
  if (m.includes('mastha') || m.includes('masta') || m.includes('6')) {
    return '6 Wheeler Tipper';
  }
  if (m.includes('12') || m.includes('lorry')) {
    return '12 Wheeler Lorry';
  }
  return '10 Wheeler Taurus / Tipper';
}

function normalizeVehicleNumber(raw) {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

async function seedProductionSpace() {
  console.log('🚀 Starting Prod Test Space Seeding...');

  // 1. Ensure Global Vehicle & Material Types
  const vehicleTypes = {
    '6 Wheeler Tipper': await prisma.vehicleType.upsert({
      where: { name: '6 Wheeler Tipper' },
      update: {},
      create: { name: '6 Wheeler Tipper' },
    }),
    '10 Wheeler Taurus / Tipper': await prisma.vehicleType.upsert({
      where: { name: '10 Wheeler Taurus / Tipper' },
      update: {},
      create: { name: '10 Wheeler Taurus / Tipper' },
    }),
    '12 Wheeler Lorry': await prisma.vehicleType.upsert({
      where: { name: '12 Wheeler Lorry' },
      update: {},
      create: { name: '12 Wheeler Lorry' },
    }),
    'Tractor Trailer': await prisma.vehicleType.upsert({
      where: { name: 'Tractor Trailer' },
      update: {},
      create: { name: 'Tractor Trailer' },
    }),
    'Mini Truck / Pickup (4 Wheeler)': await prisma.vehicleType.upsert({
      where: { name: 'Mini Truck / Pickup (4 Wheeler)' },
      update: {},
      create: { name: 'Mini Truck / Pickup (4 Wheeler)' },
    }),
  };

  const defaultMaterial = await prisma.materialType.upsert({
    where: { name: 'M-Sand (Manufactured Sand)' },
    update: {},
    create: { name: 'M-Sand (Manufactured Sand)' },
  });

  await prisma.materialType.upsert({
    where: { name: '20mm Metal / Aggregate' },
    update: {},
    create: { name: '20mm Metal / Aggregate' },
  });

  await prisma.materialType.upsert({
    where: { name: 'GSB (Granular Sub-Base)' },
    update: {},
    create: { name: 'GSB (Granular Sub-Base)' },
  });

  // 2. Find or Create "Prod Test Space" Customer Account
  let tenant = await prisma.user.findFirst({
    where: {
      OR: [
        { mobile: '9999999999' },
        { businessName: { contains: 'Prod Test', mode: 'insensitive' } },
        { businessName: { contains: 'Test Space', mode: 'insensitive' } },
      ],
      role: 'CUSTOMER',
    },
  });

  if (!tenant) {
    console.log('  Creating new Prod Test Space customer...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('test@prod', salt);
    tenant = await prisma.user.create({
      data: {
        businessName: 'Prod Test Space',
        contactPerson: 'Ajmal K A',
        mobile: '9999999999',
        passwordHash,
        role: 'CUSTOMER',
        isActive: true,
      },
    });
  } else {
    console.log(`  Found existing Customer Space: ${tenant.businessName} (${tenant.mobile})`);
  }

  // 3. Create Site 1: Chengara
  const chengaraSite = await prisma.site.upsert({
    where: { id: (await prisma.site.findFirst({ where: { userId: tenant.id, siteName: 'Chengara' } }))?.id || '00000000-0000-0000-0000-000000000000' },
    update: { siteName: 'Chengara', location: 'Chengara, Pattimattom', pincode: '683547' },
    create: {
      userId: tenant.id,
      siteName: 'Chengara',
      location: 'Chengara, Pattimattom',
      pincode: '683547',
    },
  });
  console.log(`  ✓ Site 1: ${chengaraSite.siteName}`);

  // 4. Create Site 2: Kodanad
  const kodanadSite = await prisma.site.upsert({
    where: { id: (await prisma.site.findFirst({ where: { userId: tenant.id, siteName: 'Kodanad Quarry' } }))?.id || '00000000-0000-0000-0000-000000000000' },
    update: { siteName: 'Kodanad Quarry', location: 'Kodanad, Perumbavoor', pincode: '683544' },
    create: {
      userId: tenant.id,
      siteName: 'Kodanad Quarry',
      location: 'Kodanad, Perumbavoor',
      pincode: '683544',
    },
  });
  console.log(`  ✓ Site 2: ${kodanadSite.siteName}`);

  // 5. Rate Matrix Configuration
  const standardRates = [
    { vt: '6 Wheeler Tipper', rate: 1600 },
    { vt: '10 Wheeler Taurus / Tipper', rate: 5500 },
    { vt: '12 Wheeler Lorry', rate: 8000 },
  ];

  for (const s of [chengaraSite, kodanadSite]) {
    for (const r of standardRates) {
      const vtId = vehicleTypes[r.vt].id;
      const existingRate = await prisma.rate.findFirst({
        where: { userId: tenant.id, siteId: s.id, vehicleTypeId: vtId, materialTypeId: defaultMaterial.id },
      });
      if (existingRate) {
        await prisma.rate.update({ where: { id: existingRate.id }, data: { rate: r.rate } });
      } else {
        await prisma.rate.create({
          data: {
            userId: tenant.id,
            siteId: s.id,
            vehicleTypeId: vtId,
            materialTypeId: defaultMaterial.id,
            rate: r.rate,
          },
        });
      }
    }
  }

  // 6. Register Contractors
  const contractorMap = {};
  const uniqueContractorNames = new Set(CHENGARA_RAW_DATA.map(d => d.co).filter(Boolean));
  
  for (const name of uniqueContractorNames) {
    let contractor = await prisma.contractor.findFirst({
      where: { userId: tenant.id, name: name },
    });
    if (!contractor) {
      contractor = await prisma.contractor.create({
        data: {
          userId: tenant.id,
          name: name,
          mobile: '9847' + Math.floor(100000 + Math.random() * 900000),
        },
      });
    }
    contractorMap[name] = contractor;
  }
  console.log(`  ✓ Registered ${Object.keys(contractorMap).length} Contractors`);

  // 7. Register Vehicles
  const vehicleMap = {};
  for (const row of CHENGARA_RAW_DATA) {
    const vNum = normalizeVehicleNumber(row.vehicle);
    if (!vehicleMap[vNum]) {
      const vtName = mapModelToVehicleType(row.model);
      const vtId = vehicleTypes[vtName].id;

      let vehicle = await prisma.vehicle.findFirst({
        where: { userId: tenant.id, vehicleNumber: vNum },
      });

      if (!vehicle) {
        vehicle = await prisma.vehicle.create({
          data: {
            userId: tenant.id,
            vehicleNumber: vNum,
            vehicleTypeId: vtId,
          },
        });
      }
      vehicleMap[vNum] = vehicle;
    }
  }
  console.log(`  ✓ Registered ${Object.keys(vehicleMap).length} Vehicles`);

  // 8. Insert Chengara Loads (144 Loads)
  console.log('  Inserting Chengara 144 Loads...');
  let chengaraCount = 0;
  for (const row of CHENGARA_RAW_DATA) {
    const vNum = normalizeVehicleNumber(row.vehicle);
    const vehicle = vehicleMap[vNum];
    const contractor = row.co ? contractorMap[row.co] : null;
    const isCash = !contractor || row.cash !== null;
    
    let amount = row.cash;
    if (!amount) {
      const vtName = mapModelToVehicleType(row.model);
      amount = standardRates.find(r => r.vt === vtName)?.rate || 5500;
    }

    const loadDate = new Date(`${row.date}T04:${String(chengaraCount % 60).padStart(2, '0')}:00Z`);

    await prisma.load.create({
      data: {
        userId: tenant.id,
        siteId: chengaraSite.id,
        vehicleId: vehicle.id,
        contractorId: contractor ? contractor.id : null,
        materialTypeId: defaultMaterial.id,
        paymentType: isCash ? 'CASH' : 'CREDIT',
        pricePerUnit: amount,
        totalAmount: amount,
        isCustomPrice: row.cash !== null,
        status: 'ACTIVE',
        createdAt: loadDate,
        updatedAt: loadDate,
      },
    });
    chengaraCount++;
  }
  console.log(`  ✅ Successfully inserted ${chengaraCount} loads for Site Chengara`);

  // 9. Insert 25 Realistic Sample Loads for Site 2: Kodanad
  console.log('  Inserting Kodanad 25 Sample Loads...');
  const kodanadVehicles = Object.values(vehicleMap).slice(0, 10);
  const kodanadContractors = Object.values(contractorMap).slice(0, 6);
  let kodanadCount = 0;

  for (let i = 1; i <= 25; i++) {
    const vehicle = kodanadVehicles[i % kodanadVehicles.length];
    const contractor = i % 5 === 0 ? null : kodanadContractors[i % kodanadContractors.length];
    const isCash = !contractor;
    const amount = i % 3 === 0 ? 8000 : (i % 2 === 0 ? 5500 : 1600);

    const loadDate = new Date(`2026-09-01T06:${String((i * 2) % 60).padStart(2, '0')}:00Z`);

    await prisma.load.create({
      data: {
        userId: tenant.id,
        siteId: kodanadSite.id,
        vehicleId: vehicle.id,
        contractorId: contractor ? contractor.id : null,
        materialTypeId: defaultMaterial.id,
        paymentType: isCash ? 'CASH' : 'CREDIT',
        pricePerUnit: amount,
        totalAmount: amount,
        isCustomPrice: false,
        status: 'ACTIVE',
        createdAt: loadDate,
        updatedAt: loadDate,
      },
    });
    kodanadCount++;
  }
  console.log(`  ✅ Successfully inserted ${kodanadCount} sample loads for Site Kodanad Quarry`);

  console.log('🎉 Production Space Seeding Fully Complete!');
}

seedProductionSpace()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
