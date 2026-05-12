import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);
  const subs = await prisma.subscription.findMany({
    where: { accountId: { in: accountIds } },
    select: { id: true },
  });
  const subscriptionIds = subs.map((s) => s.id);

  const [total, actions] = await Promise.all([
    prisma.actionLog.count({ where: { subscriptionId: { in: subscriptionIds } } }),
    prisma.actionLog.findMany({
      where: { subscriptionId: { in: subscriptionIds } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { subscription: { select: { senderName: true, senderEmail: true } } },
    }),
  ]);

  return NextResponse.json({ actions, total, page, totalPages: Math.ceil(total / limit) });
}
