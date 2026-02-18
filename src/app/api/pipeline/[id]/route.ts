import { NextRequest, NextResponse } from "next/server";
import { run, queryOne } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (["name", "stage", "owner", "expected_revenue", "actual_revenue", "notes", "priority"].includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    run(`UPDATE pipeline SET ${updates.join(", ")} WHERE id = ?`, values);
    const item = queryOne("SELECT * FROM pipeline WHERE id = ?", [id]);
    return NextResponse.json(item);
  } catch (error) {
    console.error("[Pipeline PATCH]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    run("DELETE FROM pipeline WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Pipeline DELETE]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
