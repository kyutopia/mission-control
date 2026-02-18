import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { queryAll, run } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const agent = searchParams.get("agent_id");
    const limit = parseInt(searchParams.get("limit") || "30");

    let query = "SELECT * FROM daily_reports WHERE 1=1";
    const params: any[] = [];

    if (date) {
      query += " AND date = ?";
      params.push(date);
    }
    if (agent) {
      query += " AND agent_id = ?";
      params.push(agent);
    }

    query += " ORDER BY date DESC, submitted_at DESC LIMIT ?";
    params.push(limit);

    const reports = queryAll(query, params);
    return NextResponse.json(reports);
  } catch (error) {
    console.error("[Reports GET]", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const { date, agent_id, agent_name, content, summary } = body;

    if (!date || !content) {
      return NextResponse.json({ error: "date and content required" }, { status: 400 });
    }

    run(
      `INSERT INTO daily_reports (id, date, agent_id, agent_name, content, summary) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, date, agent_id, agent_name, content, summary]
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[Reports POST]", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
