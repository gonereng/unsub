import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StatsCards from "@/components/stats-cards";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      <StatsCards />
    </div>
  );
}
