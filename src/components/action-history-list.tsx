"use client";

import { useEffect, useState } from "react";

interface Action {
  id: string;
  action: string;
  createdAt: string;
  subscription: { senderName: string; senderEmail: string };
}

export default function ActionHistoryList() {
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    fetch("/api/actions").then((r) => r.json()).then((d) => setActions(d.actions || []));
  }, []);

  const undo = async (id: string) => {
    await fetch(`/api/actions/${id}/undo`, { method: "POST" });
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="border rounded-lg bg-white">
      {actions.length === 0 && <p className="p-8 text-center text-gray-400">No actions yet.</p>}
      {actions.map((action) => (
        <div key={action.id} className="flex items-center justify-between p-3 border-b">
          <div>
            <span className="font-medium capitalize">{action.action}</span>
            <span className="text-gray-500 mx-1">—</span>
            <span>{action.subscription.senderName}</span>
            <span className="text-xs text-gray-400 ml-2">{new Date(action.createdAt).toLocaleDateString()}</span>
          </div>
          <button onClick={() => undo(action.id)} className="text-xs text-blue-600 hover:underline">
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}
