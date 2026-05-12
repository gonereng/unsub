import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { createGmailClient, createFilter } from "@/lib/gmail";
import { createRule } from "@/lib/outlook";

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

  if (sub.account.provider === "google") {
    const gmail = createGmailClient(sub.account.accessToken!);
    await createFilter(gmail, sub.senderEmail);
  } else if (sub.account.provider === "microsoft") {
    await createRule(sub.account.accessToken!, sub.senderEmail);
  }

  await prisma.subscription.update({
    where: { id: params.id },
    data: { isBlocked: true, isWhitelisted: false },
  });
  await prisma.actionLog.create({
    data: { subscriptionId: params.id, action: "blocked" },
  });

  return NextResponse.json({ success: true });
}
