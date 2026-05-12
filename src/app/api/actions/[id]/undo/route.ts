import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = await prisma.actionLog.findUniqueOrThrow({
    where: { id: params.id },
    include: { subscription: { include: { account: true } } },
  });
  if (action.subscription.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  switch (action.action) {
    case "blocked":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isBlocked: false },
      });
      break;
    case "whitelisted":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isWhitelisted: false },
      });
      break;
    case "rolled_up":
      await prisma.subscription.update({
        where: { id: action.subscriptionId },
        data: { isRolledUp: false },
      });
      break;
  }

  return NextResponse.json({ success: true });
}
