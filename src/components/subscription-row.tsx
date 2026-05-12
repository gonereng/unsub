"use client";

interface SubscriptionRowProps {
  id: string;
  senderName: string;
  senderEmail: string;
  frequency: string | null;
  lastEmailAt: string | null;
  category: string | null;
  isBlocked: boolean;
  isWhitelisted: boolean;
  isRolledUp: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

export default function SubscriptionRow({
  id, senderName, senderEmail, frequency, lastEmailAt,
  category, isBlocked, isWhitelisted, isRolledUp,
  selected, onToggle, onAction,
}: SubscriptionRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 border-b hover:bg-gray-50">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(id)}
        className="rounded"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{senderName}</span>
          {isBlocked && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Blocked</span>}
          {isWhitelisted && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Safe</span>}
          {isRolledUp && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Digest</span>}
          {category && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{category}</span>}
        </div>
        <div className="text-sm text-gray-500 truncate">{senderEmail}</div>
      </div>
      <div className="text-xs text-gray-400 hidden sm:block">
        {frequency || "—"} | {lastEmailAt ? new Date(lastEmailAt).toLocaleDateString() : "—"}
      </div>
      <div className="flex gap-1">
        {!isBlocked && (
          <button onClick={() => onAction(id, "block")} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">Block</button>
        )}
        {!isWhitelisted && (
          <button onClick={() => onAction(id, "whitelist")} className="text-xs px-2 py-1 rounded bg-green-50 text-green-600 hover:bg-green-100">Keep</button>
        )}
        <button onClick={() => onAction(id, "unsubscribe")} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100">Unsub</button>
        <button onClick={() => onAction(id, "rollup")} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 hover:bg-purple-100">
          {isRolledUp ? "Unroll" : "Digest"}
        </button>
      </div>
    </div>
  );
}
