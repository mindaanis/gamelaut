/**
 * Browser client for the shared CSV database (/api/db).
 *
 * - Every change is applied locally first (so the UI updates instantly) and queued in an
 *   "outbox" in localStorage. The outbox is sent to the server and kept until it succeeds,
 *   so nothing is lost if a device is briefly offline.
 * - Server writes are idempotent, so resending an outbox entry never double counts.
 * - The last server state is cached locally so the leaderboard still shows when offline.
 */
import { DbOp, DbState, EMPTY_DB, applyDbOp, AvatarRecord, GameRecord } from './database.ts';
import type { MultiResultRow } from './multiplayerLeaderboard.ts';

const CACHE_KEY = 'pa_db_cache';
const OUTBOX_KEY = 'pa_db_outbox';
const API = '/api/db';

interface OutboxEntry {
  id: string;
  op: DbOp;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadCachedDb(): DbState | null {
  const cached = readJSON<DbState | null>(CACHE_KEY, null);
  return cached && Array.isArray(cached.avatars) ? { ...EMPTY_DB, ...cached } : null;
}

const loadOutbox = () => readJSON<OutboxEntry[]>(OUTBOX_KEY, []);
const saveOutbox = (entries: OutboxEntry[]) => writeJSON(OUTBOX_KEY, entries);

export function pendingCount(): number {
  return loadOutbox().length;
}

/** Server state + not-yet-sent local changes, i.e. what this device should display */
function withPending(server: DbState): DbState {
  return loadOutbox().reduce((s, e) => applyDbOp(s, e.op), server);
}

/** What to show before (or without) a server connection: last cached state + pending changes */
export function loadLocalDb(): DbState {
  return withPending(loadCachedDb() || EMPTY_DB);
}

async function request(method: string, path: string, body?: unknown, teacherPassword?: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(teacherPassword ? { 'x-teacher-password': teacherPassword } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store'
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : null;
    if (!res.ok) throw new Error(data?.error || `Server menjawab ${res.status}`);
    if (!isJson) throw new Error('Server database tidak tersedia.');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const opRequest = (op: DbOp): [string, unknown] =>
  op.kind === 'upsertAvatar' ? ['/avatars', op.avatar] : op.kind === 'addGames' ? ['/games', op.games] : ['/multi', op.rows];

let flushing: Promise<void> | null = null;

/** Sends queued changes in order; stops at the first failure and keeps the rest for later */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      while (true) {
        const [next] = loadOutbox();
        if (!next) break;
        const [path, body] = opRequest(next.op);
        await request('POST', path, body);
        saveOutbox(loadOutbox().filter((e) => e.id !== next.id));
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/**
 * Pushes pending changes, then downloads the latest shared database.
 * Returns the state to display (server + still-pending local changes).
 */
export async function syncDb(): Promise<DbState> {
  try {
    await flushOutbox();
  } catch {
    // Keep going: we can still read, unsent changes stay in the outbox
  }
  const server = (await request('GET', '/state')) as DbState;
  const state: DbState = { avatars: server.avatars || [], games: server.games || [], multi: server.multi || [] };
  writeJSON(CACHE_KEY, state);
  return withPending(state);
}

/** Applies a change locally, queues it for the server and starts sending it */
export function queueOp(current: DbState, op: DbOp): DbState {
  const entry: OutboxEntry = { id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, op };
  saveOutbox([...loadOutbox(), entry]);
  flushOutbox().catch(() => {});
  return applyDbOp(current, op);
}

export const upsertAvatarOp = (avatar: AvatarRecord): DbOp => ({ kind: 'upsertAvatar', avatar });
export const addGamesOp = (games: GameRecord[]): DbOp => ({ kind: 'addGames', games });
export const addMultiOp = (rows: MultiResultRow[]): DbOp => ({ kind: 'addMulti', rows });

/* ─────────────── Teacher-only actions (online only) ─────────────── */

export const teacherApi = {
  deleteAvatar: (pwd: string, id: string) => request('DELETE', `/avatars/${encodeURIComponent(id)}`, undefined, pwd),
  resetGames: (pwd: string) => request('POST', '/games/reset', {}, pwd),
  importData: (pwd: string, data: { avatars?: AvatarRecord[]; games?: GameRecord[]; multi?: MultiResultRow[] }) =>
    request('POST', '/import', data, pwd),
  deleteMultiPlayer: (pwd: string, key: string) => request('DELETE', `/multi/player/${encodeURIComponent(key)}`, undefined, pwd),
  deleteMultiMatch: (pwd: string, id: string) => request('DELETE', `/multi/match/${encodeURIComponent(id)}`, undefined, pwd),
  resetMulti: (pwd: string) => request('POST', '/multi/reset', {}, pwd)
};

export const exportUrl = (file: 'avatars.csv' | 'games.csv' | 'multiplayer.csv') => `${API}/export/${file}`;
