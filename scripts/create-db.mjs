import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);
await db.execute(sql`CREATE DATABASE IF NOT EXISTS hibi_matcha`);
console.log('✓ Database hibi_matcha created/exists');
process.exit(0);
