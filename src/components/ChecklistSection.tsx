'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Square, CheckSquare } from 'lucide-react';

interface ChecklistItem {
  id: string;
  task_id: string;
  content: string;
  is_checked: number;
  position: number;
  created_at: string;
}

export function ChecklistSection({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/checklist`)
      .then(r => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, [taskId]);

  const addItem = async () => {
    if (!newItem.trim()) return;
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newItem.trim() }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems([...items, item]);
      setNewItem('');
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, is_checked: !item.is_checked }),
    });
    if (res.ok) {
      setItems(items.map(i => i.id === item.id ? { ...i, is_checked: i.is_checked ? 0 : 1 } : i));
    }
  };

  const deleteItem = async (itemId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/checklist`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      setItems(items.filter(i => i.id !== itemId));
    }
  };

  const checked = items.filter(i => i.is_checked).length;
  const total = items.length;

  if (loading) return <div className="text-xs text-mc-text-secondary">로딩중...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          체크리스트
          {total > 0 && (
            <span className="text-xs text-mc-text-secondary">({checked}/{total})</span>
          )}
        </h3>
      </div>

      {total > 0 && (
        <div className="w-full bg-mc-bg-tertiary rounded-full h-1.5">
          <div
            className="bg-mc-accent-green h-1.5 rounded-full transition-all"
            style={{ width: `${total > 0 ? (checked / total) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-mc-bg-tertiary/50">
            <button onClick={() => toggleItem(item)} className="flex-shrink-0">
              {item.is_checked ? (
                <CheckSquare className="w-4 h-4 text-mc-accent-green" />
              ) : (
                <Square className="w-4 h-4 text-mc-text-secondary" />
              )}
            </button>
            <span className={`text-sm flex-1 ${item.is_checked ? 'line-through text-mc-text-secondary' : ''}`}>
              {item.content}
            </span>
            <button
              onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-mc-text-secondary hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="항목 추가..."
          className="flex-1 bg-mc-bg border border-mc-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-mc-accent"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-3 py-1.5 bg-mc-accent text-white rounded text-sm hover:bg-mc-accent/90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
