"use client";

export default function FinancialWarningModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-bold mb-2">Heads up!</h3>
        <p className="text-sm text-gray-600 mb-4">
          This looks like a transactional email (receipt, flight, banking, etc.).
          Unsubscribing may cause you to miss important updates.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
