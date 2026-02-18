'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface KPIData {
  issues: {
    openCount: number;
    closedThisWeek: number;
    createdThisWeek: number;
    avgCloseTimeDays: number;
    byAssignee: { name: string; emoji: string; open: number; closed: number }[];
  };
  prs: {
    openCount: number;
    mergedThisWeek: number;
    avgMergeTimeHours: number;
  };
  pipeline: {
    totalProjects: number;
    activeProjects: number;
  };
}

interface Report {
  id: string;
  date: string;
  type: 'daily' | 'weekly' | 'strategy';
  title: string;
  summary: string;
  content: string;
  author: string;
}

const AUTHOR_MAP: Record<string, { emoji: string; name: string }> = {
  'doyun-kyu': { emoji: '🦁', name: '도윤' },
  'gunwoo-kyu': { emoji: '🐉', name: '건우' },
  'solhee-kyu': { emoji: '🐺', name: '솔희' },
  'lidoky': { emoji: '🐴', name: '동규' },
};

function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-4">
      <div className="text-xs text-mc-text-secondary mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color || 'text-mc-text'}`}>{value}</div>
      {sub && <div className="text-xs text-mc-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'strategy'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/github?type=kpi').then(r => r.json()).catch(() => null),
      fetch('/api/reports').then(r => r.json()).catch(() => []),
    ]).then(([kpiData, reportsData]) => {
      setKpi(kpiData);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === 'all' ? reports : reports.filter(r => r.type === filter);

  if (loading) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">📊</div>
        <p className="text-mc-text-secondary">보고서 로딩중...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" className="text-mc-text-secondary hover:text-mc-text text-sm transition-colors">← 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold">📊 보고서 & KPI</h1>
          <p className="text-mc-text-secondary text-sm mt-1">KYUTOPIA 성과 지표 + 보고서 아카이브</p>
        </div>

        {/* KPI Dashboard */}
        {kpi && (
          <div className="mb-8">
            <h2 className="font-semibold mb-4 text-mc-text-secondary text-sm">📈 이번 주 KPI</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard label="오픈 이슈" value={kpi.issues.openCount} color="text-yellow-400" />
              <KPICard label="이번 주 클로즈" value={kpi.issues.closedThisWeek} color="text-green-400" sub={`생성 ${kpi.issues.createdThisWeek}건`} />
              <KPICard
                label="클로즈율"
                value={kpi.issues.createdThisWeek > 0 ? `${Math.round((kpi.issues.closedThisWeek / (kpi.issues.closedThisWeek + kpi.issues.openCount)) * 100)}%` : '-'}
                color="text-mc-accent"
              />
              <KPICard label="오픈 PR" value={kpi.prs.openCount} color="text-purple-400" />
              <KPICard label="이번 주 머지" value={kpi.prs.mergedThisWeek} color="text-green-400" />
              <KPICard label="파이프라인" value={`${kpi.pipeline.activeProjects}/${kpi.pipeline.totalProjects}`} sub="활성/전체" />
            </div>

            {/* Per-assignee breakdown */}
            {kpi.issues.byAssignee.length > 0 && (
              <div className="mt-4 bg-mc-bg-secondary rounded-xl border border-mc-border p-4">
                <h3 className="text-xs text-mc-text-secondary mb-3">👥 담당자별 처리 현황</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {kpi.issues.byAssignee.map(a => (
                    <div key={a.name} className="flex items-center gap-3">
                      <span className="text-xl">{a.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{a.name}</div>
                        <div className="flex gap-3 text-xs text-mc-text-secondary">
                          <span className="text-yellow-400">⏳ {a.open}</span>
                          <span className="text-green-400">✅ {a.closed}</span>
                        </div>
                      </div>
                      <div className="w-20 bg-mc-bg-tertiary rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${a.open + a.closed > 0 ? (a.closed / (a.open + a.closed)) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports Archive */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-mc-text-secondary text-sm">📋 보고서 아카이브 ({filtered.length}건)</h2>
            <div className="flex gap-2">
              {(['all', 'daily', 'weekly', 'strategy'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    filter === f
                      ? 'bg-mc-accent/20 border-mc-accent text-mc-accent'
                      : 'bg-mc-bg-secondary border-mc-border text-mc-text-secondary hover:border-mc-accent/40'
                  }`}
                >
                  {f === 'all' ? '전체' : f === 'daily' ? '📊 일일' : f === 'weekly' ? '📈 주간' : '🔍 전략'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map(report => {
              const isExpanded = expandedId === report.id;
              return (
                <div key={report.id} className="bg-mc-bg-secondary rounded-xl border border-mc-border overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-mc-bg-tertiary/30 transition-colors text-left"
                  >
                    <span className="text-xs px-2 py-1 rounded bg-mc-bg-tertiary text-mc-text-secondary">
                      {report.type === 'daily' ? '📊' : report.type === 'weekly' ? '📈' : '🔍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{report.title}</div>
                      <div className="text-xs text-mc-text-secondary mt-0.5">{report.summary}</div>
                    </div>
                    <span className="text-xs text-mc-text-secondary whitespace-nowrap">{report.date}</span>
                    <span className="text-xs text-mc-text-secondary">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-mc-border">
                      <div className="text-sm text-mc-text-secondary whitespace-pre-wrap leading-relaxed mt-3">
                        {report.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-mc-text-secondary">
                <p className="text-sm">보고서가 아직 없습니다. 자동 생성 설정 후 매일 누적됩니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
