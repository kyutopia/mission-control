import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export async function GET() {
  try {
    const agents = queryAll(`
      SELECT a.*,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id AND t.status = 'in_progress') as active_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_agent_id = a.id AND t.status = 'done') as completed_tasks,
        (SELECT message FROM events e WHERE e.agent_id = a.id ORDER BY e.created_at DESC LIMIT 1) as last_activity,
        (SELECT created_at FROM events e WHERE e.agent_id = a.id ORDER BY e.created_at DESC LIMIT 1) as last_activity_at
      FROM agents a
      ORDER BY a.is_master DESC, a.name
    `);
    return NextResponse.json(agents);
  } catch (error) {
    console.error("[Team GET]", error);
    return NextResponse.json([], { status: 500 });
  }
}
