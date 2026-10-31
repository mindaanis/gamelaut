/**
 * Pure logic and helpers for Petualangan Pecahan Bawah Laut
 */
import type { ScoreBreakdown } from '../types/game.ts';

export interface Question {
  id: string;
  level: number; // 1, 2, or 3
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface PlayerScoreRecord {
  id?: string;
  avatarId?: string;
  name: string;
  avatar: string;
  color?: string;
  level?: number;
  score: number;
  pearls?: number;
  correct?: number;
  wrong?: number;
  zone1Score?: number;
  zone2Score?: number;
  zone3Score?: number;
  date: string;
  registeredAt?: string;
}

export const QUESTION_CSV_HEADER = 'id,level,question,optionA,optionB,optionC,optionD,answer,explanation';
export const USER_DB_CSV_HEADER = 'id,name,avatar,color,level,score,pearls,correct,wrong,zone1_score,zone2_score,zone3_score,date,registered_at';

export function calculateScore(level: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  if (level === 1) return 10;
  if (level === 2) return 20;
  if (level === 3) return 30;
  return 10;
}

/* ═══════════════════════════════════════════════
   FAIR 3-ASPECT SCORING (max 1000 points per game)
   - Correct answers : 500 (50%)  → the main skill being tested
   - Pearls collected: 200 (20%)  → exploration bonus
   - Time            : 300 (30%)  → only for players who answer ALL questions,
                                    and multiplied by accuracy so rushing with
                                    wrong answers is not rewarded
   ═══════════════════════════════════════════════ */
export const SCORE_WEIGHTS = { correct: 500, pearls: 200, time: 300 } as const;
export const MAX_GAME_SCORE = SCORE_WEIGHTS.correct + SCORE_WEIGHTS.pearls + SCORE_WEIGHTS.time;

// Time par per question: at or under FAST → full time bonus, at or over SLOW → no time bonus
export const TIME_PAR_SECONDS = { fastPerQuestion: 30, slowPerQuestion: 120 } as const;

function correctPoints(correct: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((Math.min(correct, target) / target) * SCORE_WEIGHTS.correct);
}

function pearlPoints(pearls: number, totalPearls: number): number {
  if (totalPearls <= 0) return 0;
  return Math.round((Math.min(pearls, totalPearls) / totalPearls) * SCORE_WEIGHTS.pearls);
}

/** 1 = finished at/under the fast par, 0 = at/over the slow par (linear in between) */
export function calculateSpeedRatio(timeMs: number, target: number): number {
  const fast = TIME_PAR_SECONDS.fastPerQuestion * target;
  const slow = TIME_PAR_SECONDS.slowPerQuestion * target;
  const seconds = timeMs / 1000;
  if (slow <= fast) return 0;
  return Math.max(0, Math.min(1, (slow - seconds) / (slow - fast)));
}

/** Score shown while playing (time bonus is only added at the end) */
export function calculateLiveScore(correct: number, target: number, pearls: number, totalPearls: number): number {
  return correctPoints(correct, target) + pearlPoints(pearls, totalPearls);
}

export function calculateFinalScore(params: {
  correct: number;
  target: number;
  pearls: number;
  totalPearls: number;
  timeMs: number;
  finished: boolean;
}): ScoreBreakdown {
  const { correct, target, pearls, totalPearls, timeMs, finished } = params;
  const correctPts = correctPoints(correct, target);
  const pearlPts = pearlPoints(pearls, totalPearls);
  const accuracy = target > 0 ? Math.min(correct, target) / target : 0;
  const timePts = finished ? Math.round(SCORE_WEIGHTS.time * calculateSpeedRatio(timeMs, target) * accuracy) : 0;
  return { correctPts, pearlPts, timePts, total: correctPts + pearlPts + timePts };
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Multiplayer verdict using the 3-aspect final score.
 * Tie-breakers: more correct answers, then faster time (finished players only).
 */
export function determineMatchWinner(
  a: { name: string; score: number; correct: number; timeMs: number; finished: boolean },
  b: { name: string; score: number; correct: number; timeMs: number; finished: boolean }
): { winner: 1 | 2 | 0; message: string } {
  if (a.score !== b.score) {
    const w = a.score > b.score ? a : b;
    const l = a.score > b.score ? b : a;
    return { winner: a.score > b.score ? 1 : 2, message: `${w.name} menang dengan skor ${w.score} vs ${l.score}!` };
  }
  if (a.correct !== b.correct) {
    const w = a.correct > b.correct ? a : b;
    return { winner: a.correct > b.correct ? 1 : 2, message: `Skor sama! ${w.name} menang karena lebih banyak jawaban benar (${w.correct}).` };
  }
  if (a.finished && b.finished && a.timeMs !== b.timeMs) {
    const w = a.timeMs < b.timeMs ? a : b;
    return { winner: a.timeMs < b.timeMs ? 1 : 2, message: `Skor & jawaban benar sama! ${w.name} menang karena lebih cepat (${formatDuration(w.timeMs)}).` };
  }
  return { winner: 0, message: 'Hasil imbang sama kuat! Luar biasa keduanya!' };
}

export function calculateStars(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  const ratio = score / maxScore;
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.55) return 2;
  if (ratio >= 0.25) return 1;
  return 0;
}

export function checkCollision(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isLevelUnlocked(level: number, unlockedLevels: number[]): boolean {
  return unlockedLevels.includes(level);
}

export function unlockNextLevel(currentLevel: number, currentUnlocked: number[]): number[] {
  const set = new Set(currentUnlocked);
  set.add(1); // level 1 always unlocked
  if (currentLevel >= 1) set.add(2);
  if (currentLevel >= 2) set.add(3);
  return Array.from(set).sort((a, b) => a - b);
}

export function determineMultiplayerWinner(
  p1: { name: string; score: number; correct: number; timeElapsed: number },
  p2: { name: string; score: number; correct: number; timeElapsed: number }
): { winner: 1 | 2 | 0; message: string } {
  // Higher correct count wins; if tie, higher score; if tie, faster time
  if (p1.correct > p2.correct) {
    return { winner: 1, message: `${p1.name} menang dengan ${p1.correct} soal benar!` };
  } else if (p2.correct > p1.correct) {
    return { winner: 2, message: `${p2.name} menang dengan ${p2.correct} soal benar!` };
  }

  // Tie on correct answers, check score
  if (p1.score > p2.score) {
    return { winner: 1, message: `${p1.name} menang dengan skor lebih tinggi (${p1.score} vs ${p2.score})!` };
  } else if (p2.score > p1.score) {
    return { winner: 2, message: `${p2.name} menang dengan skor lebih tinggi (${p2.score} vs ${p1.score})!` };
  }

  // Tie on score, check time
  if (p1.timeElapsed < p2.timeElapsed) {
    return { winner: 1, message: `${p1.name} menang karena menjawab lebih cepat!` };
  } else if (p2.timeElapsed < p1.timeElapsed) {
    return { winner: 2, message: `${p2.name} menang karena menjawab lebih cepat!` };
  }

  return { winner: 0, message: 'Hasil imbang sama kuat! Luar biasa keduanya!' };
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function exportUsersToCSV(users: PlayerScoreRecord[]): string {
  const lines = [USER_DB_CSV_HEADER];
  for (const u of users) {
    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };
    lines.push([
      escapeCsv(u.id || `USR-${Math.floor(Math.random() * 89999 + 10000)}`),
      escapeCsv(u.name),
      escapeCsv(u.avatar),
      escapeCsv(u.color || 'blue'),
      escapeCsv(u.level || 1),
      escapeCsv(u.score),
      escapeCsv(u.pearls || 0),
      escapeCsv(u.correct || 0),
      escapeCsv(u.wrong || 0),
      escapeCsv(u.zone1Score || 0),
      escapeCsv(u.zone2Score || 0),
      escapeCsv(u.zone3Score || 0),
      escapeCsv(u.date),
      escapeCsv(u.registeredAt || u.date)
    ].join(','));
  }
  return lines.join('\n');
}

export function parseUsersCSV(csvText: string): { users: PlayerScoreRecord[]; error?: string } {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { users: [], error: 'Format CSV kosong atau tidak memiliki baris data.' };
  }
  const rawHeader = lines[0].toLowerCase().replace(/\s+/g, '');
  const legacyHeader = 'id,name,avatar,color,level,score,correct,wrong,date,registered_at'.replace(/\s+/g, '');
  const modernHeader = USER_DB_CSV_HEADER.toLowerCase().replace(/\s+/g, '');

  if (rawHeader !== modernHeader && rawHeader !== legacyHeader) {
    return {
      users: [],
      error: `Header CSV Database tidak sesuai! Wajib memiliki format kolom: ${USER_DB_CSV_HEADER}`
    };
  }

  const isLegacy = (rawHeader === legacyHeader);
  const users: PlayerScoreRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;

    if (isLegacy) {
      users.push({
        id: cols[0],
        name: cols[1],
        avatar: cols[2],
        color: cols[3] || 'blue',
        level: parseInt(cols[4], 10) || 1,
        score: parseInt(cols[5], 10) || 0,
        pearls: 0,
        correct: parseInt(cols[6], 10) || 0,
        wrong: parseInt(cols[7], 10) || 0,
        zone1Score: parseInt(cols[4], 10) === 1 ? parseInt(cols[5], 10) : 0,
        zone2Score: parseInt(cols[4], 10) === 2 ? parseInt(cols[5], 10) : 0,
        zone3Score: parseInt(cols[4], 10) === 3 ? parseInt(cols[5], 10) : 0,
        date: cols[8] || new Date().toISOString().split('T')[0],
        registeredAt: cols[9] || new Date().toISOString().split('T')[0]
      });
    } else {
      users.push({
        id: cols[0],
        name: cols[1],
        avatar: cols[2],
        color: cols[3] || 'blue',
        level: parseInt(cols[4], 10) || 1,
        score: parseInt(cols[5], 10) || 0,
        pearls: parseInt(cols[6], 10) || 0,
        correct: parseInt(cols[7], 10) || 0,
        wrong: parseInt(cols[8], 10) || 0,
        zone1Score: parseInt(cols[9], 10) || 0,
        zone2Score: parseInt(cols[10], 10) || 0,
        zone3Score: parseInt(cols[11], 10) || 0,
        date: cols[12] || new Date().toISOString().split('T')[0],
        registeredAt: cols[13] || new Date().toISOString().split('T')[0]
      });
    }
  }
  return { users };
}

