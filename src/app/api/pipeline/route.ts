import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { queryAll, run, queryOne } from "@/lib/db";

export async function GET() {
  try {
    const items = queryAll("SELECT * FROM pipeline ORDER BY stage, priority DESC, created_at DESC");
    return NextResponse.json(items);
  } catch (error) {
    console.error("[Pipeline GET]", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = uuidv4();
    const { name, stage = "discovery", owner, expected_revenue = 0, notes, priority = "normal" } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    run(
      `INSERT INTO pipeline (id, name, stage, owner, expected_revenue, notes, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, stage, owner, expected_revenue, notes, priority]
    );

    const item = queryOne("SELECT * FROM pipeline WHERE id = ?", [id]);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[Pipeline POST]", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
