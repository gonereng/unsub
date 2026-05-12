import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import SubscriptionList from "@/components/subscription-list";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, active: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Subscriptions</h1>
        {accounts.length === 0 && (
          <a
            href="/api/auth/signin"
            className="rounded-lg bg-black px-4 py-2 text-white text-sm hover:bg-gray-800"
          >
            Connect Email
          </a>
        )}
      </div>
      <SubscriptionList />
    </div>
  );
}
