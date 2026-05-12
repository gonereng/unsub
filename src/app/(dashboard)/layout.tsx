import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-lg">Unsub</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          <Link href="/dashboard/stats" className="hover:underline">Stats</Link>
          <Link href="/dashboard/undo" className="hover:underline">Undo</Link>
          <a href="/api/auth/signout" className="text-red-600 hover:underline">Sign out</a>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto p-4">{children}</main>
    </div>
  );
}
