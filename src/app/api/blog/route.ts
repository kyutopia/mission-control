import { NextResponse } from "next/server";

const GITHUB_ORG = process.env.GITHUB_ORG || 'kyutopia';
const BLOG_REPO = process.env.BLOG_REPO || 'blog';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 120_000; // 2 min

async function fetchBlogDrafts() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_ORG}/${BLOG_REPO}/contents/blog-drafts`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    }
  );

  if (!res.ok) return [];
  const files = await res.json();
  if (!Array.isArray(files)) return [];

  const posts = files
    .filter((f: any) => f.name.endsWith('.md'))
    .map((f: any) => {
      const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';
      const title = f.name
        .replace('.md', '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/-/g, ' ');

      return {
        id: f.sha.slice(0, 8),
        title,
        keyword: '',
        category: 'blog-draft',
        platform: 'tistory',
        url: f.html_url,
        downloadUrl: f.download_url,
        status: date && date > new Date().toISOString().slice(0, 10) ? 'scheduled' : 'draft',
        views: 0,
        clicks: 0,
        revenue: 0,
        published_at: date,
        created_at: date,
      };
    })
    .sort((a: any, b: any) => (b.published_at || '').localeCompare(a.published_at || ''));

  cache = { data: posts, ts: Date.now() };
  return posts;
}

export async function GET() {
  try {
    const posts = await fetchBlogDrafts();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("[Blog GET]", error);
    return NextResponse.json([], { status: 500 });
  }
}
