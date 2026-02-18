'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PipelineItem {
  id: string;
  name: string;
  stage: string;
  reports: { name: string; url: string; stage: string }[];
  latestStage: number;
}

const STAGES = [
  { key: 'brainstorm', num: 1, label: '💡 브레인스토밍', desc: '아이디어 발굴', color: 'border-purple-500/50 bg-purple-500/10', accent: 'text-purple-400' },
  { key: 'trend', num: 2, label: '📊 트렌드 모니터링', desc: '시장 분석, Go/No-Go', color: 'border-blue-500/50 bg-blue-500/10', accent: 'text-blue-400' },
  { key: 'research', num: 3, label: '🔍 리서치/토론', desc: '심층 분석, 수익성', color: 'border-amber-500/50 bg-amber-500/10', accent: 'text-amber-400' },
  { key: 'strategy', num: 4, label: '📋 전략 수립', desc: '실행 계획 수립', color: 'border-orange-500/50 bg-orange-500/10', accent: 'text-orange-400' },
  { key: 'bizdev', num: 5, label: '🚀 사업개발', desc: '실행 + 액션 아이템', color: 'border-green-500/50 bg-green-500/10', accent: 'text-green-400' },
];

function classifyReport(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes('brainstorm')) return 'brainstorm';
  if (f.includes('trend') || f.includes('stage2')) return 'trend';
  if (f.includes('research') || f.includes('debate') || f.includes('discussion') || f.includes('stage3')) return 'research';
  if (f.includes('strategy') || f.includes('roadmap') || f.includes('stage4')) return 'strategy';
  if (f.includes('bizplan') || f.includes('pitch') || f.includes('stage5') || f.includes('execution') || f.includes('curriculum') || f.includes('plan')) return 'bizdev';
  return 'brainstorm';
}

function getLatestStage(reports: { stage: string }[]): number {
  const stageOrder: Record<string, number> = { brainstorm: 1, trend: 2, research: 3, strategy: 4, bizdev: 5 };
  let max = 0;
  for (const r of reports) {
    const n = stageOrder[r.stage] || 0;
    if (n > max) max = n;
  }
  return max;
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github?type=pipeline')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-mc-bg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🚀</div>
        <p className="text-mc-text-secondary">파이프라인 로딩중...</p>
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
          <h1 className="text-2xl font-bold">🚀 사업 파이프라인</h1>
          <p className="text-mc-text-secondary text-sm mt-1">KYUTOPIA 5단계 파이프라인 — {items.length}개 아이템</p>
        </div>

        {/* Stage Legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGES.map(s => (
            <div key={s.key} className={`text-xs px-3 py-1.5 rounded-lg border ${s.color}`}>
              {s.label}
            </div>
          ))}
        </div>

        {/* Pipeline Items */}
        <div className="space-y-3">
          {items.map(item => {
            const isOpen = selectedItem === item.id;
            return (
              <div key={item.id} className="bg-mc-bg-secondary rounded-xl border border-mc-border overflow-hidden">
                {/* Item Header */}
                <button
                  onClick={() => setSelectedItem(isOpen ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-mc-bg-tertiary/30 transition-colors text-left"
                >
                  <span className="text-lg font-bold text-mc-text-secondary/50 w-8">{item.id}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-mc-text-secondary mt-0.5">{item.reports.length}개 보고서</div>
                  </div>
                  {/* Stage Progress */}
                  <div className="flex gap-1">
                    {STAGES.map(s => (
                      <div
                        key={s.key}
                        className={`w-8 h-2 rounded-full ${
                          s.num <= item.latestStage ? 'bg-mc-accent-green' : 'bg-mc-bg-tertiary'
                        }`}
                        title={s.label}
                      />
                    ))}
                  </div>
                  <span className="text-mc-text-secondary text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded: Reports by Stage */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-mc-border">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-4">
                      {STAGES.map(stage => {
                        const stageReports = item.reports.filter(r => r.stage === stage.key);
                        return (
                          <div key={stage.key} className={`rounded-lg border p-3 ${stage.color}`}>
                            <div className={`text-xs font-semibold mb-2 ${stage.accent}`}>
                              Stage {stage.num}: {stage.label.slice(2)}
                            </div>
                            {stageReports.length > 0 ? (
                              <div className="space-y-1">
                                {stageReports.map(r => (
                                  <a
                                    key={r.name}
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-[11px] text-mc-text-secondary hover:text-mc-accent truncate transition-colors"
                                    title={r.name}
                                  >
                                    📄 {r.name.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '')}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-mc-text-secondary/30">—</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
