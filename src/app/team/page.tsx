"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Activity, CheckCircle, Clock } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar_emoji: string;
  status: string;
  is_master: number;
  active_tasks: number;
  completed_tasks: number;
  last_activity: string;
  last_activity_at: string;
}

const statusColors: Record<string, string> = {
  working: "bg-mc-accent-green/20 text-mc-accent-green border-mc-accent-green/30",
  standby: "bg-mc-accent-yellow/20 text-mc-accent-yellow border-mc-accent-yellow/30",
  offline: "bg-mc-bg-tertiary text-mc-text-secondary border-mc-border",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "N/A";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((data) => { setAgents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-mc-bg text-mc-text flex items-center justify-center">Loading...</div>;

  const working = agents.filter((a) => a.status === "working").length;
  const total = agents.length;

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-mc-text-secondary hover:text-mc-text"><ChevronLeft size={20} /></Link>
          <h1 className="text-2xl font-bold">👥 Team</h1>
          <span className="text-sm text-mc-text-secondary ml-2">{working}/{total} active</span>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-5 bg-gradient-to-br from-green-600/20 to-green-800/10 border border-green-500/20">
            <div className="text-mc-text-secondary text-xs mb-1">Active Agents</div>
            <div className="text-2xl font-bold text-mc-accent-green">{working}</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20">
            <div className="text-mc-text-secondary text-xs mb-1">In-Progress Tasks</div>
            <div className="text-2xl font-bold text-mc-accent">{agents.reduce((s, a) => s + (a.active_tasks || 0), 0)}</div>
          </div>
          <div className="rounded-xl p-5 bg-gradient-to-br from-amber-600/20 to-amber-800/10 border border-amber-500/20">
            <div className="text-mc-text-secondary text-xs mb-1">Completed Tasks</div>
            <div className="text-2xl font-bold">{agents.reduce((s, a) => s + (a.completed_tasks || 0), 0)}</div>
          </div>
        </div>

        {/* Agent cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-mc-bg-secondary border border-mc-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{agent.avatar_emoji}</span>
                  <div>
                    <div className="font-bold text-lg">{agent.name}</div>
                    <div className="text-sm text-mc-text-secondary">{agent.role}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[agent.status] || statusColors.offline}`}>
                  {agent.status}
                </span>
              </div>

              {agent.description && (
                <p className="text-sm text-mc-text-secondary mb-3 line-clamp-2">{agent.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="text-center bg-mc-bg rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-mc-accent mb-1"><Activity size={12} /></div>
                  <div className="text-sm font-semibold">{agent.active_tasks || 0}</div>
                  <div className="text-[10px] text-mc-text-secondary">Active</div>
                </div>
                <div className="text-center bg-mc-bg rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-mc-accent-green mb-1"><CheckCircle size={12} /></div>
                  <div className="text-sm font-semibold">{agent.completed_tasks || 0}</div>
                  <div className="text-[10px] text-mc-text-secondary">Done</div>
                </div>
                <div className="text-center bg-mc-bg rounded p-2">
                  <div className="flex items-center justify-center gap-1 text-mc-text-secondary mb-1"><Clock size={12} /></div>
                  <div className="text-sm font-semibold">{timeAgo(agent.last_activity_at)}</div>
                  <div className="text-[10px] text-mc-text-secondary">Last</div>
                </div>
              </div>

              {agent.last_activity && (
                <div className="text-xs text-mc-text-secondary bg-mc-bg rounded p-2 line-clamp-1">
                  💬 {agent.last_activity}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