export function getAvatarPlayedZones(avatar: {
  playedZones?: number[];
  gamesPlayed?: number;
  zoneScores?: { 1?: number; 2?: number; 3?: number };
}): number[] {
  if (avatar.playedZones && Array.isArray(avatar.playedZones) && avatar.playedZones.length > 0) {
    return avatar.playedZones;
  }
  const zones: number[] = [];
  if ((avatar.zoneScores?.[1] || 0) > 0) zones.push(1);
  if ((avatar.zoneScores?.[2] || 0) > 0) zones.push(2);
  if ((avatar.zoneScores?.[3] || 0) > 0) zones.push(3);
  return zones;
}

export function isAvatarEligibleForTab(
  avatar: {
    gamesPlayed?: number;
    totalScore?: number;
    totalPearls?: number;
    totalCorrect?: number;
    playedZones?: number[];
    zoneScores?: { 1?: number; 2?: number; 3?: number };
  },
  tab: 'overall' | 'zone1' | 'zone2' | 'zone3'
): boolean {
  const played = getAvatarPlayedZones(avatar);
  if (tab === 'zone1') {
    return played.includes(1);
  }
  if (tab === 'zone2') {
    return played.includes(2);
  }
  if (tab === 'zone3') {
    return played.includes(3);
  }
  // 'overall' / Juara Umum
  return true;
}

