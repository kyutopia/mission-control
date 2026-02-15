import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, run } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const comments = queryAll(
    'SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC',
    [params.id]
  );
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { author, content } = await req.json();
  const id = uuidv4();
  run(
    'INSERT INTO task_comments (id, task_id, author, content) VALUES (?, ?, ?, ?)',
    [id, params.id, author, content]
  );
  return NextResponse.json({ id, task_id: params.id, author, content, created_at: new Date().toISOString() }, { status: 201 });
}
