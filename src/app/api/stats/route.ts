import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accountIds = (
    await prisma.account.findMany({ where: { userId: session.user.id }, select: { id: true } })
  ).map((a) => a.id);

  const [totalSubs, blockedCount, actionCount, digestCount] = await Promise.all([
    prisma.subscription.count({ where: { accountId: { in: accountIds } } }),
    prisma.subscription.count({ where: { accountId: { in: accountIds }, isBlocked: true } }),
    prisma.actionLog.count({
      where: { subscription: { accountId: { in: accountIds } } },
    }),
    prisma.digest.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    totalSubscriptions: totalSubs,
    blocked: blockedCount,
    actionsTaken: actionCount,
    digestsSent: digestCount,
  });
}
