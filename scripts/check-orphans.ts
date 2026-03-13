import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Advanced Database Integrity Check ---");

  try {
    // 1. Get Table Names from Information Schema
    const tables: any[] = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    console.log(
      "Detected Tables:",
      tables.map((t) => t.TABLE_NAME),
    );

    // 2. Exact Count Comparison
    const earningCount = await prisma.earningRecord.count();
    const enrollmentCount = await prisma.enrollment.count();
    console.log(
      `Counts -> EarningRecords: ${earningCount}, Enrollments: ${enrollmentCount}`,
    );

    // 3. Find missing IDs with exact case check (using binary comparison)
    // We try both PascalCase and lowercase table names just in case
    const orphans = await prisma.$queryRaw<any[]>`
      SELECT ER.id, ER.enrollment_id 
      FROM EarningRecord ER
      WHERE NOT EXISTS (
        SELECT 1 FROM Enrollment E WHERE BINARY E.id = BINARY ER.enrollment_id
      )
    `;

    if (orphans.length > 0) {
      console.log("❌ Found ORPHAN EarningRecord(s) using BINARY check:");
      console.table(orphans);
    } else {
      console.log("✅ No orphan records found using BINARY check.");
    }

    // 4. Check for length mismatches (e.g. trailing spaces)
    const lengthMismatches = await prisma.$queryRaw<any[]>`
      SELECT id, enrollment_id, LENGTH(enrollment_id) as len 
      FROM EarningRecord 
      WHERE LENGTH(enrollment_id) != 36
    `;

    if (lengthMismatches.length > 0) {
      console.log(
        "❌ Found enrollment_id entries with unexpected length (not 36):",
      );
      console.table(lengthMismatches);
    } else {
      console.log("✅ All enrollment_id entries have correct length.");
    }
  } catch (error) {
    console.error("Failed to run advanced check:", error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
