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

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: { isRolledUp: !sub.isRolledUp },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "rolled_up", metadata: { enabled: updated.isRolledUp } },
  });

  return NextResponse.json({ isRolledUp: updated.isRolledUp });
}
