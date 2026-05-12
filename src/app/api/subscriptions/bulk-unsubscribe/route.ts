import { auth } from "@/lib/auth";
import { getBulkUnsubscribeQueue } from "@/lib/queue";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscriptionIds } = await req.json();
  await getBulkUnsubscribeQueue().add("bulk", { subscriptionIds });
  return NextResponse.json({ queued: true, count: subscriptionIds.length });
}
