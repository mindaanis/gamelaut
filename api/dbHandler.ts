/**
 * Shared database API — used by the Netlify Function (netlify/functions/db.mts, storage =
 * Netlify Blobs, one blob per record) and by the local Express server (server.ts, storage =
 * CSV files in data/). The CSV files teachers download are always generated from the records.
 *
 * Routes (relative to /api/db):
 *   GET    /state                  → { avatars, games, multi }
 *   POST   /avatars                → upsert one avatar           body: AvatarRecord
 *   POST   /games                  → add game records            body: GameRecord[]
 *   POST   /multi                  → add multiplayer result rows body: MultiResultRow[]
 *   GET    /export/<file>.csv      → download avatars.csv / games.csv / multiplayer.csv
 * Teacher only (header x-teacher-password):
 *   DELETE /avatars/<id>           → delete avatar + its single-player games
 *   POST   /games/reset            → delete all single-player games (scores back to 0)
 *   POST   /import                 → merge { avatars, games, multi }
 *   DELETE /multi/player/<key>     → delete a player's multiplayer rows
 *   DELETE /multi/match/<id>       → delete a whole match
 *   POST   /multi/reset            → delete all multiplayer rows
 */
import {
  DB_FILES,
  AvatarRecord,
  GameRecord,
  avatarsToCSV,
  gamesToCSV,
  multiToCSV,
  sanitizeAvatar,
  sanitizeGame,
  sanitizeMultiRow
} from '../src/game/database.ts';
import type { MultiResultRow } from '../src/game/multiplayerLeaderboard.ts';
import { PRESET_TEACHER_PASSWORDS } from '../src/game/teacherAuth.ts';

export interface CollectionTypes {
  avatars: AvatarRecord;
  games: GameRecord;
  multi: MultiResultRow;
}
export type Collection = keyof CollectionTypes;

/** Unique key of a record inside its collection */
export const recordKey = {
  avatars: (a: AvatarRecord) => a.id,
  games: (g: GameRecord) => g.gameId,
  multi: (r: MultiResultRow) => `${r.matchId}::${r.playerKey}`
} satisfies { [C in Collection]: (r: CollectionTypes[C]) => string };

export interface RecordStorage {
  list<C extends Collection>(collection: C): Promise<CollectionTypes[C][]>;
  /** 'upsert' replaces an existing record with the same key, 'insert' keeps the existing one */
  put<C extends Collection>(collection: C, records: CollectionTypes[C][], mode: 'upsert' | 'insert'): Promise<void>;
  remove<C extends Collection>(collection: C, keys: string[]): Promise<void>;
}

export interface DbRequest {
  method: string;
  path: string; // e.g. "/state", "/avatars/AVT-1"
  body: unknown;
  teacherPassword: string | null;
  teacherPasswordEnv?: string;
}

export interface DbResponse {
  status: number;
  body: string;
  contentType: string;
  headers?: Record<string, string>;
}

const json = (status: number, data: unknown): DbResponse => ({
  status,
  body: JSON.stringify(data),
  contentType: 'application/json; charset=utf-8',
  headers: { 'cache-control': 'no-store' }
});

const MAX_BATCH = 500;

function isTeacher(req: DbRequest): boolean {
  const pwd = (req.teacherPassword || '').trim();
  if (!pwd) return false;
  if (req.teacherPasswordEnv && pwd === req.teacherPasswordEnv) return true;
  return PRESET_TEACHER_PASSWORDS.includes(pwd);
}

const asArray = (v: unknown) => (Array.isArray(v) ? v.slice(0, MAX_BATCH) : []);
const notNull = <T,>(v: T | null): v is T => v !== null;

