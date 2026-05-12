"use client";

interface PreviewPanelProps {
  sub: { senderName: string; senderEmail: string; lastEmailAt: string | null };
  onClose: () => void;
}

export default function PreviewPanel({ sub, onClose }: PreviewPanelProps) {
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-xl p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">{sub.senderName}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <p className="text-sm text-gray-500 mb-2">{sub.senderEmail}</p>
      {sub.lastEmailAt && (
        <p className="text-sm text-gray-400">Last email: {new Date(sub.lastEmailAt).toLocaleDateString()}</p>
      )}
    </div>
  );
}
