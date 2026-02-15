'use client';

import { useState, useMemo } from 'react';
import { Plus, ChevronRight, GripVertical, Filter } from 'lucide-react';
import { useMissionControl } from '@/lib/store';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './TaskModal';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MissionQueueProps {
  workspaceId?: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'planning', label: '📋 기획', color: 'border-t-mc-accent-purple' },
  { id: 'inbox', label: '📥 수신함', color: 'border-t-mc-accent-pink' },
  { id: 'assigned', label: '📌 배정', color: 'border-t-mc-accent-yellow' },
  { id: 'in_progress', label: '🔨 진행중', color: 'border-t-mc-accent' },
  { id: 'testing', label: '🧪 테스트', color: 'border-t-mc-accent-cyan' },
  { id: 'review', label: '🔍 검토', color: 'border-t-mc-accent-purple' },
  { id: 'done', label: '✅ 완료', color: 'border-t-mc-accent-green' },
];

const MOBILE_TABS = [
  { id: 'waiting', label: '대기', statuses: ['planning', 'inbox', 'assigned'] as TaskStatus[] },
  { id: 'active', label: '진행중', statuses: ['in_progress', 'testing'] as TaskStatus[] },
  { id: 'complete', label: '완료', statuses: ['review', 'done'] as TaskStatus[] },
];

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  planning: 'inbox',
  inbox: 'assigned',
  assigned: 'in_progress',
  in_progress: 'testing',
  testing: 'review',
  review: 'done',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🔴 긴급',
  high: '🔴 높음',
  normal: '🟡 보통',
  low: '🟢 낮음',
};

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  normal: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

const AGENT_BORDER_COLORS: Record<string, string> = {
  '도윤': 'border-l-[3px] border-l-blue-500',
  '건우': 'border-l-[3px] border-l-green-500',
  '솔희': 'border-l-[3px] border-l-purple-500',
  '동규': 'border-l-[3px] border-l-yellow-500',
};

