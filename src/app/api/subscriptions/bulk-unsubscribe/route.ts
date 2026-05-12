import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBulkUnsubscribeQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriptionIds } = await req.json();
  if (!Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
    return NextResponse.json({ error: "subscriptionIds must be a non-empty array" }, { status: 400 });
  }

  const owned = await prisma.subscription.findMany({
    where: { id: { in: subscriptionIds }, account: { userId: session.user.id } },
    select: { id: true },
  });
  const ownedIds = owned.map((s) => s.id);

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No matching subscriptions found" }, { status: 404 });
  }

  await getBulkUnsubscribeQueue().add("bulk", { subscriptionIds: ownedIds });
  return NextResponse.json({ queued: true, count: ownedIds.length });
}
