import dotenv from 'dotenv';
dotenv.config();
import { getDb } from '../server/db';

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  try {
    const db = await getDb();
    if (db) {
      console.log('Connected successfully!');
      const res = await db.execute('SELECT 1');
      console.log('Query res:', res);
    } else {
      console.log('Connection returned null');
    }
  } catch(e) {
    console.error('Error connecting:', e);
  }
}

main();
