import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const earnings = await prisma.earningRecord.findMany();
  console.log("EARNINGS:", JSON.stringify(earnings, null, 2));

  const orders = await prisma.order.findMany();
  console.log("ORDERS:", JSON.stringify(orders, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
