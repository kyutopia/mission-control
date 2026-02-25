'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface BoardCard {
  id: string;
  number: number;
  title: string;
  state: string;
  url: string;
  body?: string;
  labels: { name: string; color: string }[];
  assignees: { login: string; avatarUrl: string }[];
  priority: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  repo?: string;
}

interface BoardData {
  title: string;
  columns: Record<string, BoardCard[]>;
  totalItems: number;
}

const PRIORITY_MAP: Record<string, { color: string; tw: string }> = {
  '🔴 긴급': { color: '#ef4444', tw: 'border-l-red-500' },
  '🟡 보통': { color: '#eab308', tw: 'border-l-yellow-500' },
  '🟢 여유': { color: '#22c55e', tw: 'border-l-green-500' },
};

const COLUMN_CONFIG: Record<string, { icon: string; accent: string; countBg: string; countText: string }> = {
  'Todo':        { icon: '📋', accent: 'border-t-slate-500', countBg: 'bg-slate-500/20', countText: 'text-slate-400' },
  'In Progress': { icon: '🔨', accent: 'border-t-mc-accent', countBg: 'bg-blue-500/20', countText: 'text-blue-400' },
  'Done':        { icon: '✅', accent: 'border-t-mc-accent-green', countBg: 'bg-green-500/20', countText: 'text-green-400' },
};

const ASSIGNEE_EMOJI: Record<string, string> = {
  '🦁 도윤': '🦁', '🐉 건우': '🐉', '🐺 솔희': '🐺', '🐴 동규': '🐴',
};

const GH_LOGIN_MAP: Record<string, { emoji: string; name: string }> = {
  'doyun-kyu': { emoji: '🦁', name: '도윤' },
  'gunwoo-kyu': { emoji: '🐉', name: '건우' },
  'solhee-kyu': { emoji: '🐺', name: '솔희' },
  'kyutopia_dk': { emoji: '🐴', name: '동규' },
  'lidoky': { emoji: '🐴', name: '동규' },
};

function getAssigneeDisplay(card: BoardCard): { emoji: string; name: string } | null {
  // First try project field
  if (card.assignee) {
    const e = ASSIGNEE_EMOJI[card.assignee] || '👤';
    return { emoji: e, name: card.assignee.replace(/^[^\s]+\s/, '') };
  }
  // Fall back to GitHub assignees
  if (card.assignees && card.assignees.length > 0) {
    const login = card.assignees[0].login;
    const mapped = GH_LOGIN_MAP[login];
    return mapped || { emoji: '👤', name: login };
  }
  return null;
}

const PRIORITY_ORDER: Record<string, number> = {
  '🔴 긴급': 0, '🟡 보통': 1, '🟢 여유': 2,
};

