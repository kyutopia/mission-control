'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PR {
  repo: string;
  number: number;
  title: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  author: string;
  labels: { name: string; color: string }[];
  reviewDecision: string | null;
  reviews: { author: string; state: string }[];
  branch: string;
  baseBranch: string;
}

const STATE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  OPEN:   { icon: '🟢', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  MERGED: { icon: '🟣', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/30' },
  CLOSED: { icon: '🔴', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
};

const AUTHOR_MAP: Record<string, { emoji: string; name: string }> = {
  'doyun-kyu': { emoji: '🦁', name: '도윤' },
  'gunwoo-kyu': { emoji: '🐉', name: '건우' },
  'solhee-kyu': { emoji: '🐺', name: '솔희' },
  'lidoky': { emoji: '🐴', name: '동규' },
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function PullsPage() {
  const [pulls, setPulls] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'OPEN' | 'MERGED' | 'CLOSED'>('all');

  useEffect(() => {
    fetch('/api/github?type=pulls')
      .then(r => r.json())
      .then(data => { setPulls(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? pulls : pulls.filter(p => p.state === filter);
  const openCount = pulls.filter(p => p.state === 'OPEN').length;
  const mergedCount = pulls.filter(p => p.state === 'MERGED').length;

  if (loading) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🔀</div>
        <p className="text-mc-text-secondary">PR 로딩중...</p>
      </div>
    </div>
  );

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
              <h1 className="text-2xl font-bold">🔀 Pull Requests</h1>
              <p className="text-mc-text-secondary text-sm mt-1">
                🟢 {openCount} Open · 🟣 {mergedCount} Merged · 전체 {pulls.length}
              </p>
            </div>
            <div className="flex gap-2">
              {(['all', 'OPEN', 'MERGED', 'CLOSED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    filter === f
                      ? 'bg-mc-accent/20 border-mc-accent text-mc-accent'
                      : 'bg-mc-bg-secondary border-mc-border text-mc-text-secondary hover:border-mc-accent/40'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'OPEN' ? '🟢 Open' : f === 'MERGED' ? '🟣 Merged' : '🔴 Closed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PR List */}
        <div className="space-y-2">
          {filtered.map(pr => {
            const stateConfig = STATE_CONFIG[pr.state];
            const authorInfo = AUTHOR_MAP[pr.author];
            return (
              <a
                key={`${pr.repo}-${pr.number}`}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mc-bg-secondary rounded-xl border border-mc-border hover:border-mc-accent/40 transition-all p-4 group"
              >
                <div className="flex items-start gap-3">
                  {/* State icon */}
                  <span className="text-xl mt-0.5">{stateConfig.icon}</span>

                  <div className="flex-1 min-w-0">
                    {/* Title + repo */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-mc-bg-tertiary text-mc-text-secondary font-mono">
                        {pr.repo}
                      </span>
                      {pr.isDraft && (
                        <span className="text-xs px-2 py-0.5 rounded bg-mc-bg-tertiary text-mc-text-secondary">
                          Draft
                        </span>
                      )}
                    </div>
                    <p className="font-medium group-hover:text-mc-accent transition-colors truncate">
                      {pr.title} <span className="text-mc-text-secondary font-normal">#{pr.number}</span>
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-mc-text-secondary">
                      <span className="flex items-center gap-1">
                        {authorInfo ? `${authorInfo.emoji} ${authorInfo.name}` : pr.author}
                      </span>
                      <span>{pr.branch} → {pr.baseBranch}</span>
                      <span className="text-green-400">+{pr.additions}</span>
                      <span className="text-red-400">-{pr.deletions}</span>
                      <span>{pr.changedFiles}개 파일</span>
                      <span>{timeAgo(pr.updatedAt)}</span>
                      {pr.reviewDecision && (
                        <span className={`px-1.5 py-0.5 rounded border ${
                          pr.reviewDecision === 'APPROVED' ? 'bg-green-500/20 border-green-500/30 text-green-400'
                          : pr.reviewDecision === 'CHANGES_REQUESTED' ? 'bg-red-500/20 border-red-500/30 text-red-400'
                          : 'bg-mc-bg-tertiary border-mc-border'
                        }`}>
                          {pr.reviewDecision === 'APPROVED' ? '✅ Approved' : pr.reviewDecision === 'CHANGES_REQUESTED' ? '🔄 Changes' : pr.reviewDecision}
                        </span>
                      )}
                    </div>

                    {/* Labels */}
                    {pr.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pr.labels.map(l => (
                          <span key={l.name} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `#${l.color}35`, color: `#${l.color}` }}>
                            {l.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-mc-text-secondary">PR 없음</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