export function compareAvatars(
  a: {
    totalScore?: number;
    totalPearls?: number;
    totalCorrect?: number;
    totalWrong?: number;
    gamesPlayed?: number;
    lastPlayed?: string;
    createdAt?: string;
    zoneScores?: { 1?: number; 2?: number; 3?: number };
  },
  b: {
    totalScore?: number;
    totalPearls?: number;
    totalCorrect?: number;
    totalWrong?: number;
    gamesPlayed?: number;
    lastPlayed?: string;
    createdAt?: string;
    zoneScores?: { 1?: number; 2?: number; 3?: number };
  },
  tab: 'overall' | 'zone1' | 'zone2' | 'zone3'
): number {
  const scoreA =
    tab === 'overall'
      ? a.totalScore || 0
      : tab === 'zone1'
      ? a.zoneScores?.[1] || 0
      : tab === 'zone2'
      ? a.zoneScores?.[2] || 0
      : a.zoneScores?.[3] || 0;

  const scoreB =
    tab === 'overall'
      ? b.totalScore || 0
      : tab === 'zone1'
      ? b.zoneScores?.[1] || 0
      : tab === 'zone2'
      ? b.zoneScores?.[2] || 0
      : b.zoneScores?.[3] || 0;

  // 1. Primary: Score descending
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  // 2. Secondary (Tie-breaker 1): Total pearls collected descending
  const pearlsA = a.totalPearls || 0;
  const pearlsB = b.totalPearls || 0;
  if (pearlsB !== pearlsA) {
    return pearlsB - pearlsA;
  }

  // 3. Tertiary (Tie-breaker 2): Total correct answers descending
  const correctA = a.totalCorrect || 0;
  const correctB = b.totalCorrect || 0;
  if (correctB !== correctA) {
    return correctB - correctA;
  }

  // 4. Quaternary (Tie-breaker 3): Total wrong answers ascending (fewer is better)
  const wrongA = a.totalWrong || 0;
  const wrongB = b.totalWrong || 0;
  if (wrongA !== wrongB) {
    return wrongA - wrongB;
  }

  // 5. Quinary: Games played descending (active players rank above 0-game profiles)
  const gamesA = a.gamesPlayed || 0;
  const gamesB = b.gamesPlayed || 0;
  if (gamesB !== gamesA) {
    return gamesB - gamesA;
  }

  // 6. Recency
  const timeA = new Date(a.lastPlayed || a.createdAt || 0).getTime() || 0;
  const timeB = new Date(b.lastPlayed || b.createdAt || 0).getTime() || 0;
  return timeB - timeA;
}

