'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  agents: { id: string; name: string; avatar_emoji: string; status: string }[];
  taskStats: { total: number; done: number; in_progress: number; inbox: number };
  recentActivity: { id: string; type: string; message: string; created_at: string; task_title?: string }[];
  blogStats: { total: number; published: number; totalViews: number; totalRevenue: number };
  revenueStats: { total: number; thisMonth: number };
}

export default function CEODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<{id:string;type:string;message:string;created_at:string;task_title?:string}[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [agentsRes, boardRes, blogRes, revenueRes] = await Promise.all([
          fetch('/api/agents?workspace_id=default'),
          fetch('/api/github?type=board'),
          fetch('/api/blog'),
          fetch('/api/revenue'),
        ]);

        const agents = agentsRes.ok ? await agentsRes.json() : [];
        const board = boardRes.ok ? await boardRes.json() : { columns: {}, totalItems: 0 };
        const blogs = blogRes.ok ? await blogRes.json() : [];
        const revenues = revenueRes.ok ? await revenueRes.json() : [];

        // GitHub board columns to task stats
        const todoCards = board.columns['Todo'] || [];
        const inProgressCards = board.columns['In Progress'] || [];
        const doneCards = board.columns['Done'] || [];

        const now = new Date();
        const thisMonthRevenues = revenues.filter((r: { date: string }) => {
          const d = new Date(r.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        // Build recent activity from GitHub issues (most recently updated)
        const allCards = [...todoCards, ...inProgressCards, ...doneCards]
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10);
        const githubActivity = allCards.map((c: any) => ({
          id: c.id,
          type: c.state === 'CLOSED' ? 'task_completed' : 'task_created',
          message: c.title,
          created_at: c.updatedAt,
          task_title: c.title,
        }));

        setData({
          agents: Array.isArray(agents) ? agents : [],
          taskStats: {
            total: board.totalItems || 0,
            done: doneCards.length,
            in_progress: inProgressCards.length,
            inbox: todoCards.length,
          },
          recentActivity: githubActivity,
          blogStats: {
            total: blogs.length,
            published: blogs.filter((b: { status: string }) => b.status === 'published').length,
            totalViews: blogs.reduce((s: number, b: { views: number }) => s + (b.views || 0), 0),
            totalRevenue: blogs.reduce((s: number, b: { revenue: number }) => s + Number(b.revenue || 0), 0),
          },
          revenueStats: {
            total: revenues.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0),
            thisMonth: thisMonthRevenues.reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0),
          },
        });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // SSE real-time events
  useEffect(() => {
    const es = new EventSource("/api/events/github");
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data);
        const mapped = {
          id: "live-" + evt.id,
          type: evt.type === "push" ? "push" : evt.type === "issues" ? (evt.action === "closed" ? "task_completed" : evt.action === "opened" ? "task_created" : "task_status_changed") : evt.type,
          message: evt.payload?.title || evt.payload?.commits?.[0]?.message || evt.type + "." + evt.action,
          created_at: evt.receivedAt,
          task_title: evt.payload?.title || evt.payload?.commits?.[0]?.message,
        };
        setLiveEvents(prev => [mapped, ...prev].slice(0, 20));
      } catch {}
    };
    es.onerror = () => { setTimeout(() => es.close(), 5000); };
    return () => es.close();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-mc-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🚀</div>
          <p className="text-mc-text-secondary">로딩중...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-mc-text-secondary">데이터를 불러올 수 없습니다.</div>;

  const completionRate = data.taskStats.total > 0 ? Math.round((data.taskStats.done / data.taskStats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🚀 KYUTOPIA Mission Control</h1>
          <p className="text-mc-text-secondary mt-1">CEO 대시보드</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20">
            <div className="text-3xl font-bold">{completionRate}%</div>
            <div className="text-sm text-mc-text-secondary mt-1">완료율</div>
            <div className="text-xs text-mc-text-secondary mt-2">{data.taskStats.done}/{data.taskStats.total} 태스크</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/20">
            <div className="text-3xl font-bold">{data.taskStats.in_progress}</div>
            <div className="text-sm text-mc-text-secondary mt-1">진행중</div>
            <div className="text-xs text-mc-text-secondary mt-2">{data.taskStats.inbox} 대기중</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/20">
            <div className="text-3xl font-bold">{data.blogStats.published}</div>
            <div className="text-sm text-mc-text-secondary mt-1">블로그 발행</div>
            <div className="text-xs text-mc-text-secondary mt-2">{data.blogStats.totalViews.toLocaleString()} 조회</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-500/20">
            <div className="text-3xl font-bold">₩{data.revenueStats.thisMonth.toLocaleString()}</div>
            <div className="text-sm text-mc-text-secondary mt-1">이번달 매출</div>
            <div className="text-xs text-mc-text-secondary mt-2">총 ₩{data.revenueStats.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Agent Status */}
          <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">👥 에이전트 상태</h2>
              <Link href="/settings" className="text-xs text-mc-accent hover:underline">더보기</Link>
            </div>
            <div className="space-y-3">
              {data.agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg bg-mc-bg/50">
                  <span className="text-xl">{agent.avatar_emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{agent.name}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    agent.status === 'working' ? 'bg-green-500/20 text-green-400' :
                    agent.status === 'standby' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {agent.status === 'working' ? '작업중' : agent.status === 'standby' ? '대기' : '오프라인'}
                  </span>
                </div>
              ))}
              {data.agents.length === 0 && <p className="text-sm text-mc-text-secondary">에이전트 없음</p>}
            </div>
          </div>

          {/* Task Overview */}
          <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">📋 태스크 현황</h2>
              <Link href="/kanban" className="text-xs text-mc-accent hover:underline">칸반 보기</Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-mc-text-secondary">전체</span>
                <span className="font-bold">{data.taskStats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-mc-text-secondary">✅ 완료</span>
                <span className="font-bold text-green-400">{data.taskStats.done}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-mc-text-secondary">🔨 진행중</span>
                <span className="font-bold text-blue-400">{data.taskStats.in_progress}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-mc-text-secondary">📥 대기</span>
                <span className="font-bold text-yellow-400">{data.taskStats.inbox}</span>
              </div>
              {data.taskStats.total > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-mc-bg-tertiary rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-5">
            <h2 className="font-semibold mb-4">⚡ 최근 활동</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...liveEvents, ...data.recentActivity].slice(0, 15).map(event => (
                <div key={event.id} className="text-sm py-2 border-b border-mc-border/30 last:border-0">
                  <div className="text-mc-text">
                    {event.type === 'task_created' && event.task_title
                      ? `⚡ 태스크 생성: ${event.task_title}`
                      : event.type === 'task_completed' && event.task_title
                      ? `✅ 완료: ${event.task_title}`
                      : event.type === 'task_status_changed' && event.task_title
                      ? `📋 상태 변경: ${event.task_title}`
                      : event.message}
                  </div>
                  <div className="text-xs text-mc-text-secondary mt-0.5">
                    {new Date(event.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              ))}
              {data.recentActivity.length === 0 && liveEvents.length === 0 && <p className="text-sm text-mc-text-secondary">활동 없음</p>}
            </div>
          </div>
        </div>

        {/* Bottom row: Blog + Revenue summaries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
          <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">📝 블로그 성과</h2>
              <Link href="/blog" className="text-xs text-mc-accent hover:underline">상세보기</Link>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.blogStats.published}</div>
                <div className="text-xs text-mc-text-secondary">발행</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.blogStats.totalViews.toLocaleString()}</div>
                <div className="text-xs text-mc-text-secondary">조회수</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">₩{data.blogStats.totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-mc-text-secondary">수익</div>
              </div>
            </div>
          </div>

          <div className="bg-mc-bg-secondary rounded-xl border border-mc-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">💰 매출</h2>
              <Link href="/revenue" className="text-xs text-mc-accent hover:underline">상세보기</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">₩{data.revenueStats.thisMonth.toLocaleString()}</div>
                <div className="text-xs text-mc-text-secondary">이번달</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">₩{data.revenueStats.total.toLocaleString()}</div>
                <div className="text-xs text-mc-text-secondary">누적</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
