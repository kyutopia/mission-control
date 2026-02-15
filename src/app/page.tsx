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

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [agentsRes, tasksRes, eventsRes, blogRes, revenueRes] = await Promise.all([
          fetch('/api/agents?workspace_id=default'),
          fetch('/api/tasks?workspace_id=default'),
          fetch('/api/events?workspace_id=default&limit=20'),
          fetch('/api/blog'),
          fetch('/api/revenue'),
        ]);

        const agents = agentsRes.ok ? await agentsRes.json() : [];
        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];
        const blogs = blogRes.ok ? await blogRes.json() : [];
        const revenues = revenueRes.ok ? await revenueRes.json() : [];

        const now = new Date();
        const thisMonthRevenues = revenues.filter((r: { date: string }) => {
          const d = new Date(r.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        // Enhance events with task titles
        const taskMap = new Map(tasks.map((t: { id: string; title: string }) => [t.id, t.title]));
        const enhancedEvents = events.map((e: { task_id?: string; type: string; message: string }) => ({
          ...e,
          task_title: e.task_id ? taskMap.get(e.task_id) : undefined,
        }));

        setData({
          agents: Array.isArray(agents) ? agents : [],
          taskStats: {
            total: tasks.length,
            done: tasks.filter((t: { status: string }) => t.status === 'done').length,
            in_progress: tasks.filter((t: { status: string }) => t.status === 'in_progress').length,
            inbox: tasks.filter((t: { status: string }) => t.status === 'inbox' || t.status === 'assigned').length,
          },
          recentActivity: enhancedEvents.slice(0, 10),
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
    <div className="min-h-screen bg-mc-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🚀 KYUTOPIA Mission Control</h1>
          <p className="text-mc-text-secondary mt-1">CEO 대시보드</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
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

        <div className="grid grid-cols-3 gap-6">
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
              <Link href="/workspace/default" className="text-xs text-mc-accent hover:underline">칸반 보기</Link>
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
              {data.recentActivity.map(event => (
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
              {data.recentActivity.length === 0 && <p className="text-sm text-mc-text-secondary">활동 없음</p>}
            </div>
          </div>
        </div>

        {/* Bottom row: Blog + Revenue summaries */}
        <div className="grid grid-cols-2 gap-6 mt-6">
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
