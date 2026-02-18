import crypto from 'crypto';

export interface GitHubEvent {
  id: string;
  type: string;
  action: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

const MAX_EVENTS = 100;
let events: GitHubEvent[] = [];
let eventId = 0;

type Subscriber = (event: GitHubEvent) => void;
const subscribers = new Set<Subscriber>();

export function getEvents(since?: number): GitHubEvent[] {
  if (since === undefined) return events.slice(-20);
  return events.filter(e => parseInt(e.id) > since);
}

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function addEvent(event: Omit<GitHubEvent, 'id'>): GitHubEvent {
  const e: GitHubEvent = { ...event, id: String(++eventId) };
  events.push(e);
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  subscribers.forEach(fn => fn(e));
  return e;
}

export function getEventCount() { return eventId; }
export function getBufferedCount() { return events.length; }

export function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!secret) return true;
  if (!signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function summarizeEvent(type: string, action: string, body: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'issues': {
      const issue = body.issue as Record<string, unknown>;
      return {
        number: issue?.number, title: issue?.title, state: issue?.state,
        user: (issue?.user as Record<string, unknown>)?.login,
        labels: (issue?.labels as Array<Record<string, unknown>>)?.map(l => l.name),
        url: issue?.html_url,
      };
    }
    case 'pull_request': {
      const pr = body.pull_request as Record<string, unknown>;
      return {
        number: pr?.number, title: pr?.title, state: pr?.state, merged: pr?.merged,
        user: (pr?.user as Record<string, unknown>)?.login, url: pr?.html_url,
      };
    }
    case 'push': {
      const commits = body.commits as Array<Record<string, unknown>>;
      return {
        ref: body.ref,
        commits: commits?.slice(0, 5).map(c => ({ message: (c.message as string)?.split('\n')[0], author: (c.author as Record<string, unknown>)?.name })),
        pusher: (body.pusher as Record<string, unknown>)?.name,
      };
    }
    case 'projects_v2_item':
      return { changes: body.changes, projectItem: body.projects_v2_item };
    default:
      return { raw: 'unsummarized' };
  }
}
