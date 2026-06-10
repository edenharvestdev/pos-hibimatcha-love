// Script: create staff member with ID TEST-01 and password admin2026
// Role: "staff" → POS only (ตาม STAFF_ALLOWED_PATHS ใน App.jsx)
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://hibi_admin:HibiDev-2024@127.0.0.1:3307/hibimatcha_db";

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const employeeCode = "TEST-01";
  const password = "admin2026";
  const passwordHash = bcrypt.hashSync(password, 10);

  // Check if already exists
  const [existing] = await conn.execute(
    "SELECT id FROM staff WHERE employeeCode = ?",
    [employeeCode]
  );

  if (existing.length > 0) {
    console.log(`[INFO] Staff ${employeeCode} already exists — updating password hash`);
    await conn.execute(
      "UPDATE staff SET passwordHash = ?, role = 'staff', status = 'active', firstName = 'Test', lastName = 'Staff' WHERE employeeCode = ?",
      [passwordHash, employeeCode]
    );
    console.log(`[OK] Updated: ${employeeCode} / ${password}`);
  } else {
    // Get first branch to assign
    const [branches] = await conn.execute("SELECT id FROM branches LIMIT 1");
    const branchId = branches.length > 0 ? branches[0].id : null;

    await conn.execute(
      `INSERT INTO staff (employeeCode, firstName, lastName, role, status, passwordHash, primaryBranchId)
       VALUES (?, 'Test', 'Staff', 'staff', 'active', ?, ?)`,
      [employeeCode, passwordHash, branchId]
    );

    // Get the newly created staff id
    const [newStaff] = await conn.execute(
      "SELECT id FROM staff WHERE employeeCode = ?",
      [employeeCode]
    );
    const staffId = newStaff[0].id;

    // Assign to branch
    if (branchId) {
      await conn.execute(
        `INSERT IGNORE INTO staff_branches (staffId, branchId, isPrimary) VALUES (?, ?, true)`,
        [staffId, branchId]
      );
    }

    console.log(`[OK] Created: ${employeeCode} / ${password}`);
    console.log(`     Role: staff (POS only)`);
    console.log(`     Branch: ${branchId}`);
  }

  await conn.end();
  console.log("\n✅ สามารถล็อกอินด้วย:");
  console.log(`   Employee Code : ${employeeCode}`);
  console.log(`   Password      : ${password}`);
  console.log(`   สิทธิ์         : POS เท่านั้น (จะถูก redirect ไป /pos/terminal อัตโนมัติ)`);
}

main().catch((err) => {
  console.error("[ERROR]", err.message);
  process.exit(1);
});
