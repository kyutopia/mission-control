'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Settings, ChevronLeft, LayoutGrid } from 'lucide-react';
import { useMissionControl } from '@/lib/store';
import { format } from 'date-fns';
import type { Workspace } from '@/lib/types';

interface HeaderProps {
  workspace?: Workspace;
}

export function Header({ workspace }: HeaderProps) {
  const router = useRouter();
  const { agents, tasks, isOnline } = useMissionControl();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSubAgents, setActiveSubAgents] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSubAgentCount = async () => {
      try {
        const res = await fetch('/api/openclaw/sessions?session_type=subagent&status=active');
        if (res.ok) {
          const sessions = await res.json();
          setActiveSubAgents(sessions.length);
        }
      } catch (error) {
        console.error('Failed to load sub-agent count:', error);
      }
    };
    loadSubAgentCount();
    const interval = setInterval(loadSubAgentCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const workingAgents = agents.filter((a) => a.status === 'working').length;
  const activeAgents = workingAgents + activeSubAgents;
  const tasksInQueue = tasks.filter((t) => t.status !== 'done' && t.status !== 'review').length;

  return (
    <header className="h-14 bg-mc-bg-secondary border-b border-mc-border flex items-center justify-between px-4 overflow-hidden">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-mc-accent" />
          <span className="font-semibold text-mc-text uppercase tracking-wider text-sm hidden md:inline">
            KYUTOPIA Mission Control
          </span>
        </div>

        {workspace ? (
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden md:flex items-center gap-1 text-mc-text-secondary hover:text-mc-accent transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <LayoutGrid className="w-4 h-4" />
            </Link>
            <span className="text-mc-text-secondary hidden md:inline">/</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-mc-bg-tertiary rounded">
              <span className="text-lg">{workspace.icon}</span>
              <span className="font-medium truncate max-w-[120px] md:max-w-none">{workspace.name}</span>
            </div>
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-2 px-3 py-1 bg-mc-bg-tertiary rounded hover:bg-mc-bg transition-colors">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm">대시보드</span>
          </Link>
        )}
      </div>

      {workspace && (
        <div className="hidden md:flex items-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-mc-accent">{activeAgents}</div>
            <div className="text-xs text-mc-text-secondary uppercase">에이전트</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-mc-accent-purple">{tasksInQueue}</div>
            <div className="text-xs text-mc-text-secondary uppercase">태스크</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/blog" className="hidden md:block p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary hover:text-mc-accent transition-colors" title="블로그 트래커">
          <span className="text-lg">📝</span>
        </Link>
        <Link href="/revenue" className="hidden md:block p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary hover:text-mc-accent transition-colors" title="매출 대시보드">
          <span className="text-lg">💰</span>
        </Link>
        <span className="hidden md:inline text-mc-text-secondary text-sm font-mono">
          {format(currentTime, 'HH:mm:ss')}
        </span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded border text-sm font-medium ${
          isOnline ? 'bg-mc-accent-green/20 border-mc-accent-green text-mc-accent-green' : 'bg-mc-accent-red/20 border-mc-accent-red text-mc-accent-red'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-mc-accent-green animate-pulse' : 'bg-mc-accent-red'}`} />
          {isOnline ? '연결됨' : '오프라인'}
        </div>
        <button onClick={() => router.push('/settings')} className="p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary" title="설정">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
