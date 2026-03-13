import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Database Cleanup: EarningRecord ---");

  try {
    // 1. Identify orphan IDs first for logging
    const orphans = await prisma.$queryRaw<any[]>`
      SELECT id, enrollment_id 
      FROM EarningRecord 
      WHERE enrollment_id NOT IN (SELECT id FROM Enrollment)
    `;

    if (orphans.length === 0) {
      console.log("✅ No orphan records found to delete.");
    } else {
      console.log(`Found ${orphans.length} orphan record(s). Deleting now...`);

      // 2. Perform the deletion using raw SQL to ensure accuracy
      const deleted = await prisma.$executeRaw`
        DELETE FROM EarningRecord 
        WHERE enrollment_id NOT IN (SELECT id FROM enrollment)
      `;

      console.log(`Successfully deleted ${deleted} orphan record(s).`);
    }

    // 3. Final Check
    const remainingCount = await prisma.earningRecord.count();
    console.log(`Final EarningRecord count: ${remainingCount}`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
