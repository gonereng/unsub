import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "lastEmailAt";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, active: true },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  const where: any = { accountId: { in: accountIds } };
  if (category && category !== "all") where.category = category;
  if (search) where.senderEmail = { contains: search, mode: "insensitive" };

  const [total, subscriptions] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ subscriptions, total, page, totalPages: Math.ceil(total / limit) });
}
