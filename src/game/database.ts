/**
 * Shared CSV database model (used by the browser AND by the server / Netlify Function).
 *
 * The database is 3 CSV files:
 *  - avatars.csv      → registered avatars (profile only)
 *  - games.csv        → one row per single-player game (the playing record)
 *  - multiplayer.csv  → one row per player per multiplayer match
 *
 * Leaderboard totals are always DERIVED from games.csv, so every write is an
 * idempotent "add row" (games/match rows have unique ids) and retries never double count.
 *
 * Pure module: no browser or Node APIs.
 */
import { parseCSVLine } from './logic.ts';
import {
  MultiResultRow,
  mergeMultiResults,
  exportMultiResultsToCSV,
  parseMultiResultsCSV
} from './multiplayerLeaderboard.ts';
import type { AvatarProfile, PlayerStatus } from '../types/game.ts';

export type AvatarColor = AvatarProfile['color'];

export interface AvatarRecord {
  id: string;
  name: string;
  emoji: string;
  color: AvatarColor;
  createdAt: string;
}

export interface GameRecord {
  gameId: string;
  avatarId: string;
  level: number; // 1-3, or 0 for totals migrated from the old per-device data
  score: number;
  pearls: number;
  correct: number;
  wrong: number;
  timeMs: number;
  status: PlayerStatus; // 'eliminated' games are kept as a record but do not count for ranking
  date: string;
}

export interface DbState {
  avatars: AvatarRecord[];
  games: GameRecord[];
  multi: MultiResultRow[];
}

export const EMPTY_DB: DbState = { avatars: [], games: [], multi: [] };

export const DB_FILES = {
  avatars: 'avatars.csv',
  games: 'games.csv',
  multi: 'multiplayer.csv'
} as const;
export type DbFileName = (typeof DB_FILES)[keyof typeof DB_FILES];

/* ─────────────── Operations (applied by the server, and optimistically by the client) ─────────────── */

export type DbOp =
  | { kind: 'upsertAvatar'; avatar: AvatarRecord }
  | { kind: 'addGames'; games: GameRecord[] }
  | { kind: 'addMulti'; rows: MultiResultRow[] };

export function upsertAvatars(existing: AvatarRecord[], incoming: AvatarRecord[]): AvatarRecord[] {
  const map = new Map(existing.map((a) => [a.id, a]));
  for (const a of incoming) {
    const prev = map.get(a.id);
    // Keep the original registration date when a profile is edited
    map.set(a.id, prev ? { ...a, createdAt: prev.createdAt || a.createdAt } : a);
  }
  return Array.from(map.values());
}

export function addGames(existing: GameRecord[], incoming: GameRecord[]): GameRecord[] {
  const seen = new Set(existing.map((g) => g.gameId));
  const out = [...existing];
  for (const g of incoming) {
    if (!seen.has(g.gameId)) {
      seen.add(g.gameId);
      out.push(g);
    }
  }
  return out;
}

export function applyDbOp(state: DbState, op: DbOp): DbState {
  switch (op.kind) {
    case 'upsertAvatar':
      return { ...state, avatars: upsertAvatars(state.avatars, [op.avatar]) };
    case 'addGames':
      return { ...state, games: addGames(state.games, op.games) };
    case 'addMulti':
      return { ...state, multi: mergeMultiResults(state.multi, op.rows) };
  }
}

/* ─────────────── Validation (server never trusts the client blindly) ─────────────── */

const COLORS: AvatarColor[] = ['blue', 'coral', 'gold', 'green', 'purple'];
const STATUSES: PlayerStatus[] = ['playing', 'finished', 'eliminated', 'left'];
const str = (v: unknown, max: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const int = (v: unknown, min = 0, max = 1_000_000_000) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : 0;
};
const isoDate = (v: unknown) => {
  const s = str(v, 40);
  return s && !Number.isNaN(Date.parse(s)) ? s : new Date().toISOString();
};

export function sanitizeAvatar(v: any): AvatarRecord | null {
  const id = str(v?.id, 80);
  const name = str(v?.name, 20);
  if (!id || !name) return null;
  return {
    id,
    name,
    emoji: str(v?.emoji, 8) || '🐠',
    color: COLORS.includes(v?.color) ? v.color : 'blue',
    createdAt: isoDate(v?.createdAt)
  };
}

export function sanitizeGame(v: any): GameRecord | null {
  const gameId = str(v?.gameId, 100);
  const avatarId = str(v?.avatarId, 80);
  if (!gameId || !avatarId) return null;
  return {
    gameId,
    avatarId,
    level: int(v?.level, 0, 3),
    score: int(v?.score, 0, 100_000_000),
    pearls: int(v?.pearls),
    correct: int(v?.correct),
    wrong: int(v?.wrong),
    timeMs: int(v?.timeMs),
    status: STATUSES.includes(v?.status) ? v.status : 'finished',
    date: isoDate(v?.date)
  };
}

export function sanitizeMultiRow(v: any): MultiResultRow | null {
  const matchId = str(v?.matchId, 100);
  const playerKey = str(v?.playerKey, 80);
  if (!matchId || !playerKey) return null;
  return {
    matchId,
    playerKey,
    name: str(v?.name, 20) || 'Pemain',
    avatar: str(v?.avatar, 8) || '🐠',
    level: int(v?.level, 1, 3) || 1,
    score: int(v?.score, 0, 100_000),
    correct: int(v?.correct),
    wrong: int(v?.wrong),
    pearls: int(v?.pearls),
    timeMs: int(v?.timeMs),
    status: STATUSES.includes(v?.status) ? v.status : 'finished',
    outcome: v?.outcome === 'menang' || v?.outcome === 'seri' ? v.outcome : 'kalah',
    opponentName: str(v?.opponentName, 20) || '-',
    date: isoDate(v?.date)
  };
}

