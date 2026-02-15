"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Revenue {
  id: string;
  source: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  created_at: string;
}

const sourceColors: Record<string, string> = {
  adsense: "bg-mc-accent/20 text-mc-accent border-mc-accent/30",
  kmong: "bg-orange-600/20 text-orange-400 border-orange-600/30",
  project: "bg-mc-accent-purple/20 text-mc-accent-purple border-mc-accent-purple/30",
  other: "bg-mc-bg-tertiary text-mc-text-secondary border-mc-bg-tertiary",
};

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [period, setPeriod] = useState<string>("month");

  useEffect(() => {
    fetch("/api/revenue")
      .then((res) => res.json())
      .then((data) => { setRevenues(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-mc-text text-xl">Loading...</div>
      </div>
    );
  }

  const now = new Date();
  const filteredByPeriod = revenues.filter((r) => {
    const date = new Date(r.date);
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    } else if (period === "month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    } else if (period === "year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const filteredRevenues = filter === "all" ? filteredByPeriod : filteredByPeriod.filter((r) => r.source === filter);

  const totalRevenue = filteredByPeriod.reduce((sum, r) => sum + Number(r.amount), 0);
  const adsenseRevenue = filteredByPeriod.filter((r) => r.source === "adsense").reduce((sum, r) => sum + Number(r.amount), 0);
  const kmongRevenue = filteredByPeriod.filter((r) => r.source === "kmong").reduce((sum, r) => sum + Number(r.amount), 0);
  const projectRevenue = filteredByPeriod.filter((r) => r.source === "project").reduce((sum, r) => sum + Number(r.amount), 0);

  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split("T")[0];
  }).reverse();

  const dailyRevenue = last14Days.map((date) => ({
    date,
    adsense: revenues.filter((r) => r.date === date && r.source === "adsense").reduce((sum, r) => sum + Number(r.amount), 0),
    kmong: revenues.filter((r) => r.date === date && r.source === "kmong").reduce((sum, r) => sum + Number(r.amount), 0),
    project: revenues.filter((r) => r.date === date && r.source === "project").reduce((sum, r) => sum + Number(r.amount), 0),
  }));

  const maxDailyRevenue = Math.max(...dailyRevenue.map((d) => d.adsense + d.kmong + d.project), 1);

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-mc-text">💰 매출/수익 트래커</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: "week", label: "이번 주" },
          { id: "month", label: "이번 달" },
          { id: "year", label: "올해" },
          { id: "all", label: "전체" },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-lg text-sm ${
              period === p.id ? "bg-mc-accent text-white" : "bg-mc-bg-tertiary text-mc-text-secondary hover:bg-mc-bg-secondary"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-mc-accent-green/20 border border-mc-accent-green/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">₩{totalRevenue.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">총 매출</div>
        </div>
        <div className="bg-mc-accent/20 border border-mc-accent/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">₩{adsenseRevenue.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">AdSense</div>
        </div>
        <div className="bg-orange-600/20 border border-orange-600/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">₩{kmongRevenue.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">크몽</div>
        </div>
        <div className="bg-mc-accent-purple/20 border border-mc-accent-purple/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">₩{projectRevenue.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">프로젝트</div>
        </div>
      </div>

      <div className="bg-mc-bg-secondary rounded-lg p-6 mb-6 border border-mc-bg-tertiary">
        <h2 className="text-lg font-bold text-mc-text mb-4">📈 최근 14일 매출 추이</h2>
        <div className="flex items-end justify-between h-40 gap-1">
          {dailyRevenue.map((day, i) => {
            const total = day.adsense + day.kmong + day.project;
            const height = (total / maxDailyRevenue) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full relative" style={{ height: `${Math.max(height, 2)}%` }}>
                  <div className="absolute bottom-0 w-full bg-mc-accent rounded-t" style={{ height: `${(day.adsense / (total || 1)) * 100}%` }} />
                  <div className="absolute w-full bg-orange-600" style={{ bottom: `${(day.adsense / (total || 1)) * 100}%`, height: `${(day.kmong / (total || 1)) * 100}%` }} />
                  <div className="absolute w-full bg-mc-accent-purple rounded-t" style={{ bottom: `${((day.adsense + day.kmong) / (total || 1)) * 100}%`, height: `${(day.project / (total || 1)) * 100}%` }} />
                </div>
                <div className="text-mc-text-secondary text-xs mt-2 transform -rotate-45 origin-top-left">
                  {new Date(day.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-mc-accent rounded" /><span className="text-mc-text-secondary text-sm">AdSense</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-600 rounded" /><span className="text-mc-text-secondary text-sm">크몽</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-mc-accent-purple rounded" /><span className="text-mc-text-secondary text-sm">프로젝트</span></div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "adsense", "kmong", "project"].map((source) => (
          <button
            key={source}
            onClick={() => setFilter(source)}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === source ? "bg-mc-accent text-white" : "bg-mc-bg-tertiary text-mc-text-secondary hover:bg-mc-bg-secondary"
            }`}
          >
            {source === "all" ? "전체" : source}
          </button>
        ))}
      </div>

      <div className="bg-mc-bg-secondary rounded-lg overflow-x-auto border border-mc-bg-tertiary hidden md:block">
        <table className="w-full min-w-[500px]">
          <thead className="bg-mc-bg-tertiary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">날짜</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">소스</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">설명</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-mc-text-secondary">금액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mc-bg-tertiary">
            {filteredRevenues.map((rev) => (
              <tr key={rev.id} className="hover:bg-mc-bg-tertiary/50">
                <td className="px-4 py-3 text-mc-text-secondary">{new Date(rev.date).toLocaleDateString("ko-KR")}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs border ${sourceColors[rev.source] || sourceColors.other}`}>
                    {rev.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-mc-text-secondary">{rev.description || "-"}</td>
                <td className="px-4 py-3 text-right text-mc-accent-green font-medium">₩{Number(rev.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRevenues.length === 0 && (
          <div className="text-center py-8 text-mc-text-secondary">데이터가 없습니다.</div>
        )}
      </div>
      {/* Mobile Revenue List */}
      <div className="md:hidden space-y-2">
        {filteredRevenues.map((rev) => (
          <div key={rev.id} className="bg-mc-bg-secondary rounded-lg border border-mc-bg-tertiary p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={"px-2 py-0.5 rounded text-xs border " + (sourceColors[rev.source] || sourceColors.other)}>
                {rev.source}
              </span>
              <span className="text-mc-accent-green font-medium text-sm">₩{Number(rev.amount).toLocaleString()}</span>
            </div>
            <p className="text-xs text-mc-text-secondary">{rev.description || "-"}</p>
            <p className="text-xs text-mc-text-secondary/60 mt-1">{new Date(rev.date).toLocaleDateString("ko-KR")}</p>
          </div>
        ))}
        {filteredRevenues.length === 0 && (
          <div className="text-center py-8 text-mc-text-secondary">데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
