import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const account = await prisma.account.findUniqueOrThrow({ where: { id: params.id } });
  if (account.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.account.update({
    where: { id: params.id },
    data: { active: false, accessToken: null, refreshToken: null },
  });

  return NextResponse.json({ success: true });
}