function getAgentBorderClass(agentName?: string): string {
  if (!agentName) return '';
  for (const [key, cls] of Object.entries(AGENT_BORDER_COLORS)) {
    if (agentName.includes(key)) return cls;
  }
  return '';
}

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const { tasks, agents, updateTaskStatus, addEvent } = useMissionControl();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<string>('waiting');

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterAgent !== 'all' && t.assigned_agent_id !== filterAgent) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterAgent, filterPriority]);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((task) => task.status === status);

  const getMobileTabTasks = (tabId: string) => {
    const tab = MOBILE_TABS.find(t => t.id === tabId);
    if (!tab) return [];
    return filteredTasks.filter(t => tab.statuses.includes(t.status));
  };

  const getMobileTabCount = (tabId: string) => {
    const tab = MOBILE_TABS.find(t => t.id === tabId);
    if (!tab) return 0;
    return filteredTasks.filter(t => tab.statuses.includes(t.status)).length;
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }
    await moveTask(draggedTask, targetStatus);
    setDraggedTask(null);
  };

  const moveTask = async (task: Task, targetStatus: TaskStatus) => {
    updateTaskStatus(task.id, targetStatus);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        addEvent({
          id: crypto.randomUUID(),
          type: targetStatus === 'done' ? 'task_completed' : 'task_status_changed',
          task_id: task.id,
          message: `"${task.title}" → ${COLUMNS.find(c => c.id === targetStatus)?.label || targetStatus}`,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      updateTaskStatus(task.id, task.status);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-mc-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-mc-text-secondary" />
          <span className="text-sm font-medium uppercase tracking-wider">미션 큐</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-mc-accent text-white rounded text-sm font-medium hover:bg-mc-accent/90"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">새 태스크</span>
          <span className="sm:hidden">추가</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="px-3 py-2 border-b border-mc-border/50 flex items-center gap-3 bg-mc-bg-secondary/50 overflow-x-auto">
        <Filter className="w-4 h-4 text-mc-text-secondary flex-shrink-0" />
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="bg-mc-bg border border-mc-border rounded px-2 py-1 text-sm text-mc-text min-w-0"
        >
          <option value="all">모든 담당자</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.avatar_emoji} {a.name}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="bg-mc-bg border border-mc-border rounded px-2 py-1 text-sm text-mc-text min-w-0"
        >
          <option value="all">모든 우선순위</option>
          <option value="urgent">🔴 긴급</option>
          <option value="high">🔴 높음</option>
          <option value="normal">🟡 보통</option>
          <option value="low">🟢 낮음</option>
        </select>
        {(filterAgent !== 'all' || filterPriority !== 'all') && (
          <button
            onClick={() => { setFilterAgent('all'); setFilterPriority('all'); }}
            className="text-xs text-mc-accent hover:underline flex-shrink-0"
          >
            초기화
          </button>
        )}
      </div>

      {/* Mobile Tab View */}
      <div className="md:hidden">
        <div className="flex border-b border-mc-border">
          {MOBILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium text-center relative ${
                mobileTab === tab.id
                  ? 'text-mc-accent border-b-2 border-mc-accent'
                  : 'text-mc-text-secondary'
              }`}
            >
              {tab.label}
              <span className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs ${
                mobileTab === tab.id ? 'bg-mc-accent/20 text-mc-accent' : 'bg-mc-bg-tertiary text-mc-text-secondary'
              }`}>
                {getMobileTabCount(tab.id)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {getMobileTabTasks(mobileTab).map(task => (
            <MobileTaskCard
              key={task.id}
              task={task}
              onClick={() => setEditingTask(task)}
              onMoveNext={() => {
                const next = NEXT_STATUS[task.status];
                if (next) moveTask(task, next);
              }}
            />
          ))}
          {getMobileTabTasks(mobileTab).length === 0 && (
            <div className="text-center py-8 text-mc-text-secondary text-sm">태스크가 없습니다</div>
          )}
        </div>
      </div>

      {/* Desktop Kanban Columns */}
      <div className="hidden md:flex flex-1 gap-3 p-3 overflow-x-auto">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className={`flex-1 min-w-[220px] max-w-[300px] flex flex-col bg-mc-bg rounded-lg border border-mc-border/50 border-t-2 ${column.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-2 border-b border-mc-border flex items-center justify-between">
                <span className="text-xs font-medium text-mc-text-secondary">{column.label}</span>
                <span className="text-xs bg-mc-bg-tertiary px-2 py-0.5 rounded text-mc-text-secondary">{columnTasks.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onDragStart={handleDragStart} onClick={() => setEditingTask(task)} isDragging={draggedTask?.id === task.id} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showCreateModal && <TaskModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />}
      {editingTask && <TaskModal task={editingTask} onClose={() => setEditingTask(null)} workspaceId={workspaceId} />}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
  isDragging: boolean;
}

function TaskCard({ task, onDragStart, onClick, isDragging }: TaskCardProps) {
  const agentName = (task.assigned_agent as unknown as { name: string })?.name;
  const agentBorder = getAgentBorderClass(agentName);
  const isPlanning = task.status === 'planning';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className={`group bg-mc-bg-secondary border rounded-lg cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 ${agentBorder} ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isPlanning ? 'border-purple-500/40 hover:border-purple-500' : 'border-mc-border/50 hover:border-mc-accent/40'}`}
    >
      <div className="flex items-center justify-center py-1.5 border-b border-mc-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-mc-text-secondary/50 cursor-grab" />
      </div>
      <div className="p-4">
        <h4 className="text-sm font-medium leading-snug line-clamp-2 mb-3">{task.title}</h4>
        
        {isPlanning && (
          <div className="flex items-center gap-2 mb-3 py-2 px-3 bg-purple-500/10 rounded-md border border-purple-500/20">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0" />
            <span className="text-xs text-purple-400 font-medium">기획 진행중</span>
          </div>
        )}

        {task.assigned_agent && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-2 bg-mc-bg-tertiary/50 rounded">
            <span className="text-base">{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</span>
            <span className="text-xs text-mc-text-secondary truncate">{agentName}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-mc-border/20">
          <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className="text-[10px] text-mc-text-secondary/60">
            {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ko })}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MobileTaskCardProps {
  task: Task;
  onClick: () => void;
  onMoveNext: () => void;
}

function MobileTaskCard({ task, onClick, onMoveNext }: MobileTaskCardProps) {
  const agentName = (task.assigned_agent as unknown as { name: string })?.name;
  const agentEmoji = (task.assigned_agent as unknown as { avatar_emoji: string })?.avatar_emoji;
  const nextStatus = NEXT_STATUS[task.status];
  const nextLabel = nextStatus ? COLUMNS.find(c => c.id === nextStatus)?.label : null;

  return (
    <div
      onClick={onClick}
      className="bg-mc-bg-secondary border border-mc-border/50 rounded-lg p-3 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_BADGE[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {agentName && (
              <span className="text-xs text-mc-text-secondary">
                {agentEmoji} {agentName}
              </span>
            )}
            <span className="text-xs text-mc-text-secondary/60">
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>
        </div>
        {nextLabel && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveNext(); }}
            className="flex-shrink-0 text-xs px-2 py-1.5 bg-mc-accent/20 text-mc-accent rounded hover:bg-mc-accent/30 min-h-[36px]"
            title={`→ ${nextLabel}`}
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}
