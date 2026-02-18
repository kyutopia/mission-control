'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PipelineReport {
  name: string;
  url: string;
  stage: string;
}

interface GateDecision {
  gate: number;
  status: 'go' | 'pivot' | 'kill' | 'pending';
  file?: string;
  url?: string;
}

interface PipelineItem {
  id: string;
  name: string;
  reports: PipelineReport[];
  gates: GateDecision[];
  latestStage: number;
}

const STAGES = [
  { key: 'brainstorm', num: 1, label: '💡 브레인스토밍', desc: '아이디어 발굴', color: 'border-purple-500/50 bg-purple-500/10', accent: 'text-purple-400', barColor: 'bg-purple-500' },
  { key: 'trend', num: 2, label: '📊 트렌드분석', desc: '시장 분석, TAM/SAM', color: 'border-blue-500/50 bg-blue-500/10', accent: 'text-blue-400', barColor: 'bg-blue-500' },
  { key: 'research', num: 3, label: '🔍 심층 리서치', desc: '경쟁 분석, 토론', color: 'border-amber-500/50 bg-amber-500/10', accent: 'text-amber-400', barColor: 'bg-amber-500' },
  { key: 'strategy', num: 4, label: '📋 전략 수립', desc: '실행 계획, 비즈플랜', color: 'border-orange-500/50 bg-orange-500/10', accent: 'text-orange-400', barColor: 'bg-orange-500' },
  { key: 'mvp', num: 5, label: '🚀 MVP·실행', desc: 'MVP 개발, 초기 사용자', color: 'border-cyan-500/50 bg-cyan-500/10', accent: 'text-cyan-400', barColor: 'bg-cyan-500' },
  { key: 'scaleup', num: 6, label: '💰 스케일업', desc: '수익화, 운영 안정화', color: 'border-green-500/50 bg-green-500/10', accent: 'text-green-400', barColor: 'bg-green-500' },
];

const GATE_STATUS_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  go: { icon: '✅', label: 'Go', color: 'text-green-400 bg-green-500/20 border-green-500/30' },
  pivot: { icon: '🔄', label: 'Pivot', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
  kill: { icon: '❌', label: 'Kill', color: 'text-red-400 bg-red-500/20 border-red-500/30' },
  pending: { icon: '⏳', label: '대기', color: 'text-mc-text-secondary/50 bg-mc-bg-tertiary/30 border-mc-border' },
};

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

  // Summary counts
  const activeCount = items.filter(i => !i.gates.some(g => g.status === 'kill')).length;
  const killedCount = items.filter(i => i.gates.some(g => g.status === 'kill')).length;

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" className="text-mc-text-secondary hover:text-mc-text text-sm transition-colors">← 대시보드</Link>
          </div>
          <h1 className="text-2xl font-bold">🚀 사업 파이프라인</h1>
          <p className="text-mc-text-secondary text-sm mt-1">
            KYUTOPIA Stage-Gate® — {items.length}개 프로젝트 (활성 {activeCount}{killedCount > 0 ? ` · Kill ${killedCount}` : ''})
          </p>
        </div>

        {/* Stage Legend */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STAGES.map(s => (
            <div key={s.key} className={`text-xs px-3 py-1.5 rounded-lg border ${s.color}`}>
              S{s.num} {s.label}
            </div>
          ))}
          <div className="text-xs px-3 py-1.5 rounded-lg border border-mc-border bg-mc-bg-tertiary/30 text-mc-text-secondary">
            🚦 Gate = Go/Pivot/Kill
          </div>
        </div>

        {/* Pipeline Items */}
        <div className="space-y-3">
          {items.map(item => {
            const isOpen = selectedItem === item.id;
            const isKilled = item.gates.some(g => g.status === 'kill');
            return (
              <div key={item.id} className={`bg-mc-bg-secondary rounded-xl border border-mc-border overflow-hidden ${isKilled ? 'opacity-50' : ''}`}>
                {/* Item Header */}
                <button
                  onClick={() => setSelectedItem(isOpen ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-mc-bg-tertiary/30 transition-colors text-left"
                >
                  <span className="text-lg font-bold text-mc-text-secondary/50 w-8">{item.id}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {isKilled && <span className="text-red-400 mr-1">❌</span>}
                      {item.name}
                    </div>
                    <div className="text-xs text-mc-text-secondary mt-0.5">{item.reports.length}개 보고서</div>
                  </div>
                  {/* Stage + Gate Progress */}
                  <div className="hidden sm:flex items-center gap-0.5">
                    {STAGES.map((s, idx) => {
                      const gate = item.gates.find(g => g.gate === idx + 1);
                      const reached = s.num <= item.latestStage;
                      return (
                        <div key={s.key} className="flex items-center gap-0.5">
                          <div
                            className={`w-6 h-2 rounded-full ${reached ? s.barColor : 'bg-mc-bg-tertiary'}`}
                            title={`S${s.num} ${s.label}`}
                          />
                          {idx < STAGES.length - 1 && gate && gate.status !== 'pending' && (
                            <span className="text-[10px]" title={`G${gate.gate}: ${gate.status}`}>
                              {GATE_STATUS_DISPLAY[gate.status].icon}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-mc-text-secondary text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded: Stages + Gates */}
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-mc-border">
                    {/* Gate Status Row */}
                    {item.gates.length > 0 && item.gates.some(g => g.status !== 'pending') && (
                      <div className="flex flex-wrap gap-2 mt-4 mb-3">
                        {item.gates.filter(g => g.status !== 'pending').map(g => {
                          const display = GATE_STATUS_DISPLAY[g.status];
                          return (
                            <a
                              key={g.gate}
                              href={g.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-xs px-2.5 py-1 rounded-lg border ${display.color} transition-colors hover:opacity-80`}
                            >
                              🚦 G{g.gate} {display.icon} {display.label}
                            </a>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                      {STAGES.map(stage => {
                        const stageReports = item.reports.filter(r => r.stage === stage.key);
                        return (
                          <div key={stage.key} className={`rounded-lg border p-3 ${stage.color}`}>
                            <div className={`text-xs font-semibold mb-2 ${stage.accent}`}>
                              S{stage.num}: {stage.label.slice(2)} <span className="font-normal text-mc-text-secondary/50">— {stage.desc}</span>
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
