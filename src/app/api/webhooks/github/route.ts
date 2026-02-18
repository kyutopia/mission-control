import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, summarizeEvent, addEvent, getEvents, getEventCount, getBufferedCount } from '@/lib/github-events';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const eventType = request.headers.get('x-github-event') || 'unknown';
  const deliveryId = request.headers.get('x-github-delivery') || 'unknown';

  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
    console.error(`[webhook] HMAC failed: ${deliveryId}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (eventType === 'ping') {
    return NextResponse.json({ ok: true, message: 'pong' });
  }

  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const action = (body.action as string) || '';
  const summary = summarizeEvent(eventType, action, body);
  const event = addEvent({ type: eventType, action, payload: summary, receivedAt: new Date().toISOString() });

  console.log(`[webhook] ${eventType}.${action} #${deliveryId} → event #${event.id}`);
  return NextResponse.json({ ok: true, eventId: event.id });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  return NextResponse.json({
    status: 'active',
    totalReceived: getEventCount(),
    buffered: getBufferedCount(),
    events: since ? getEvents(parseInt(since)) : getEvents(),
  });
}
