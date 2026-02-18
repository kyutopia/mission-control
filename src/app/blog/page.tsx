"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  keyword: string;
  category: string;
  platform: string;
  url: string;
  status: string;
  views: number;
  clicks: number;
  revenue: number;
  published_at: string;
  created_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/blog")
      .then((res) => res.json())
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filteredPosts = filter === "all" ? posts : posts.filter((p) => p.status === filter);
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalClicks = posts.reduce((sum, p) => sum + (p.clicks || 0), 0);
  const totalRevenue = posts.reduce((sum, p) => sum + Number(p.revenue || 0), 0);
  const publishedCount = posts.filter((p) => p.status === "published").length;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split("T")[0];
  }).reverse();

  const dailyStats = last7Days.map((date) => ({
    date,
    count: posts.filter((p) => p.published_at && p.published_at.startsWith(date)).length,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-mc-text text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mc-bg p-3 sm:p-4 lg:p-6"><div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 hover:bg-mc-bg-tertiary rounded text-mc-text-secondary">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-mc-text">✍️ 블로그 발행 트래커</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <div className="bg-mc-accent/20 border border-mc-accent/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">{publishedCount}</div>
          <div className="text-mc-text-secondary text-sm">발행된 글</div>
        </div>
        <div className="bg-mc-accent-green/20 border border-mc-accent-green/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">{totalViews.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">총 조회수</div>
        </div>
        <div className="bg-mc-accent-yellow/20 border border-mc-accent-yellow/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">{totalClicks.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">총 클릭수</div>
        </div>
        <div className="bg-mc-accent-cyan/20 border border-mc-accent-cyan/30 p-5 rounded-lg text-center">
          <div className="text-3xl font-bold text-mc-text">₩{totalRevenue.toLocaleString()}</div>
          <div className="text-mc-text-secondary text-sm">예상 수익</div>
        </div>
      </div>

      <div className="bg-mc-bg-secondary rounded-xl p-4 sm:p-6 mb-6 border border-mc-bg-tertiary">
        <h2 className="text-lg font-bold text-mc-text mb-4">📅 최근 7일 발행 현황</h2>
        <div className="flex items-end justify-between h-32 gap-2">
          {dailyStats.map((stat, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-mc-accent rounded-t transition-all"
                style={{ height: `${Math.max(stat.count * 30, 4)}px` }}
              />
              <div className="text-mc-text-secondary text-xs mt-2">
                {new Date(stat.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
              </div>
              <div className="text-mc-text text-sm font-medium">{stat.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["all", "published", "draft", "scheduled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === status
                ? "bg-mc-accent text-white"
                : "bg-mc-bg-tertiary text-mc-text-secondary hover:bg-mc-bg-secondary"
            }`}
          >
            {status === "all" ? "전체" : status === "published" ? "발행됨" : status === "draft" ? "임시저장" : "예약"}
          </button>
        ))}
      </div>

      <div className="bg-mc-bg-secondary rounded-xl overflow-x-auto border border-mc-bg-tertiary hidden md:block">
        <table className="w-full min-w-[600px]">
          <thead className="bg-mc-bg-tertiary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">제목</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">키워드</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-mc-text-secondary">카테고리</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-mc-text-secondary">상태</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-mc-text-secondary">조회수</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-mc-text-secondary">발행일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mc-bg-tertiary">
            {filteredPosts.map((post) => (
              <tr key={post.id} className="hover:bg-mc-bg-tertiary/50">
                <td className="px-4 py-3">
                  {post.url ? (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-mc-accent hover:underline">
                      {post.title}
                    </a>
                  ) : (
                    <span className="text-mc-text">{post.title}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-mc-text-secondary text-sm">{post.keyword || "-"}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-lg text-xs bg-mc-bg-tertiary text-mc-text-secondary">
                    {post.category || "미분류"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs ${
                      post.status === "published"
                        ? "bg-mc-accent-green/20 text-mc-accent-green"
                        : post.status === "scheduled"
                        ? "bg-mc-accent-yellow/20 text-mc-accent-yellow"
                        : "bg-mc-bg-tertiary text-mc-text-secondary"
                    }`}
                  >
                    {post.status === "published" ? "발행" : post.status === "scheduled" ? "예약" : "임시"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-mc-text-secondary">{(post.views || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-mc-text-secondary text-sm">
                  {post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPosts.length === 0 && (
          <div className="text-center py-8 text-mc-text-secondary">게시글이 없습니다.</div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filteredPosts.map((post) => (
          <div key={post.id} className="bg-mc-bg-secondary rounded-xl border border-mc-bg-tertiary p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium flex-1">
                {post.url ? (
                  <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-mc-accent hover:underline">
                    {post.title}
                  </a>
                ) : (
                  post.title
                )}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${
                post.status === "published" ? "bg-mc-accent-green/20 text-mc-accent-green"
                : post.status === "scheduled" ? "bg-mc-accent-yellow/20 text-mc-accent-yellow"
                : "bg-mc-bg-tertiary text-mc-text-secondary"
              }`}>
                {post.status === "published" ? "발행" : post.status === "scheduled" ? "예약" : "임시"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-mc-text-secondary">
              {post.keyword && <span>🔑 {post.keyword}</span>}
              <span>👁 {(post.views || 0).toLocaleString()}</span>
              {post.published_at && <span>{new Date(post.published_at).toLocaleDateString("ko-KR")}</span>}
            </div>
          </div>
        ))}
        {filteredPosts.length === 0 && (
          <div className="text-center py-8 text-mc-text-secondary">게시글이 없습니다.</div>
        )}
      </div>
    </div></div>
  );
}