/* ─────────────── Derived leaderboard profiles ─────────────── */

/** Builds the AvatarProfile list (with totals) used by the UI from avatars + game records. */
export function buildAvatarProfiles(avatars: AvatarRecord[], games: GameRecord[]): AvatarProfile[] {
  const byAvatar = new Map<string, GameRecord[]>();
  for (const g of games) {
    if (g.status === 'eliminated') continue; // game over is not ranked
    const list = byAvatar.get(g.avatarId) || [];
    list.push(g);
    byAvatar.set(g.avatarId, list);
  }

  return avatars.map((a) => {
    const list = byAvatar.get(a.id) || [];
    const zoneScores = { 1: 0, 2: 0, 3: 0 } as AvatarProfile['zoneScores'];
    const played = new Set<number>();
    let lastPlayed = a.createdAt;
    let totalScore = 0;
    let totalPearls = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    for (const g of list) {
      totalScore += g.score;
      totalPearls += g.pearls;
      totalCorrect += g.correct;
      totalWrong += g.wrong;
      if (g.level >= 1 && g.level <= 3) {
        const lvl = g.level as 1 | 2 | 3;
        played.add(lvl);
        zoneScores[lvl] = Math.max(zoneScores[lvl], g.score);
      }
      if (g.date > lastPlayed) lastPlayed = g.date;
    }
    return {
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      color: a.color,
      totalScore,
      totalPearls,
      totalCorrect,
      totalWrong,
      gamesPlayed: list.length,
      playedZones: Array.from(played).sort(),
      zoneScores,
      createdAt: a.createdAt,
      lastPlayed
    };
  });
}

/** Converts old per-device AvatarProfile data (with totals) into records for the shared DB. */
export function legacyProfilesToRecords(profiles: AvatarProfile[]): { avatars: AvatarRecord[]; games: GameRecord[] } {
  const avatars: AvatarRecord[] = [];
  const games: GameRecord[] = [];
  for (const p of profiles) {
    const avatar = sanitizeAvatar({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, createdAt: p.createdAt });
    if (!avatar) continue;
    avatars.push(avatar);
    if ((p.totalScore || 0) > 0 || (p.totalCorrect || 0) > 0 || (p.totalPearls || 0) > 0) {
      games.push({
        gameId: `legacy-${p.id}`,
        avatarId: p.id,
        level: 0,
        score: p.totalScore || 0,
        pearls: p.totalPearls || 0,
        correct: p.totalCorrect || 0,
        wrong: p.totalWrong || 0,
        timeMs: 0,
        status: 'finished',
        date: p.lastPlayed || p.createdAt || new Date().toISOString()
      });
    }
  }
  return { avatars, games };
}

/* ─────────────── CSV (de)serialization ─────────────── */

const esc = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function parseTable(text: string | null | undefined): { header: string[]; rows: string[][] } {
  const lines = (text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { header: [], rows: [] };
  return {
    header: parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase()),
    rows: lines.slice(1).map(parseCSVLine)
  };
}

export const AVATARS_CSV_HEADER = 'id,name,emoji,color,created_at';
export const GAMES_CSV_HEADER = 'game_id,avatar_id,level,score,pearls,correct,wrong,time_ms,status,date';

export function avatarsToCSV(avatars: AvatarRecord[]): string {
  return [AVATARS_CSV_HEADER, ...avatars.map((a) => [a.id, a.name, a.emoji, a.color, a.createdAt].map(esc).join(','))].join('\n');
}

export function avatarsFromCSV(text: string | null | undefined): AvatarRecord[] {
  const { header, rows } = parseTable(text);
  const at = (r: string[], k: string) => r[header.indexOf(k)];
  return rows
    .map((r) => sanitizeAvatar({ id: at(r, 'id'), name: at(r, 'name'), emoji: at(r, 'emoji'), color: at(r, 'color'), createdAt: at(r, 'created_at') }))
    .filter((a): a is AvatarRecord => !!a);
}

export function gamesToCSV(games: GameRecord[]): string {
  return [
    GAMES_CSV_HEADER,
    ...games.map((g) => [g.gameId, g.avatarId, g.level, g.score, g.pearls, g.correct, g.wrong, g.timeMs, g.status, g.date].map(esc).join(','))
  ].join('\n');
}

export function gamesFromCSV(text: string | null | undefined): GameRecord[] {
  const { header, rows } = parseTable(text);
  const at = (r: string[], k: string) => r[header.indexOf(k)];
  return rows
    .map((r) =>
      sanitizeGame({
        gameId: at(r, 'game_id'),
        avatarId: at(r, 'avatar_id'),
        level: at(r, 'level'),
        score: at(r, 'score'),
        pearls: at(r, 'pearls'),
        correct: at(r, 'correct'),
        wrong: at(r, 'wrong'),
        timeMs: at(r, 'time_ms'),
        status: at(r, 'status'),
        date: at(r, 'date')
      })
    )
    .filter((g): g is GameRecord => !!g);
}

export function multiToCSV(rows: MultiResultRow[]): string {
  return exportMultiResultsToCSV(rows);
}

export function multiFromCSV(text: string | null | undefined): MultiResultRow[] {
  if (!text || !text.trim()) return [];
  return parseMultiResultsCSV(text).rows;
}
