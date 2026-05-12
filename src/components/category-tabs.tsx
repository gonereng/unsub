"use client";

const CATEGORIES = ["all", "news", "shopping", "finance", "social", "other"];

export default function CategoryTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap ${
            active === cat
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
