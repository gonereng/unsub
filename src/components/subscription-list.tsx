"use client";

import { useState, useEffect, useCallback } from "react";
import CategoryTabs from "./category-tabs";
import SubscriptionRow from "./subscription-row";
import BulkActionBar from "./bulk-action-bar";
import PreviewPanel from "./preview-panel";
import FinancialWarningModal from "./financial-warning-modal";

interface Subscription {
  id: string;
  senderName: string;
  senderEmail: string;
  frequency: string | null;
  lastEmailAt: string | null;
  category: string | null;
  isBlocked: boolean;
  isWhitelisted: boolean;
  isRolledUp: boolean;
}

export default function SubscriptionList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Subscription | null>(null);
  const [showWarning, setShowWarning] = useState<{ id: string; action: string } | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    const params = new URLSearchParams({ category, sort: "lastEmailAt", order: "desc" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/subscriptions?${params}`);
    const data = await res.json();
    setSubscriptions(data.subscriptions || []);
  }, [category, search]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAction = async (id: string, action: string) => {
    if (action === "block" || action === "unsubscribe") {
      const sub = subscriptions.find((s) => s.id === id);
      if (sub) {
        const res = await fetch(`/api/protect?name=${encodeURIComponent(sub.senderName)}&email=${encodeURIComponent(sub.senderEmail)}`);
        const { protected: isProtected } = await res.json();
        if (isProtected) {
          setShowWarning({ id, action });
          return;
        }
      }
    }
    await performAction(id, action);
  };

  const performAction = async (id: string, action: string) => {
    await fetch(`/api/subscriptions/${id}/${action}`, { method: "POST" });
    fetchSubscriptions();
  };

  const handleBulk = async (action: string) => {
    if (action === "unsubscribe") {
      await fetch("/api/subscriptions/bulk-unsubscribe", {
        method: "POST",
        body: JSON.stringify({ subscriptionIds: Array.from(selected) }),
      });
    } else {
      for (const id of Array.from(selected)) {
        await performAction(id, action);
      }
    }
    setSelected(new Set());
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search subscriptions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 border rounded-lg mb-4"
      />
      <CategoryTabs active={category} onSelect={setCategory} />
      <div className="border rounded-lg bg-white">
        {subscriptions.map((sub) => (
          <div key={sub.id} onClick={() => setPreview(sub)} className="cursor-pointer">
            <SubscriptionRow
              {...sub}
              selected={selected.has(sub.id)}
              onToggle={toggleSelect}
              onAction={handleAction}
            />
          </div>
        ))}
        {subscriptions.length === 0 && (
          <p className="p-8 text-center text-gray-400">No subscriptions found. Connect an email account to get started.</p>
        )}
      </div>
      {selected.size > 0 && (
        <BulkActionBar count={selected.size} onAction={handleBulk} onCancel={() => setSelected(new Set())} />
      )}
      {preview && <PreviewPanel sub={preview} onClose={() => setPreview(null)} />}
      {showWarning && (
        <FinancialWarningModal
          onConfirm={() => { performAction(showWarning.id, showWarning.action); setShowWarning(null); }}
          onCancel={() => setShowWarning(null)}
        />
      )}
    </div>
  );
}