export function validateQuestion(q: Partial<Question>): { valid: boolean; error?: string } {
  if (!q.id || !q.id.trim()) return { valid: false, error: 'ID soal wajib diisi' };
  const lvl = Number(q.level);
  if (![1, 2, 3].includes(lvl)) return { valid: false, error: 'Level harus 1, 2, atau 3' };
  if (!q.question || !q.question.trim()) return { valid: false, error: 'Teks pertanyaan wajib diisi' };
  if (!q.optionA || !q.optionA.trim()) return { valid: false, error: 'Opsi A wajib diisi' };
  if (!q.optionB || !q.optionB.trim()) return { valid: false, error: 'Opsi B wajib diisi' };
  if (!q.optionC || !q.optionC.trim()) return { valid: false, error: 'Opsi C wajib diisi' };
  if (!q.optionD || !q.optionD.trim()) return { valid: false, error: 'Opsi D wajib diisi' };
  const ans = (q.answer || '').toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(ans)) return { valid: false, error: 'Kunci jawaban harus A, B, C, atau D' };
  return { valid: true };
}

export function exportQuestionsToCSV(questions: Question[]): string {
  const lines = [QUESTION_CSV_HEADER];
  for (const q of questions) {
    const escapeCsv = (val: string | number) => {
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    };
    lines.push([
      escapeCsv(q.id),
      escapeCsv(q.level),
      escapeCsv(q.question),
      escapeCsv(q.optionA),
      escapeCsv(q.optionB),
      escapeCsv(q.optionC),
      escapeCsv(q.optionD),
      escapeCsv(q.answer),
      escapeCsv(q.explanation || '')
    ].join(','));
  }
  return lines.join('\n');
}

export function parseQuestionsCSV(csvText: string): { questions: Question[]; error?: string } {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { questions: [], error: 'Format CSV kosong atau tidak memiliki baris data.' };
  }
  const rawHeader = lines[0].toLowerCase().replace(/\s+/g, '');
  const expectedHeader = QUESTION_CSV_HEADER.toLowerCase();
  if (rawHeader !== expectedHeader) {
    return {
      questions: [],
      error: `Header CSV tidak sesuai! Wajib memiliki kolom: ${QUESTION_CSV_HEADER}`
    };
  }

  const questions: Question[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 8) {
      return {
        questions: [],
        error: `Baris ke-${i + 1} tidak memiliki kolom yang lengkap (minimal 8 kolom)!`
      };
    }
    const q: Question = {
      id: cols[0],
      level: parseInt(cols[1], 10) || 1,
      question: cols[2],
      optionA: cols[3],
      optionB: cols[4],
      optionC: cols[5],
      optionD: cols[6],
      answer: cols[7].toUpperCase() as 'A' | 'B' | 'C' | 'D',
      explanation: cols[8] || ''
    };
    const validation = validateQuestion(q);
    if (!validation.valid) {
      return { questions: [], error: `Baris ke-${i + 1}: ${validation.error}` };
    }
    questions.push(q);
  }
  return { questions };
}

