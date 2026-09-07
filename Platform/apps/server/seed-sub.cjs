const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findUnique({ where: { email: "member1@test.com" } });
  const plan = await prisma.plan.findFirst();
  const existing = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: "sub_test_001" } });
  if (!existing) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        razorpaySubscriptionId: "sub_test_001",
        status: "INCOMPLETE",
      },
    });
  }
  console.log("seeded sub ready");
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
