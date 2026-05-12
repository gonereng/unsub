"use client";

export default function BulkActionBar({
  count,
  onAction,
  onCancel,
}: {
  count: number;
  onAction: (action: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-center gap-4 shadow-lg">
      <span className="text-sm text-gray-600">{count} selected</span>
      <button onClick={() => onAction("unsubscribe")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
        Unsubscribe All
      </button>
      <button onClick={() => onAction("block")} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
        Block All
      </button>
      <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
        Cancel
      </button>
    </div>
  );
}
