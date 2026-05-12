import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scanInboxQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findUniqueOrThrow({ where: { id: params.id } });
  if (account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await scanInboxQueue.add("scan", { accountId: params.id, fullScan: true });
  return NextResponse.json({ queued: true });
}
