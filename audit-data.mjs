import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  console.log('=== CATEGORIES (pos_categories) ===');
  const [cats] = await conn.query('SELECT id, branchId, name, nameThai, sortOrder, isActive FROM pos_categories ORDER BY sortOrder');
  cats.forEach(c => console.log(`${c.id} | ${c.name} | ${c.nameThai||''} | branch:${c.branchId} | sort:${c.sortOrder} | active:${c.isActive}`));

  console.log('\n=== MENU ITEMS (first 30) ===');
  const [menus] = await conn.query('SELECT m.id, m.name, c.name as cat, m.defaultPrice FROM pos_menu_items m LEFT JOIN pos_categories c ON m.categoryId = c.id ORDER BY c.sortOrder, m.id LIMIT 30');
  menus.forEach(m => console.log(`${m.id} | ${m.name} | ${m.cat||'no-cat'} | B${m.defaultPrice}`));

  console.log('\n--- Menu count by category ---');
  const [menuCount] = await conn.query('SELECT c.name as cat, COUNT(*) as cnt FROM pos_menu_items m LEFT JOIN pos_categories c ON m.categoryId = c.id GROUP BY c.name ORDER BY cnt DESC');
  menuCount.forEach(r => console.log(`${r.cat||'uncategorized'}: ${r.cnt}`));

  console.log('\n=== BRANCH DISTRIBUTION (pos_branch_menu_items) ===');
  const [dist] = await conn.query('SELECT b.name as branch, COUNT(*) as cnt FROM pos_branch_menu_items bm JOIN branches b ON bm.branchId = b.id GROUP BY b.name ORDER BY cnt DESC');
  dist.forEach(r => console.log(`${r.branch}: ${r.cnt} items`));

  console.log('\n=== INVENTORY BY CATEGORY ===');
  const [inv] = await conn.query('SELECT ic.name as cat, COUNT(*) as cnt FROM pos_inventory_items i LEFT JOIN pos_inventory_categories ic ON i.categoryId = ic.id GROUP BY ic.name ORDER BY cnt DESC');
  inv.forEach(r => console.log(`${r.cat||'uncategorized'}: ${r.cnt}`));

  console.log('\n=== OPTION GROUPS (first 43) ===');
  const [opts] = await conn.query('SELECT id, name FROM pos_option_groups ORDER BY id');
  opts.forEach(o => console.log(`${o.id} | ${o.name}`));

  await conn.end();
}
main().catch(e => console.error(e));
