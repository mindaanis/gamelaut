import { parseCSVLine, determineMatchWinner } from './logic.ts';
import type { PlayerResult, PlayerStatus } from '../types/game.ts';

/**
 * Final verdict between two players ("a" is winner 1, "b" is winner 2).
 * A player who left the room before finishing loses; otherwise the 3-aspect score decides.
 */
export function resolveMatch(a: PlayerResult, b: PlayerResult): { winner: 1 | 2 | 0; message: string } {
  if (a.status === 'left' && b.status !== 'left') return { winner: 2, message: `${b.name} menang karena ${a.name} keluar dari permainan.` };
  if (b.status === 'left' && a.status !== 'left') return { winner: 1, message: `${a.name} menang karena ${b.name} keluar dari permainan.` };
  return determineMatchWinner(
    { name: a.name, score: a.score, correct: a.correct, timeMs: a.timeMs, finished: a.status === 'finished' },
    { name: b.name, score: b.score, correct: b.correct, timeMs: b.timeMs, finished: b.status === 'finished' }
  );
}

/**
 * Multiplayer event leaderboard (separate from the single-player avatar leaderboard).
 * Stored as one row per player per match, so a teacher can delete a single player,
 * a whole match, or reset everything — and CSV files from several devices can be merged.
 */

const STORAGE_KEY = 'pa_multi_leaderboard';

export type MatchOutcome = 'menang' | 'kalah' | 'seri';

export interface MultiResultRow {
  matchId: string;
  playerKey: string; // avatar id when known, otherwise the player name
  name: string;
  avatar: string;
  level: number;
  score: number;
  correct: number;
  wrong: number;
  pearls: number;
  timeMs: number;
  status: PlayerStatus;
  outcome: MatchOutcome;
  opponentName: string;
  date: string; // ISO
}

export interface MultiPlayerSummary {
  playerKey: string;
  name: string;
  avatar: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  bestScore: number;
  avgScore: number;
  totalCorrect: number;
  totalPearls: number;
  bestTimeMs: number | null; // fastest fully finished game
  lastPlayed: string;
}

export interface MultiMatchSummary {
  matchId: string;
  level: number;
  date: string;
  rows: MultiResultRow[];
}

export function loadMultiResults(): MultiResultRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMultiResults(rows: MultiResultRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {}
}

const rowId = (r: Pick<MultiResultRow, 'matchId' | 'playerKey'>) => `${r.matchId}::${r.playerKey}`;

/** Adds rows, skipping any (matchId, player) pair that is already stored. Returns the new list. */
export function mergeMultiResults(existing: MultiResultRow[], incoming: MultiResultRow[]): MultiResultRow[] {
  const seen = new Set(existing.map(rowId));
  const merged = [...existing];
  for (const r of incoming) {
    const id = rowId(r);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(r);
    }
  }
  return merged;
}

export function summarizePlayers(rows: MultiResultRow[]): MultiPlayerSummary[] {
  const map = new Map<string, MultiPlayerSummary & { _sum: number }>();
  for (const r of rows) {
    let s = map.get(r.playerKey);
    if (!s) {
      s = {
        playerKey: r.playerKey,
        name: r.name,
        avatar: r.avatar,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        bestScore: 0,
        avgScore: 0,
        totalCorrect: 0,
        totalPearls: 0,
        bestTimeMs: null,
        lastPlayed: r.date,
        _sum: 0
      };
      map.set(r.playerKey, s);
    }
    s.matches++;
    if (r.outcome === 'menang') s.wins++;
    else if (r.outcome === 'seri') s.draws++;
    else s.losses++;
    s._sum += r.score;
    s.bestScore = Math.max(s.bestScore, r.score);
    s.totalCorrect += r.correct;
    s.totalPearls += r.pearls;
    if (r.status === 'finished' && (s.bestTimeMs === null || r.timeMs < s.bestTimeMs)) s.bestTimeMs = r.timeMs;
    if (r.date > s.lastPlayed) {
      s.lastPlayed = r.date;
      // Keep the most recent name/emoji for the player
      s.name = r.name;
      s.avatar = r.avatar;
    }
  }

  return Array.from(map.values())
    .map(({ _sum, ...s }) => ({ ...s, avgScore: s.matches ? Math.round(_sum / s.matches) : 0 }))
    .sort(
      (a, b) =>
        b.bestScore - a.bestScore ||
        b.wins - a.wins ||
        b.avgScore - a.avgScore ||
        (a.bestTimeMs ?? Infinity) - (b.bestTimeMs ?? Infinity)
    );
}

export function summarizeMatches(rows: MultiResultRow[]): MultiMatchSummary[] {
  const map = new Map<string, MultiMatchSummary>();
  for (const r of rows) {
    let m = map.get(r.matchId);
    if (!m) {
      m = { matchId: r.matchId, level: r.level, date: r.date, rows: [] };
      map.set(r.matchId, m);
    }
    m.rows.push(r);
    if (r.date > m.date) m.date = r.date;
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ─────────────── CSV ─────────────── */

export const MULTI_CSV_HEADER =
  'match_id,player_key,name,avatar,level,score,correct,wrong,pearls,time_ms,status,outcome,opponent,date';

const esc = (v: string | number) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportMultiResultsToCSV(rows: MultiResultRow[]): string {
  const lines = rows.map((r) =>
    [r.matchId, r.playerKey, r.name, r.avatar, r.level, r.score, r.correct, r.wrong, r.pearls, r.timeMs, r.status, r.outcome, r.opponentName, r.date]
      .map(esc)
      .join(',')
  );
  return [MULTI_CSV_HEADER, ...lines].join('\n');
}

export function parseMultiResultsCSV(text: string): { rows: MultiResultRow[]; error?: string } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], error: 'File CSV kosong.' };
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  if (!header.includes('match_id') || !header.includes('player_key')) {
    return { rows: [], error: 'Format CSV tidak sesuai. Gunakan file hasil Export dari Peringkat Multiplayer.' };
  }
  const idx = (k: string) => header.indexOf(k);
  const num = (v: string | undefined) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const statuses: PlayerStatus[] = ['playing', 'finished', 'eliminated', 'left'];
  const outcomes: MatchOutcome[] = ['menang', 'kalah', 'seri'];

  const rows: MultiResultRow[] = [];
  for (const line of lines.slice(1)) {
    const c = parseCSVLine(line);
    const get = (k: string) => c[idx(k)];
    const matchId = get('match_id')?.trim();
    const playerKey = get('player_key')?.trim();
    if (!matchId || !playerKey) continue;
    const status = get('status') as PlayerStatus;
    const outcome = get('outcome') as MatchOutcome;
    rows.push({
      matchId,
      playerKey,
      name: get('name') || 'Pemain',
      avatar: get('avatar') || '🐠',
      level: num(get('level')) || 1,
      score: num(get('score')),
      correct: num(get('correct')),
      wrong: num(get('wrong')),
      pearls: num(get('pearls')),
      timeMs: num(get('time_ms')),
      status: statuses.includes(status) ? status : 'finished',
      outcome: outcomes.includes(outcome) ? outcome : 'kalah',
      opponentName: get('opponent') || '-',
      date: get('date') || new Date().toISOString()
    });
  }
  return { rows };
}
