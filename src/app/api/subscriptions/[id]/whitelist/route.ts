import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: params.id },
    include: { account: true },
  });
  if (sub.account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.subscription.update({
    where: { id: params.id },
    data: { isWhitelisted: true, isBlocked: false },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "whitelisted" },
  });

  return NextResponse.json({ success: true });
}
