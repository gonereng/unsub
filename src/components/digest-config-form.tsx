"use client";

import { useEffect, useState } from "react";

interface Config {
  frequency: string;
  time: string;
  isEnabled: boolean;
}

export default function DigestConfigForm() {
  const [config, setConfig] = useState<Config>({ frequency: "daily", time: "08:00", isEnabled: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/digest-config").then((r) => r.json()).then(setConfig);
  }, []);

  const save = async () => {
    await fetch("/api/digest-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <h3 className="font-bold">Digest Settings</h3>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={config.isEnabled} onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })} />
        <span className="text-sm">Enable daily/weekly digest</span>
      </label>
      {config.isEnabled && (
        <>
          <select
            value={config.frequency}
            onChange={(e) => setConfig({ ...config, frequency: e.target.value })}
            className="border rounded p-1 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="time"
            value={config.time}
            onChange={(e) => setConfig({ ...config, time: e.target.value })}
            className="border rounded p-1 text-sm"
          />
        </>
      )}
      <button onClick={save} className="block text-sm px-3 py-1.5 bg-black text-white rounded hover:bg-gray-800">
        {saved ? "Saved!" : "Save"}
      </button>
    </div>
  );
}
