"use client";

import { useEffect, useState } from "react";

export default function ScanProgress({ accountId }: { accountId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/stats`);
      if (res.ok) setStatus("connected");
    }, 2000);
    return () => clearInterval(interval);
  }, [accountId]);

  return status ? (
    <div className="text-sm text-gray-500">Account connected</div>
  ) : null;
}