export async function handleDbRequest(req: DbRequest, storage: RecordStorage): Promise<DbResponse> {
  const method = req.method.toUpperCase();
  const parts = req.path.split('/').filter(Boolean).map((p) => decodeURIComponent(p));

  try {
    // ── Public reads ──
    if (method === 'GET' && parts[0] === 'state') {
      const [avatars, games, multi] = await Promise.all([
        storage.list('avatars'),
        storage.list('games'),
        storage.list('multi')
      ]);
      return json(200, { avatars, games, multi });
    }

    if (method === 'GET' && parts[0] === 'export' && parts[1]) {
      let csv: string;
      if (parts[1] === DB_FILES.avatars) csv = avatarsToCSV(await storage.list('avatars'));
      else if (parts[1] === DB_FILES.games) csv = gamesToCSV(await storage.list('games'));
      else if (parts[1] === DB_FILES.multi) csv = multiToCSV(await storage.list('multi'));
      else return json(404, { error: 'File tidak ditemukan.' });
      return {
        status: 200,
        body: '﻿' + csv,
        contentType: 'text/csv; charset=utf-8',
        headers: { 'content-disposition': `attachment; filename="${parts[1]}"`, 'cache-control': 'no-store' }
      };
    }

    // ── Public writes (students' devices) — all idempotent ──
    if (method === 'POST' && parts.length === 1 && parts[0] === 'avatars') {
      const avatar = sanitizeAvatar(req.body);
      if (!avatar) return json(400, { error: 'Data avatar tidak valid.' });
      await storage.put('avatars', [avatar], 'upsert');
      return json(200, { ok: true });
    }

    if (method === 'POST' && parts.length === 1 && parts[0] === 'games') {
      const games = asArray(req.body).map(sanitizeGame).filter(notNull);
      if (games.length) await storage.put('games', games, 'insert');
      return json(200, { ok: true, received: games.length });
    }

    if (method === 'POST' && parts.length === 1 && parts[0] === 'multi') {
      const rows = asArray(req.body).map(sanitizeMultiRow).filter(notNull);
      if (rows.length) await storage.put('multi', rows, 'insert');
      return json(200, { ok: true, received: rows.length });
    }

    // ── Teacher-only management ──
    const teacherRoute =
      (method === 'DELETE' && (parts[0] === 'avatars' || parts[0] === 'multi')) ||
      (method === 'POST' && (parts[0] === 'import' || parts[1] === 'reset'));
    if (teacherRoute && !isTeacher(req)) {
      return json(401, { error: 'Kata sandi guru salah atau tidak dikirim.' });
    }

    if (method === 'DELETE' && parts[0] === 'avatars' && parts[1]) {
      const id = parts[1];
      const games = await storage.list('games');
      await storage.remove('games', games.filter((g) => g.avatarId === id).map(recordKey.games));
      await storage.remove('avatars', [id]);
      return json(200, { ok: true });
    }

    if (method === 'POST' && parts[0] === 'games' && parts[1] === 'reset') {
      await storage.remove('games', (await storage.list('games')).map(recordKey.games));
      return json(200, { ok: true });
    }

    if (method === 'POST' && parts[0] === 'import') {
      const body = (req.body || {}) as Record<string, unknown>;
      const avatars = asArray(body.avatars).map(sanitizeAvatar).filter(notNull);
      const games = asArray(body.games).map(sanitizeGame).filter(notNull);
      const multi = asArray(body.multi).map(sanitizeMultiRow).filter(notNull);
      if (avatars.length) await storage.put('avatars', avatars, 'upsert');
      if (games.length) await storage.put('games', games, 'insert');
      if (multi.length) await storage.put('multi', multi, 'insert');
      return json(200, { ok: true, avatars: avatars.length, games: games.length, multi: multi.length });
    }

    if (method === 'DELETE' && parts[0] === 'multi' && parts[1] === 'player' && parts[2]) {
      const key = parts[2];
      const rows = await storage.list('multi');
      await storage.remove('multi', rows.filter((r) => r.playerKey === key).map(recordKey.multi));
      return json(200, { ok: true });
    }

    if (method === 'DELETE' && parts[0] === 'multi' && parts[1] === 'match' && parts[2]) {
      const id = parts[2];
      const rows = await storage.list('multi');
      await storage.remove('multi', rows.filter((r) => r.matchId === id).map(recordKey.multi));
      return json(200, { ok: true });
    }

    if (method === 'POST' && parts[0] === 'multi' && parts[1] === 'reset') {
      await storage.remove('multi', (await storage.list('multi')).map(recordKey.multi));
      return json(200, { ok: true });
    }

    return json(404, { error: 'Endpoint tidak ditemukan.' });
  } catch (e: any) {
    return json(500, { error: e?.message || 'Terjadi kesalahan server.' });
  }
}
