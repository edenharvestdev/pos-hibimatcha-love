import fs from 'fs';
import mysql from 'mysql2/promise';
import 'dotenv/config';

async function main() {
  // Read the mapping file
  const mapping = fs.readFileSync('/tmp/photo-mapping.tsv', 'utf8')
    .trim()
    .split('\n')
    .map(line => {
      const parts = line.split('\t').filter(Boolean);
      return { original: parts[0].trim(), s3Path: parts[1].trim() };
    });

  console.log(`Loaded ${mapping.length} photo mappings`);

  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Get all menu items with imageUrl
  const [items] = await conn.query('SELECT id, imageUrl FROM pos_menu_items WHERE imageUrl IS NOT NULL');
  console.log(`Found ${items.length} menu items with images`);

  let updated = 0;
  for (const item of items) {
    // Extract filename from path like "/menu/app_deli_800800_drawing_main-71.png"
    const filename = item.imageUrl.split('/').pop();
    const match = mapping.find(m => m.original === filename);
    if (match) {
      await conn.query('UPDATE pos_menu_items SET imageUrl = ? WHERE id = ?', [match.s3Path, item.id]);
      updated++;
    } else {
      console.log(`No mapping found for: ${filename} (item ${item.id})`);
    }
  }

  console.log(`Updated ${updated} menu items with S3 URLs`);
  await conn.end();
}

main().catch(console.error);
