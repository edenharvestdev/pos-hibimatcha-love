import "dotenv/config";
import { getDb } from "../server/db";
import { eq } from "drizzle-orm";
import { branches, posBranchPaymentSettings } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) return;

  const branchList = await db.select().from(branches);
  console.log(`Found ${branchList.length} branches.`);

  for (const b of branchList) {
    const [existing] = await db.select().from(posBranchPaymentSettings)
      .where(eq(posBranchPaymentSettings.branchId, b.id)).limit(1);
    
    if (!existing) {
      console.log(`Creating default payment settings for branch: ${b.name} (id: ${b.id})`);
      await db.insert(posBranchPaymentSettings).values({
        branchId: b.id,
        promptpayId: "0951234567",
        promptpayName: `Hibi Matcha (${b.name})`,
        promptpayType: "phone",
        taxId: "0105560000000",
        companyName: "Hibi Matcha Co., Ltd.",
        companyAddress: b.province ? `123 Matcha Road, ${b.province}, Thailand` : "123 Matcha Road, Bangkok, Thailand",
        autoPrintOrderSlip: true,
        autoPrintKitchenTicket: true,
        autoPrintLabels: true,
      });
    } else {
      console.log(`Branch ${b.name} (id: ${b.id}) already has payment settings.`);
    }
  }
  process.exit(0);
}

main();
