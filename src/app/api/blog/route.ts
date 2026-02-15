import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { queryAll, run } from "@/lib/db";

export async function GET() {
  try {
    const posts = queryAll("SELECT * FROM blog_posts ORDER BY created_at DESC");
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = uuidv4();
    run(
      `INSERT INTO blog_posts (id, title, keyword, category, platform, url, status, views, clicks, revenue, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, body.title, body.keyword || null, body.category || null, body.platform || "blog",
       body.url || null, body.status || "draft", body.views || 0, body.clicks || 0,
       body.revenue || 0, body.published_at || null]
    );
    return NextResponse.json({ id, ...body }, { status: 201 });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return NextResponse.json({ error: "Failed to create blog post" }, { status: 500 });
  }
}
