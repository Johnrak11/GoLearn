import { PrismaClient } from "@prisma/client";
import { getMyEarningsService } from "./services/withdrawalService";

const prisma = new PrismaClient();

async function debug() {
  console.log("--- DEBUGGING 500 ERROR ---");

  // 1. Find the user (Vorak Yun)
  const user = await prisma.user.findFirst({
    where: { full_name: { contains: "Vorak Yun" } },
  });

  if (!user) {
    console.log("User not found");
    return;
  }

  console.log(`Testing earnings for user: ${user.full_name} (${user.id})`);

  try {
    const result = await getMyEarningsService(user.id);
    console.log("Service returned successfully:");
    console.log(JSON.stringify(result.summary, null, 2));
    console.log(`Records found: ${result.records.length}`);
  } catch (err: any) {
    console.error("\n❌ ERROR CAUGHT IN SERVICE CALL:");
    console.error(err);
    if (err.code) console.error(`Error Code: ${err.code}`);
    if (err.meta) console.error(`Error Meta: ${JSON.stringify(err.meta)}`);
  }
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
