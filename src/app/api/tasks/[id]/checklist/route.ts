import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, run } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const items = queryAll(
    'SELECT * FROM checklist_items WHERE task_id = ? ORDER BY position ASC, created_at ASC',
    [params.id]
  );
  return NextResponse.json(items);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { content } = await req.json();
  const id = uuidv4();
  const maxPos = queryAll('SELECT MAX(position) as mp FROM checklist_items WHERE task_id = ?', [params.id]);
  const position = ((maxPos[0] as { mp: number })?.mp || 0) + 1;
  run(
    'INSERT INTO checklist_items (id, task_id, content, is_checked, position) VALUES (?, ?, ?, 0, ?)',
    [id, params.id, content, position]
  );
  return NextResponse.json({ id, task_id: params.id, content, is_checked: 0, position, created_at: new Date().toISOString() }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { itemId, is_checked } = await req.json();
  run('UPDATE checklist_items SET is_checked = ? WHERE id = ?', [is_checked ? 1 : 0, itemId]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { itemId } = await req.json();
  run('DELETE FROM checklist_items WHERE id = ?', [itemId]);
  return NextResponse.json({ ok: true });
}
