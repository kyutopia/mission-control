"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, GripVertical, DollarSign } from "lucide-react";

interface PipelineItem {
  id: string;
  name: string;
  stage: string;
  owner: string;
  expected_revenue: number;
  actual_revenue: number;
  notes: string;
  priority: string;
  created_at: string;
}

const STAGES = [
  { key: "discovery", label: "🔍 Discovery", color: "border-blue-500/50 bg-blue-500/10" },
  { key: "analysis", label: "📊 Analysis", color: "border-yellow-500/50 bg-yellow-500/10" },
  { key: "execution", label: "⚡ Execution", color: "border-green-500/50 bg-green-500/10" },
  { key: "done", label: "✅ Done", color: "border-mc-accent-green/50 bg-mc-accent-green/10" },
];

const priorityBadge: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  normal: "bg-mc-bg-tertiary text-mc-text-secondary border-mc-border",
  low: "bg-mc-bg-secondary text-mc-text-secondary/60 border-mc-border/50",
};

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", stage: "discovery", owner: "", expected_revenue: 0, notes: "", priority: "normal" });

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addItem = async () => {
    if (!newItem.name) return;
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });
    if (res.ok) {
      const item = await res.json();
      setItems([...items, item]);
      setNewItem({ name: "", stage: "discovery", owner: "", expected_revenue: 0, notes: "", priority: "normal" });
      setShowAdd(false);
    }
  };

  const moveStage = async (id: string, newStage: string) => {
    await fetch(`/api/pipeline/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    setItems(items.map((i) => (i.id === id ? { ...i, stage: newStage } : i)));
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
    setItems(items.filter((i) => i.id !== id));
  };

  const stageItems = (stage: string) => items.filter((i) => i.stage === stage);
  const stageRevenue = (stage: string) => stageItems(stage).reduce((s, i) => s + (i.expected_revenue || 0), 0);

  if (loading) return <div className="min-h-screen bg-mc-bg text-mc-text flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-mc-text-secondary hover:text-mc-text"><ChevronLeft size={20} /></Link>
            <h1 className="text-2xl font-bold">🚀 Pipeline</h1>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-mc-accent text-white rounded-lg hover:bg-mc-accent/80 flex items-center gap-2">
            <Plus size={16} /> Add Item
          </button>
        </div>

        {showAdd && (
          <div className="bg-mc-bg-secondary border border-mc-border rounded-xl p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-mc-text" />
              <select value={newItem.stage} onChange={(e) => setNewItem({ ...newItem, stage: e.target.value })} className="bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-mc-text">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <input placeholder="Owner" value={newItem.owner} onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })} className="bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-mc-text" />
              <input type="number" placeholder="Expected Revenue" value={newItem.expected_revenue || ""} onChange={(e) => setNewItem({ ...newItem, expected_revenue: parseFloat(e.target.value) || 0 })} className="bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-mc-text" />
              <input placeholder="Notes" value={newItem.notes} onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })} className="bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-mc-text col-span-2" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addItem} className="px-4 py-2 bg-mc-accent-green text-white rounded-lg hover:bg-mc-accent-green/80">Create</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-mc-bg-tertiary text-mc-text-secondary rounded-lg hover:bg-mc-border">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage.key} className={`border rounded-lg p-4 ${stage.color}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm">{stage.label}</h2>
                <span className="text-xs text-mc-text-secondary">{stageItems(stage.key).length}</span>
              </div>
              {stageRevenue(stage.key) > 0 && (
                <div className="text-xs text-mc-text-secondary mb-2 flex items-center gap-1">
                  <DollarSign size={12} /> ₩{stageRevenue(stage.key).toLocaleString()}
                </div>
              )}
              <div className="space-y-2">
                {stageItems(stage.key).map((item) => (
                  <div key={item.id} className="bg-mc-bg-secondary border border-mc-border rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${priorityBadge[item.priority]}`}>{item.priority}</span>
                    </div>
                    {item.owner && <p className="text-xs text-mc-text-secondary mt-1">👤 {item.owner}</p>}
                    {item.expected_revenue > 0 && <p className="text-xs text-mc-accent-green mt-1">₩{item.expected_revenue.toLocaleString()}</p>}
                    {item.notes && <p className="text-xs text-mc-text-secondary mt-1 line-clamp-2">{item.notes}</p>}
                    <div className="flex gap-1 mt-2">
                      {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                        <button key={s.key} onClick={() => moveStage(item.id, s.key)} className="text-[10px] px-1.5 py-0.5 bg-mc-bg-tertiary rounded hover:bg-mc-border text-mc-text-secondary">
                          → {s.label.split(" ")[0]}
                        </button>
                      ))}
                      <button onClick={() => deleteItem(item.id)} className="text-[10px] px-1.5 py-0.5 bg-red-500/20 rounded hover:bg-red-500/30 text-red-400 ml-auto">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
