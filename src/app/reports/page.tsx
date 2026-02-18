"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Calendar, Search, User } from "lucide-react";

interface Report {
  id: string;
  date: string;
  agent_id: string;
  agent_name: string;
  content: string;
  summary: string;
  submitted_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (agentFilter) params.set("agent_id", agentFilter);

    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then((data) => { setReports(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dateFilter, agentFilter]);

  const filteredReports = search
    ? reports.filter((r) => r.content.toLowerCase().includes(search.toLowerCase()) || r.agent_name?.toLowerCase().includes(search.toLowerCase()))
    : reports;

  const uniqueDates = Array.from(new Set(reports.map((r) => r.date))).sort().reverse();
  const uniqueAgents = Array.from(new Set(reports.map((r) => r.agent_name).filter(Boolean)));

  if (loading) return <div className="min-h-screen bg-mc-bg text-mc-text flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-mc-text-secondary hover:text-mc-text"><ChevronLeft size={20} /></Link>
          <h1 className="text-2xl font-bold">📋 Daily Reports</h1>
          <span className="text-sm text-mc-text-secondary ml-2">{reports.length} reports</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mc-text-secondary" />
            <input
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-mc-bg-secondary border border-mc-border rounded-xl pl-9 pr-3 py-2 text-sm text-mc-text"
            />
          </div>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mc-text-secondary" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-mc-bg-secondary border border-mc-border rounded-xl pl-9 pr-3 py-2 text-sm text-mc-text"
            />
          </div>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="bg-mc-bg-secondary border border-mc-border rounded-xl px-3 py-2 text-sm text-mc-text"
          >
            <option value="">All agents</option>
            {uniqueAgents.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Reports list */}
        {filteredReports.length === 0 ? (
          <div className="text-center text-mc-text-secondary py-12">
            {reports.length === 0 ? "No reports yet" : "No reports match your filters"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className="bg-mc-bg-secondary border border-mc-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-mc-accent/20 text-mc-accent px-2 py-1 rounded-lg">
                      📅 {report.date}
                    </span>
                    {report.agent_name && (
                      <span className="text-xs text-mc-text-secondary flex items-center gap-1">
                        <User size={12} /> {report.agent_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-mc-text-secondary">
                    {new Date(report.submitted_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {report.summary && (
                  <div className="text-sm font-medium text-mc-accent-green mb-2">📌 {report.summary}</div>
                )}

                <div className="text-sm text-mc-text-secondary whitespace-pre-wrap leading-relaxed">
                  {report.content.length > 500 ? report.content.slice(0, 500) + "..." : report.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Date sidebar */}
        {uniqueDates.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-mc-text-secondary mb-3">📅 Report Dates</h3>
            <div className="flex flex-wrap gap-2">
              {uniqueDates.slice(0, 30).map((date) => (
                <button
                  key={date}
                  onClick={() => setDateFilter(dateFilter === date ? "" : date)}
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    dateFilter === date
                      ? "bg-mc-accent/20 text-mc-accent border-mc-accent/30"
                      : "bg-mc-bg-secondary text-mc-text-secondary border-mc-border hover:border-mc-accent/30"
                  }`}
                >
                  {date}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
