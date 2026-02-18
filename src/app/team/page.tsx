'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TeamMember {
  login: string;
  emoji: string;
  name: string;
  role: string;
  title: string;
  stats: { todo: number; inProgress: number; done: number; total: number };
  recentIssues: { number: number; title: string; state: string; priority: string; url: string }[];
}

const TEAM_MAP: Record<string, { emoji: string; name: string; role: string; title: string }> = {
  'doyun-kyu':  { emoji: '🦁', name: '도윤', role: 'CTO', title: '기술이사 — 개발/배포/운영' },
  'gunwoo-kyu': { emoji: '🐉', name: '건우', role: 'COO', title: '운영이사 — 일정관리/조율' },
  'solhee-kyu': { emoji: '🐺', name: '솔희', role: 'CSO', title: '전략이사 — 기획/전략/분석' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ todo: 0, ip: 0, done: 0, total: 0 });

  useEffect(() => {
    fetch('/api/github?type=board')
      .then(r => r.json())
      .then(board => {
        const memberStats: Record<string, TeamMember> = {};

        // Initialize known members
        for (const [login, info] of Object.entries(TEAM_MAP)) {
          memberStats[login] = {
            login, ...info,
            stats: { todo: 0, inProgress: 0, done: 0, total: 0 },
            recentIssues: [],
          };
        }

        let tTodo = 0, tIp = 0, tDone = 0;

        for (const [col, cards] of Object.entries(board.columns as Record<string, any[]>)) {
          for (const card of cards) {
            const login = card.assignees?.[0]?.login || '';
            if (login && memberStats[login]) {
              memberStats[login].stats.total++;
              if (col === 'Todo') { memberStats[login].stats.todo++; tTodo++; }
              else if (col === 'In Progress') { memberStats[login].stats.inProgress++; tIp++; }
              else if (col === 'Done') { memberStats[login].stats.done++; tDone++; }

              if (col !== 'Done' && memberStats[login].recentIssues.length < 5) {
                memberStats[login].recentIssues.push({
                  number: card.number,
                  title: card.title,
                  state: col,
                  priority: card.priority || '',
                  url: card.url,
                });
              }
            } else {
              if (col === 'Todo') tTodo++;
              else if (col === 'In Progress') tIp++;
              else if (col === 'Done') tDone++;
            }
          }
        }

        setTotals({ todo: tTodo, ip: tIp, done: tDone, total: board.totalItems });
        setMembers(Object.values(memberStats));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">👥</div>
        <p className="text-mc-text-secondary">팀 데이터 로딩중...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" className="text-mc-text-secondary hover:text-mc-text text-sm transition-colors">← 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold">👥 팀 현황</h1>
          <p className="text-mc-text-secondary text-sm mt-1">GitHub Issues 기반 실시간 데이터</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20">
            <div className="text-3xl font-bold">{totals.total}</div>
            <div className="text-sm text-mc-text-secondary mt-1">전체 이슈</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/20">
            <div className="text-3xl font-bold text-mc-accent-yellow">{totals.ip}</div>
            <div className="text-sm text-mc-text-secondary mt-1">진행중</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-slate-600/20 to-slate-800/10 border border-slate-500/20">
            <div className="text-3xl font-bold">{totals.todo}</div>
            <div className="text-sm text-mc-text-secondary mt-1">대기</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/20">
            <div className="text-3xl font-bold text-mc-accent-green">{totals.done}</div>
            <div className="text-sm text-mc-text-secondary mt-1">완료</div>
            <div className="text-xs text-mc-text-secondary mt-1">
              {totals.total > 0 ? Math.round(totals.done / totals.total * 100) : 0}% 완료율
            </div>
          </div>
        </div>

        {/* Team Member Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {members.map(m => {
            const rate = m.stats.total > 0 ? Math.round(m.stats.done / m.stats.total * 100) : 0;
            return (
              <div key={m.login} className="bg-mc-bg-secondary rounded-xl border border-mc-border overflow-hidden">
                {/* Member Header */}
                <div className="p-5 border-b border-mc-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{m.emoji}</span>
                    <div>
                      <div className="font-bold text-lg">{m.name}</div>
                      <div className="text-xs text-mc-accent">{m.role}</div>
                    </div>
                  </div>
                  <p className="text-xs text-mc-text-secondary">{m.title}</p>
                </div>

                {/* Stats */}
                <div className="p-5 border-b border-mc-border">
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div>
                      <div className="text-lg font-bold">{m.stats.total}</div>
                      <div className="text-[10px] text-mc-text-secondary">전체</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-mc-accent-yellow">{m.stats.inProgress}</div>
                      <div className="text-[10px] text-mc-text-secondary">진행</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{m.stats.todo}</div>
                      <div className="text-[10px] text-mc-text-secondary">대기</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-mc-accent-green">{m.stats.done}</div>
                      <div className="text-[10px] text-mc-text-secondary">완료</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-mc-bg-tertiary rounded-full h-2">
                    <div className="bg-mc-accent-green h-2 rounded-full transition-all" style={{ width: `${rate}%` }} />
                  </div>
                  <div className="text-right text-xs text-mc-text-secondary mt-1">{rate}% 완료율</div>
                </div>

                {/* Active Issues */}
                <div className="p-5">
                  <div className="text-xs font-semibold text-mc-text-secondary mb-2">📋 활성 이슈</div>
                  {m.recentIssues.length > 0 ? (
                    <div className="space-y-1.5">
                      {m.recentIssues.map(issue => (
                        <a key={issue.number} href={issue.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-mc-bg-tertiary/50 transition-colors group">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            issue.state === 'In Progress' ? 'bg-mc-accent' : 'bg-mc-text-secondary/30'
                          }`} />
                          <span className="truncate group-hover:text-mc-accent transition-colors">
                            #{issue.number} {issue.title}
                          </span>
                          {issue.priority && (
                            <span className="text-[9px] flex-shrink-0">{issue.priority.slice(0, 2)}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-mc-text-secondary/50">활성 이슈 없음</p>
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
