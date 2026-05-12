import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ActionHistoryList from "@/components/action-history-list";

export default async function UndoPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Action History</h1>
      <ActionHistoryList />
    </div>
  );
}