function sortCards(cards: BoardCard[], isDone: boolean): BoardCard[] {
  return [...cards].sort((a, b) => {
    if (isDone) {
      // Done: most recently updated first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    // Todo/In Progress: priority → date
    const pa = PRIORITY_ORDER[a.priority] ?? 3;
    const pb = PRIORITY_ORDER[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

// Filter out labels already shown as separate fields (date, assignee, status, priority)
const HIDDEN_LABEL_PREFIXES = ['📅', '👑', '🦊', '🐺', '🐉', '🦁', '✅', '⏳', '🔴', '🟡', '🟢'];
function filterDisplayLabels(labels: { name: string; color: string }[]) {
  return labels.filter(l => !HIDDEN_LABEL_PREFIXES.some(p => l.name.startsWith(p)));
}

function getDateLabel(labels: { name: string; color: string }[]): string | null {
  const dl = labels.find(l => l.name.startsWith('📅'));
  if (!dl) return null;
  const m = dl.name.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0].slice(5) : null;
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  const clean = text.replace(/\r?\n/g, ' ').replace(/#{1,3}\s/g, '').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

export default function KanbanBoard() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRepo, setFilterRepo] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github?type=board')
      .then(r => r.json())
      .then(data => { setBoard(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const assignees = useMemo(() => {
    if (!board) return [];
    const set = new Set<string>();
    Object.values(board.columns).flat().forEach(c => {
      if (c.assignee) set.add(c.assignee.replace(/^[^\s]+\s/, ''));
      if (c.assignees?.[0]?.login) {
        const m = GH_LOGIN_MAP[c.assignees[0].login];
        if (m) set.add(m.name);
        else set.add(c.assignees[0].login);
      }
    });
    return Array.from(set);
  }, [board]);

  const repos = useMemo(() => {
    if (!board) return [];
    const set = new Set<string>();
    Object.values(board.columns).flat().forEach(c => {
      if (c.repo) set.add(c.repo);
    });
    return Array.from(set).sort();
  }, [board]);

  const filteredBoard = useMemo(() => {
    if (!board) return null;
    const filtered: Record<string, BoardCard[]> = {};
    for (const [col, cards] of Object.entries(board.columns)) {
      filtered[col] = cards.filter(c => {
        if (filterAssignee !== 'all') {
          const ghLogin = c.assignees?.[0]?.login;
          const mapped = ghLogin ? (GH_LOGIN_MAP[ghLogin]?.name || ghLogin) : '';
          const projectAssignee = c.assignee?.replace(/^[^\s]+\s/, '') || '';
          if (projectAssignee !== filterAssignee && mapped !== filterAssignee) return false;
        }
        if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
        if (filterRepo !== 'all' && c.repo !== filterRepo) return false;
        return true;
      });
    }
    return filtered;
  }, [board, filterAssignee, filterPriority, filterRepo]);

  if (loading) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">📋</div>
        <p className="text-mc-text-secondary">GitHub 데이터 로딩중...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="bg-mc-bg-secondary rounded-xl border border-red-500/30 p-6 text-center max-w-md">
        <p className="text-mc-accent-red text-lg font-semibold mb-2">❌ 오류 발생</p>
        <p className="text-mc-text-secondary text-sm">{error}</p>
      </div>
    </div>
  );

  if (!board || !filteredBoard) return null;

  const columnOrder = ['Todo', 'In Progress', 'Done'];
  const totalFiltered = Object.values(filteredBoard).flat().length;

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/" className="text-mc-text-secondary hover:text-mc-text text-sm transition-colors">← 대시보드</Link>
              </div>
              <h1 className="text-2xl font-bold">📋 {board.title}</h1>
              <p className="text-mc-text-secondary mt-1 text-sm">{totalFiltered} / {board.totalItems} 항목</p>
            </div>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterAssignee}
                onChange={e => setFilterAssignee(e.target.value)}
                className="bg-mc-bg-secondary text-mc-text-secondary text-xs px-3 py-2 rounded-lg border border-mc-border focus:border-mc-accent outline-none transition-colors"
              >
                <option value="all">👤 담당자 전체</option>
                {assignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="bg-mc-bg-secondary text-mc-text-secondary text-xs px-3 py-2 rounded-lg border border-mc-border focus:border-mc-accent outline-none transition-colors"
              >
                <option value="all">⚡ 우선순위 전체</option>
                {Object.keys(PRIORITY_MAP).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={filterRepo}
                onChange={e => setFilterRepo(e.target.value)}
                className="bg-mc-bg-secondary text-mc-text-secondary text-xs px-3 py-2 rounded-lg border border-mc-border focus:border-mc-accent outline-none transition-colors"
              >
                <option value="all">📦 Repo 전체</option>
                {repos.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
          {columnOrder.map(col => {
            const config = COLUMN_CONFIG[col] || COLUMN_CONFIG['Todo'];
            const cards = sortCards(filteredBoard[col] || [], col === "Done");
            return (
              <div key={col} className={`flex-1 min-w-[300px] bg-mc-bg-secondary rounded-xl border border-mc-border overflow-hidden border-t-[3px] ${config.accent}`}>
                {/* Column Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-mc-border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-semibold text-sm">{col}</span>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${config.countBg} ${config.countText}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 56px)' }}>
                  {cards.map(card => {
                    const pri = PRIORITY_MAP[card.priority];
                    const isHovered = hoveredCard === card.id;
                    const assigneeInfo = getAssigneeDisplay(card);
                    const displayLabels = filterDisplayLabels(card.labels);
                    const dateLabel = getDateLabel(card.labels);

                    return (
                      <a
                        key={card.id}
                        href={card.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-xl p-3 bg-mc-bg border border-mc-border/50 hover:border-mc-accent/40 transition-all duration-150 hover:shadow-lg hover:shadow-mc-accent/5 relative group border-l-[3px] ${pri ? pri.tw : 'border-l-mc-bg-tertiary'}`}
                        onMouseEnter={() => setHoveredCard(card.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {/* Labels */}
                        {displayLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {displayLabels.slice(0, 3).map(l => (
                              <span
                                key={l.name}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  backgroundColor: `#${l.color}35`,
                                  color: `#${l.color}`,
                                  border: `1px solid #${l.color}40`,
                                }}
                              >
                                {l.name}
                              </span>
                            ))}
                            {displayLabels.length > 3 && (
                              <span className="text-[10px] text-mc-text-secondary">+{displayLabels.length - 3}</span>
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <p className="text-sm font-medium leading-snug mb-2 group-hover:text-mc-accent transition-colors">
                          {card.title}
                        </p>

                        {/* Repo Badge */}
                        {card.repo && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-mc-accent/10 text-mc-accent border border-mc-accent/20 mb-2 font-mono">
                            {card.repo}
                          </span>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${assigneeInfo ? 'bg-mc-bg-tertiary/50 text-mc-text-secondary' : 'bg-mc-bg-tertiary/30 text-mc-text-secondary/50'}`}>
                              <span>{assigneeInfo ? assigneeInfo.emoji : '👤'}</span>
                              <span>{assigneeInfo ? assigneeInfo.name : '미지정'}</span>
                            </span>
                            {pri && (
                              <span className="px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: pri.color + '20', color: pri.color }}>
                                {card.priority}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {dateLabel ? <span className="text-mc-text-secondary">📅 {dateLabel}</span> : <span className="text-mc-text-secondary/40">📅 미설정</span>}
                            <span className="text-mc-text-secondary/50 font-mono">#{card.number}</span>
                          </div>
                        </div>

                        {/* Hover tooltip */}
                        {isHovered && card.body && (
                          <div className="absolute left-full ml-2 top-0 z-50 w-72 bg-mc-bg-secondary border border-mc-border rounded-xl shadow-xl p-3 pointer-events-none">
                            <p className="text-xs text-mc-text-secondary leading-relaxed">
                              {truncate(card.body, 200)}
                            </p>
                          </div>
                        )}
                      </a>
                    );
                  })}
                  {cards.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-mc-text-secondary/50 text-xs">항목 없음</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
