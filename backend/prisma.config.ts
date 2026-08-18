import * as path from 'path';
import * as dotenv from 'dotenv';
import { defineConfig } from '@prisma/config';

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://vlms:vlms_dev_password@localhost:5432/vlms?schema=public',
  },
});