export const DEFAULT_QUESTIONS: Question[] = [
  // LEVEL 1 (TP1) - Membandingkan & mengurutkan pecahan (pembilang 1, penyebut sama)
  {
    id: 'L1-01',
    level: 1,
    question: 'Manakah pecahan dengan nilai yang LEBIH BESAR antara 1/5 dan 1/8?',
    optionA: '1/5',
    optionB: '1/8',
    optionC: 'Nilainya sama',
    optionD: 'Tidak dapat dibandingkan',
    answer: 'A',
    explanation: 'Pada pecahan berpembilang 1, semakin kecil nilai penyebutnya maka potongan bagiannya semakin besar (1/5 > 1/8).'
  },
  {
    id: 'L1-02',
    level: 1,
    question: 'Urutkan pecahan berikut dari yang TERKECIL: 1/10, 1/4, 1/7',
    optionA: '1/4, 1/7, 1/10',
    optionB: '1/10, 1/7, 1/4',
    optionC: '1/7, 1/4, 1/10',
    optionD: '1/10, 1/4, 1/7',
    answer: 'B',
    explanation: 'Penyebut paling besar membagi benda paling banyak sehingga nilainya paling kecil: 1/10 < 1/7 < 1/4.'
  },
  {
    id: 'L1-03',
    level: 1,
    question: 'Budi memiliki 1/3 kue, sedangkan Ani memiliki 1/6 kue yang berukuran sama. Siapakah yang kuenya lebih besar?',
    optionA: 'Ani',
    optionB: 'Keduanya sama',
    optionC: 'Budi',
    optionD: 'Tidak ada yang benar',
    answer: 'C',
    explanation: '1/3 lebih besar dari 1/6 karena 1 kue hanya dibagi 3 orang dibanding 6 orang.'
  },
  {
    id: 'L1-04',
    level: 1,
    question: 'Pecahan berikut yang memiliki penyebut sama: 2/7 dan 5/7. Manakah pernyataan yang benar?',
    optionA: '2/7 > 5/7',
    optionB: '2/7 < 5/7',
    optionC: '2/7 = 5/7',
    optionD: '5/7 < 2/7',
    answer: 'B',
    explanation: 'Bila penyebut sama, kita cukup membandingkan pembilang. 2 lebih kecil dari 5, maka 2/7 < 5/7.'
  },
  {
    id: 'L1-05',
    level: 1,
    question: 'Tanda perbandingan yang tepat untuk mengisi titik-titik: 1/2 ... 1/9 adalah?',
    optionA: '<',
    optionB: '>',
    optionC: '=',
    optionD: '≤',
    answer: 'B',
    explanation: '1 bagian dari 2 bagian utuh (setengah) jelas jauh lebih besar dibanding 1 dari 9 bagian (1/2 > 1/9).'
  },
  {
    id: 'L1-06',
    level: 1,
    question: 'Urutan pecahan 3/8, 7/8, 1/8 dari yang TERBESAR adalah...',
    optionA: '7/8, 3/8, 1/8',
    optionB: '1/8, 3/8, 7/8',
    optionC: '3/8, 7/8, 1/8',
    optionD: '7/8, 1/8, 3/8',
    answer: 'A',
    explanation: 'Karena penyebut sama-sama 8, urutkan dari pembilang terbesar: 7, 3, lalu 1.'
  },
  {
    id: 'L1-07',
    level: 1,
    question: 'Manakah pecahan yang nilainya PALING KECIL?',
    optionA: '1/2',
    optionB: '1/3',
    optionC: '1/6',
    optionD: '1/12',
    answer: 'D',
    explanation: 'Penyebut 12 membagi utuh menjadi 12 potong kecil, sehingga 1/12 adalah potongan terkecil.'
  },
  {
    id: 'L1-08',
    level: 1,
    question: 'Ikan badut berenang sejauh 4/9 meter dan ikan buntal berenang 6/9 meter. Ikan mana yang berenang lebih jauh?',
    optionA: 'Ikan badut',
    optionB: 'Ikan buntal',
    optionC: 'Jaraknya sama',
    optionD: 'Tidak dapat dihitung',
    answer: 'B',
    explanation: '6/9 meter lebih jauh daripada 4/9 meter karena pembilang 6 lebih besar dari 4.'
  },
  {
    id: 'L1-09',
    level: 1,
    question: 'Manakah tanda yang tepat: 1/15 ... 1/5?',
    optionA: '>',
    optionB: '<',
    optionC: '=',
    optionD: '≥',
    answer: 'B',
    explanation: '1 dibagi 15 lebih kecil dibanding 1 dibagi 5 (1/15 < 1/5).'
  },
  {
    id: 'L1-10',
    level: 1,
    question: 'Urutkan dari yang terbesar: 5/11, 2/11, 9/11',
    optionA: '9/11, 5/11, 2/11',
    optionB: '2/11, 5/11, 9/11',
    optionC: '5/11, 9/11, 2/11',
    optionD: '9/11, 2/11, 5/11',
    answer: 'A',
    explanation: 'Penyebut sama yaitu 11, urutan dari pembilang terbesar: 9/11, 5/11, 2/11.'
  },
  {
    id: 'L1-11',
    level: 1,
    question: 'Pecahan 1/100 dibandingkan dengan 1/10, manakah yang lebih besar?',
    optionA: '1/100',
    optionB: '1/10',
    optionC: 'Sama besar',
    optionD: 'Tidak bisa dibandingkan',
    answer: 'B',
    explanation: '1/10 bernilai 0,1 sedangkan 1/100 bernilai 0,01. Jadi 1/10 lebih besar.'
  },
  {
    id: 'L1-12',
    level: 1,
    question: 'Ibu membagi semangka jadi 4 bagian sama besar. Adik mengambil 1 potong. Nilai pecahan semangka adik adalah...',
    optionA: '1/2',
    optionB: '1/4',
    optionC: '4/1',
    optionD: '3/4',
    answer: 'B',
    explanation: '1 potong dari 4 bagian sama besar bernilai pecahan 1/4.'
  },
  {
    id: 'L1-13',
    level: 1,
    question: 'Jika penyebut dua pecahan sama, pecahan yang lebih besar adalah yang...',
    optionA: 'Pembilangnya lebih besar',
    optionB: 'Pembilangnya lebih kecil',
    optionC: 'Pembilangnya nol',
    optionD: 'Penyebutnya digandakan',
    answer: 'A',
    explanation: 'Jika penyebut sama, nilai pecahan ditentukan oleh pembilang yang lebih besar.'
  },
  {
    id: 'L1-14',
    level: 1,
    question: 'Manakah pernyataan yang BENAR di bawah ini?',
    optionA: '1/7 > 1/3',
    optionB: '1/6 < 1/2',
    optionC: '1/5 = 1/4',
    optionD: '1/8 > 1/4',
    answer: 'B',
    explanation: '1/6 lebih kecil dari 1/2 karena penyebut 6 membagi lebih banyak dari 2.'
  },
  {
    id: 'L1-15',
    level: 1,
    question: 'Urutkan pecahan dari yang terkecil: 6/13, 1/13, 11/13, 4/13',
    optionA: '1/13, 4/13, 6/13, 11/13',
    optionB: '11/13, 6/13, 4/13, 1/13',
    optionC: '4/13, 1/13, 6/13, 11/13',
    optionD: '1/13, 6/13, 4/13, 11/13',
    answer: 'A',
    explanation: 'Penyebut sama 13, urut dari pembilang terkecil: 1, 4, 6, 11.'
  },

  // LEVEL 2 (TP2) - Mengenali pecahan senilai (gambar & simbol)
  {
    id: 'L2-01',
    level: 2,
    question: 'Pecahan 1/2 memiliki nilai yang SAMA (senilai) dengan pecahan...',
    optionA: '2/4',
    optionB: '1/4',
    optionC: '2/3',
    optionD: '3/4',
    answer: 'A',
    explanation: 'Jika pembilang dan penyebut 1/2 dikalikan 2, maka hasilnya adalah 2/4. Keduanya bernilai separuh.'
  },
  {
    id: 'L2-02',
    level: 2,
    question: 'Sebuah pizza laut dipotong menjadi 8 bagian sama besar. Lani memakan 4 potong. Berapakah pecahan senilai paling sederhana dari pizza yang dimakan Lani?',
    optionA: '1/4',
    optionB: '1/2',
    optionC: '3/4',
    optionD: '2/3',
    answer: 'B',
    explanation: '4/8 disederhanakan dengan membagi pembilang dan penyebut dengan 4 menjadi 1/2.'
  },
  {
    id: 'L2-03',
    level: 2,
    question: 'Bentuk paling sederhana dari pecahan 6/9 adalah...',
    optionA: '2/3',
    optionB: '3/4',
    optionC: '1/3',
    optionD: '3/2',
    answer: 'A',
    explanation: 'Bagi pembilang (6) dan penyebut (9) dengan FPB-nya yaitu 3: 6:3 = 2 dan 9:3 = 3, menghasilkan 2/3.'
  },
  {
    id: 'L2-04',
    level: 2,
    question: 'Pecahan berikut yang TIDAK senilai dengan 2/5 adalah...',
    optionA: '4/10',
    optionB: '6/15',
    optionC: '8/20',
    optionD: '5/10',
    answer: 'D',
    explanation: '5/10 senilai dengan 1/2, sedangkan 4/10, 6/15, dan 8/20 semuanya senilai dengan 2/5.'
  },
  {
    id: 'L2-05',
    level: 2,
    question: 'Jika 3/4 = n/12, berapakah nilai n agar kedua pecahan menjadi senilai?',
    optionA: '6',
    optionB: '8',
    optionC: '9',
    optionD: '10',
    answer: 'C',
    explanation: 'Penyebut 4 dikali 3 menjadi 12, maka pembilang 3 juga harus dikali 3 sehingga n = 9.'
  },
  {
    id: 'L2-06',
    level: 2,
    question: 'Akuarium karang dibagi menjadi 6 kotak. Sebanyak 2 kotak ditumbuhi anemon. Pecahan senilai dari area anemon tersebut adalah...',
    optionA: '1/2',
    optionB: '1/3',
    optionC: '1/4',
    optionD: '2/5',
    answer: 'B',
    explanation: 'Pecahan awalnya 2/6. Keduanya dibagi 2 menghasilkan pecahan senilai 1/3.'
  },
  {
    id: 'L2-07',
    level: 2,
    question: 'Pecahan 15/20 jika disederhanakan ke bentuk paling sederhana menjadi...',
    optionA: '3/4',
    optionB: '2/3',
    optionC: '5/6',
    optionD: '4/5',
    answer: 'A',
    explanation: 'Bagi 15 dan 20 dengan 5: 15:5 = 3, 20:5 = 4. Diperoleh 3/4.'
  },
  {
    id: 'L2-08',
    level: 2,
    question: 'Dua pecahan berikut yang merupakan pasangan pecahan senilai adalah...',
    optionA: '1/3 dan 2/9',
    optionB: '3/5 dan 6/10',
    optionC: '2/7 dan 4/15',
    optionD: '4/6 dan 3/5',
    answer: 'B',
    explanation: '3/5 = (3×2)/(5×2) = 6/10.'
  },
  {
    id: 'L2-09',
    level: 2,
    question: 'Pecahan yang senilai dengan 2/3 dan memiliki pembilang 10 adalah...',
    optionA: '10/12',
    optionB: '10/15',
    optionC: '10/18',
    optionD: '10/20',
    answer: 'B',
    explanation: 'Pembilang 2 dikalikan 5 = 10, maka penyebut 3 juga dikali 5 = 15 (10/15).'
  },
  {
    id: 'L2-10',
    level: 2,
    question: 'Bentuk sederhana dari pecahan 12/16 adalah...',
    optionA: '3/4',
    optionB: '2/3',
    optionC: '6/8',
    optionD: '4/5',
    answer: 'A',
    explanation: '12 dan 16 sama-sama dibagi 4 menghasilkan bentuk paling sederhana 3/4.'
  },
  {
    id: 'L2-11',
    level: 2,
    question: 'Pecahan 4/7 senilai dengan pecahan...',
    optionA: '8/14',
    optionB: '6/14',
    optionC: '8/21',
    optionD: '12/28',
    answer: 'A',
    explanation: '(4×2)/(7×2) = 8/14.'
  },
  {
    id: 'L2-12',
    level: 2,
    question: 'Jika m/18 senilai dengan 1/3, maka berapakah nilai m?',
    optionA: '3',
    optionB: '6',
    optionC: '9',
    optionD: '12',
    answer: 'B',
    explanation: 'Penyebut 3 dikali 6 menjadi 18, maka pembilang 1 dikali 6 menjadi 6.'
  },
  {
    id: 'L2-13',
    level: 2,
    question: 'Pecahan berikut yang senilai dengan 5/8 adalah...',
    optionA: '10/16',
    optionB: '15/20',
    optionC: '20/30',
    optionD: '25/35',
    answer: 'A',
    explanation: '5/8 = (5×2)/(8×2) = 10/16.'
  },
  {
    id: 'L2-14',
    level: 2,
    question: 'Sebuah kue dibagi 12 bagian sama besar. Diambil 3 potong. Pecahan senilai paling sederhana kue yang diambil adalah...',
    optionA: '1/3',
    optionB: '1/4',
    optionC: '1/6',
    optionD: '2/5',
    answer: 'B',
    explanation: '3/12 disederhanakan dengan membagi 3 menjadi 1/4.'
  },
  {
    id: 'L2-15',
    level: 2,
    question: 'Pecahan 18/24 dapat disederhanakan menjadi...',
    optionA: '2/3',
    optionB: '3/4',
    optionC: '5/6',
    optionD: '9/10',
    answer: 'B',
    explanation: 'Bagi 18 dan 24 dengan 6 menghasilkan 3/4.'
  },

  // LEVEL 3 (TP3) - Pecahan desimal persepuluhan/perseratusan & persen
  {
    id: 'L3-01',
    level: 3,
    question: 'Bentuk desimal dari pecahan 3/10 adalah...',
    optionA: '0,03',
    optionB: '0,3',
    optionC: '3,0',
    optionD: '0,33',
    answer: 'B',
    explanation: 'Penyebut 10 berarti 1 angka di belakang koma (persepuluhan), jadi 3/10 = 0,3.'
  },
  {
    id: 'L3-02',
    level: 3,
    question: 'Bilangan desimal 0,25 sama nilainya dengan persentase...',
    optionA: '2,5%',
    optionB: '25%',
    optionC: '0,25%',
    optionD: '250%',
    answer: 'B',
    explanation: '0,25 = 25/100 = 25%.'
  },
  {
    id: 'L3-03',
    level: 3,
    question: 'Bentuk desimal dari 45% adalah...',
    optionA: '4,5',
    optionB: '0,45',
    optionC: '0,045',
    optionD: '45,0',
    answer: 'B',
    explanation: '45% = 45/100 = 0,45.'
  },
  {
    id: 'L3-04',
    level: 3,
    question: 'Pecahan 75/100 jika dinyatakan dalam bentuk persen adalah...',
    optionA: '7,5%',
    optionB: '75%',
    optionC: '0,75%',
    optionD: '750%',
    answer: 'B',
    explanation: 'Persen artinya per seratus, maka 75/100 langsung bernilai 75%.'
  },
  {
    id: 'L3-05',
    level: 3,
    question: 'Penyelam telah menjelajahi 1/4 bagian terumbu karang. Berapa persen terumbu karang yang telah dijelajahi?',
    optionA: '15%',
    optionB: '20%',
    optionC: '25%',
    optionD: '50%',
    answer: 'C',
    explanation: '1/4 = (1×25)/(4×25) = 25/100 = 25%.'
  },
  {
    id: 'L3-06',
    level: 3,
    question: 'Bentuk pecahan biasa paling sederhana dari 0,6 adalah...',
    optionA: '3/5',
    optionB: '6/10',
    optionC: '2/3',
    optionD: '6/100',
    answer: 'A',
    explanation: '0,6 = 6/10. Dibagi 2 pada pembilang dan penyebut menjadi 3/5.'
  },
  {
    id: 'L3-07',
    level: 3,
    question: 'Manakah yang nilainya PALING BESAR di antara pilihan berikut?',
    optionA: '0,4',
    optionB: '35%',
    optionC: '1/2',
    optionD: '2/5',
    answer: 'C',
    explanation: 'Ubah ke persen: 0,4 = 40%, 35% = 35%, 1/2 = 50%, 2/5 = 40%. Maka yang terbesar adalah 1/2 (50%).'
  },
  {
    id: 'L3-08',
    level: 3,
    question: 'Di padang lamun, 80% rumput laut berwarna hijau tua. Bentuk desimal dari 80% adalah...',
    optionA: '0,08',
    optionB: '0,8',
    optionC: '8,0',
    optionD: '0,88',
    answer: 'B',
    explanation: '80% = 80/100 = 0,80 = 0,8.'
  },
  {
    id: 'L3-09',
    level: 3,
    question: 'Bentuk persen dari pecahan 1/5 adalah...',
    optionA: '10%',
    optionB: '15%',
    optionC: '20%',
    optionD: '25%',
    answer: 'C',
    explanation: '1/5 = (1×20)/(5×20) = 20/100 = 20%.'
  },
  {
    id: 'L3-10',
    level: 3,
    question: 'Bentuk desimal dari 7/100 adalah...',
    optionA: '0,7',
    optionB: '0,07',
    optionC: '0,007',
    optionD: '7,0',
    answer: 'B',
    explanation: 'Penyebut 100 berarti 2 angka di belakang koma (perseratusan), jadi 7/100 = 0,07.'
  },
  {
    id: 'L3-11',
    level: 3,
    question: 'Nilai 50% jika diubah menjadi pecahan biasa paling sederhana adalah...',
    optionA: '1/2',
    optionB: '1/4',
    optionC: '5/10',
    optionD: '2/5',
    answer: 'A',
    explanation: '50% = 50/100 = 1/2.'
  },
  {
    id: 'L3-12',
    level: 3,
    question: 'Pecahan biasa dari 0,75 dalam bentuk paling sederhana adalah...',
    optionA: '7/10',
    optionB: '3/4',
    optionC: '75/10',
    optionD: '4/5',
    answer: 'B',
    explanation: '0,75 = 75/100. Keduanya dibagi 25 menjadi 3/4.'
  },
  {
    id: 'L3-13',
    level: 3,
    question: 'Bentuk desimal dari 9/10 adalah...',
    optionA: '0,09',
    optionB: '0,9',
    optionC: '9,0',
    optionD: '0,99',
    answer: 'B',
    explanation: '9/10 = 0,9.'
  },
  {
    id: 'L3-14',
    level: 3,
    question: 'Manakah pasangan desimal dan persen yang SALAH?',
    optionA: '0,5 = 50%',
    optionB: '0,2 = 20%',
    optionC: '0,05 = 5%',
    optionD: '0,4 = 4%',
    answer: 'D',
    explanation: '0,4 seharusnya sama dengan 40%, bukan 4%.'
  },
  {
    id: 'L3-15',
    level: 3,
    question: 'Penyelam menemukan mutiara di 60% kerang laut. Bentuk pecahan biasa paling sederhana dari 60% adalah...',
    optionA: '6/10',
    optionB: '3/5',
    optionC: '2/3',
    optionD: '3/4',
    answer: 'B',
    explanation: '60% = 60/100. Dibagi 20 menjadi 3/5.'
  }
];
