"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalSubscriptions: number;
  blocked: number;
  actionsTaken: number;
  digestsSent: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard label="Subscriptions" value={stats.totalSubscriptions} />
      <StatCard label="Blocked" value={stats.blocked} />
      <StatCard label="Actions" value={stats.actionsTaken} />
      <StatCard label="Digests" value={stats.digestsSent} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
