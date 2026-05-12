"use client";

import { useState } from "react";

export default function KillSwitchButton({ accountId }: { accountId: string }) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!confirm("Revoke access? This will delete all data for this account.")) return;
    setRevoking(true);
    await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
    window.location.reload();
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={revoking}
      className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {revoking ? "Revoking..." : "Revoke Access"}
    </button>
  );
}
