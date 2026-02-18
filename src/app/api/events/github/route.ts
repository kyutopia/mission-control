import { NextRequest } from 'next/server';
import { subscribe, getEvents } from '@/lib/github-events';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const recent = since ? getEvents(parseInt(since)) : getEvents();
      for (const event of recent) {
        controller.enqueue(encoder.encode(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
      }
      const unsubscribe = subscribe((event) => {
        try { controller.enqueue(encoder.encode(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)); }
        catch { unsubscribe(); }
      });
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); }
        catch { clearInterval(hb); unsubscribe(); }
      }, 30000);
      request.signal.addEventListener('abort', () => { clearInterval(hb); unsubscribe(); controller.close(); });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}

export const dynamic = 'force-dynamic';
