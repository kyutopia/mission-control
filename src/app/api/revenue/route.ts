import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { queryAll, run } from "@/lib/db";

export async function GET() {
  try {
    const revenues = queryAll("SELECT * FROM revenues ORDER BY date DESC");
    return NextResponse.json(revenues);
  } catch (error) {
    console.error("Error fetching revenues:", error);
    return NextResponse.json({ error: "Failed to fetch revenues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = uuidv4();
    run(
      `INSERT INTO revenues (id, source, amount, currency, description, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, body.source, body.amount, body.currency || "KRW", body.description || null, body.date]
    );
    return NextResponse.json({ id, ...body }, { status: 201 });
  } catch (error) {
    console.error("Error creating revenue:", error);
    return NextResponse.json({ error: "Failed to create revenue" }, { status: 500 });
  }
}
