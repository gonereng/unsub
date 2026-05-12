import { NextResponse } from "next/server";
import { getScanInboxQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const emailAddress = body.emailAddress;
  if (!emailAddress) return NextResponse.json({ error: "missing emailAddress" }, { status: 400 });

  const account = await prisma.account.findFirst({
    where: { providerAccountId: emailAddress, active: true },
  });
  if (account) {
    await getScanInboxQueue().add("scan", { accountId: account.id, fullScan: false });
  }

  return NextResponse.json({ received: true });
}
