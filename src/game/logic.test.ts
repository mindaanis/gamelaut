import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScore,
  calculateStars,
  checkCollision,
  validateQuestion,
  parseCSVLine,
  parseQuestionsCSV,
  exportQuestionsToCSV,
  exportUsersToCSV,
  parseUsersCSV,
  isLevelUnlocked,
  unlockNextLevel,
  determineMultiplayerWinner,
  DEFAULT_QUESTIONS,
  QUESTION_CSV_HEADER,
  USER_DB_CSV_HEADER
} from './logic';

test('scoring rules: level 1 is 10, level 2 is 20, level 3 is 30', () => {
  assert.equal(calculateScore(1, true), 10);
  assert.equal(calculateScore(2, true), 20);
  assert.equal(calculateScore(3, true), 30);
  assert.equal(calculateScore(1, false), 0);
  assert.equal(calculateScore(3, false), 0);
});

test('star rules calculation', () => {
  assert.equal(calculateStars(300, 300), 3);
  assert.equal(calculateStars(260, 300), 3);
  assert.equal(calculateStars(180, 300), 2);
  assert.equal(calculateStars(90, 300), 1);
  assert.equal(calculateStars(30, 300), 0);
});

test('level unlock progression: level 1 default, unlocks 2 then 3', () => {
  assert.equal(isLevelUnlocked(1, [1]), true);
  assert.equal(isLevelUnlocked(2, [1]), false);
  assert.equal(isLevelUnlocked(3, [1]), false);

  const afterL1 = unlockNextLevel(1, [1]);
  assert.deepEqual(afterL1, [1, 2]);
  assert.equal(isLevelUnlocked(2, afterL1), true);

  const afterL2 = unlockNextLevel(2, afterL1);
  assert.deepEqual(afterL2, [1, 2, 3]);
  assert.equal(isLevelUnlocked(3, afterL2), true);
});

test('multiplayer winner determination: correct answers first, then score, then speed', () => {
  // P1 has more correct answers
  const res1 = determineMultiplayerWinner(
    { name: 'P1', score: 100, correct: 8, timeElapsed: 120 },
    { name: 'P2', score: 100, correct: 6, timeElapsed: 100 }
  );
  assert.equal(res1.winner, 1);

  // Tie correct, P2 has higher score (e.g. from pearls)
  const res2 = determineMultiplayerWinner(
    { name: 'P1', score: 100, correct: 5, timeElapsed: 120 },
    { name: 'P2', score: 120, correct: 5, timeElapsed: 120 }
  );
  assert.equal(res2.winner, 2);

  // Tie correct & score, P1 is faster
  const res3 = determineMultiplayerWinner(
    { name: 'P1', score: 100, correct: 5, timeElapsed: 85 },
    { name: 'P2', score: 100, correct: 5, timeElapsed: 95 }
  );
  assert.equal(res3.winner, 1);
});

test('collision detection accurately identifies overlapping boxes', () => {
  const player = { x: 50, y: 50, width: 40, height: 40 };
  const bubbleOverlap = { x: 70, y: 70, width: 30, height: 30 };
  const bubbleFar = { x: 200, y: 200, width: 30, height: 30 };

  assert.equal(checkCollision(player, bubbleOverlap), true);
  assert.equal(checkCollision(player, bubbleFar), false);
});

test('users database CSV export and import roundtrip', () => {
  const sampleUsers = [
    {
      id: 'USR-01',
      name: 'Minda',
      avatar: '🐬',
      color: 'blue',
      level: 2,
      score: 180,
      correct: 9,
      wrong: 1,
      date: '2026-10-30',
      registeredAt: '2026-10-30'
    }
  ];

  const exported = exportUsersToCSV(sampleUsers);
  assert.ok(exported.startsWith(USER_DB_CSV_HEADER));

  const parsed = parseUsersCSV(exported);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.users.length, 1);
  assert.equal(parsed.users[0].name, 'Minda');
  assert.equal(parsed.users[0].score, 180);
});

test('default bank contains at least 15 questions per level (total 45)', () => {
  const level1 = DEFAULT_QUESTIONS.filter(q => q.level === 1);
  const level2 = DEFAULT_QUESTIONS.filter(q => q.level === 2);
  const level3 = DEFAULT_QUESTIONS.filter(q => q.level === 3);

  assert.ok(level1.length >= 15, `Level 1 has ${level1.length} questions, expected >= 15`);
  assert.ok(level2.length >= 15, `Level 2 has ${level2.length} questions, expected >= 15`);
  assert.ok(level3.length >= 15, `Level 3 has ${level3.length} questions, expected >= 15`);

  // Verify each question is valid
  for (const q of DEFAULT_QUESTIONS) {
    const res = validateQuestion(q);
    assert.equal(res.valid, true, `Question ${q.id} must be valid: ${res.error}`);
  }
});

test('leaderboard ranking comparator: score first, then pearls tie-breaker, then correct answers', async () => {
  const { compareAvatars, isAvatarEligibleForTab } = await import('./logic.ts');

  const minda = {
    name: 'minda',
    totalScore: 0,
    totalPearls: 0,
    totalCorrect: 0,
    totalWrong: 0,
    gamesPlayed: 0,
    zoneScores: { 1: 0, 2: 0, 3: 0 },
    playedZones: [1]
  };

  const yuyu = {
    name: 'yuyu',
    totalScore: 0,
    totalPearls: 9,
    totalCorrect: 3,
    totalWrong: 2,
    gamesPlayed: 1,
    zoneScores: { 1: 0, 2: 0, 3: 0 },
    playedZones: [1, 2]
  };

  // When comparing yuyu vs minda, yuyu (with 9 pearls & 3 correct) MUST rank ahead of minda
  const diff = compareAvatars(yuyu, minda, 'overall');
  assert.ok(diff < 0, 'yuyu with 9 pearls must sort before minda with 0 pearls (negative comparison value)');

  // Verify sorting array puts yuyu at index 0 (#1 rank)
  const sorted = [minda, yuyu].sort((a, b) => compareAvatars(a, b, 'overall'));
  assert.equal(sorted[0].name, 'yuyu', 'yuyu must be #1 rank, not minda');
  assert.equal(sorted[1].name, 'minda', 'minda with 0 pearls and 0 score must be #2');

  // Zone eligibility: minda only played zone 1, never zone 2
  assert.equal(isAvatarEligibleForTab(minda, 'zone1'), true);
  assert.equal(isAvatarEligibleForTab(minda, 'zone2'), false);
  assert.equal(isAvatarEligibleForTab(yuyu, 'zone2'), true);
});


test('3-aspect scoring: correct 500, pearls 200, time 300 (max 1000)', async () => {
  const { calculateFinalScore, calculateLiveScore, MAX_GAME_SCORE } = await import('./logic.ts');
  assert.equal(MAX_GAME_SCORE, 1000);

  // Perfect & fast: everything maxed
  const perfect = calculateFinalScore({ correct: 15, target: 15, pearls: 16, totalPearls: 16, timeMs: 5 * 60_000, finished: true });
  assert.deepEqual(perfect, { correctPts: 500, pearlPts: 200, timePts: 300, total: 1000 });

  // Live score has no time bonus
  assert.equal(calculateLiveScore(15, 15, 16, 16), 700);

  // Eliminated players get no time bonus
  const eliminated = calculateFinalScore({ correct: 5, target: 15, pearls: 8, totalPearls: 16, timeMs: 60_000, finished: false });
  assert.equal(eliminated.timePts, 0);
  assert.equal(eliminated.total, 167 + 100);

  // Too slow (>= 120s per question) -> no time bonus
  const slow = calculateFinalScore({ correct: 15, target: 15, pearls: 0, totalPearls: 16, timeMs: 15 * 120_000, finished: true });
  assert.equal(slow.timePts, 0);

  // Rushing with wrong answers is not rewarded: time bonus scales with accuracy
  const rushed = calculateFinalScore({ correct: 3, target: 15, pearls: 0, totalPearls: 16, timeMs: 60_000, finished: true });
  assert.equal(rushed.timePts, 60);
});

test('screenshot scenario: 11 correct finisher beats 5 correct + many pearls', async () => {
  const { calculateFinalScore, determineMatchWinner } = await import('./logic.ts');
  const jojo = calculateFinalScore({ correct: 5, target: 15, pearls: 8, totalPearls: 16, timeMs: 6 * 60_000, finished: false });
  const dimas = calculateFinalScore({ correct: 11, target: 15, pearls: 2, totalPearls: 16, timeMs: 12 * 60_000, finished: true });
  assert.ok(dimas.total > jojo.total);
  const res = determineMatchWinner(
    { name: 'jojo', score: jojo.total, correct: 5, timeMs: 6 * 60_000, finished: false },
    { name: 'Dimas', score: dimas.total, correct: 11, timeMs: 12 * 60_000, finished: true }
  );
  assert.equal(res.winner, 2);
});

test('match winner tie-breakers: score, then correct, then time', async () => {
  const { determineMatchWinner } = await import('./logic.ts');
  const base = { score: 600, correct: 10, timeMs: 400_000, finished: true };
  assert.equal(determineMatchWinner({ name: 'A', ...base, score: 610 }, { name: 'B', ...base }).winner, 1);
  assert.equal(determineMatchWinner({ name: 'A', ...base }, { name: 'B', ...base, correct: 11 }).winner, 2);
  assert.equal(determineMatchWinner({ name: 'A', ...base, timeMs: 300_000 }, { name: 'B', ...base }).winner, 1);
  assert.equal(determineMatchWinner({ name: 'A', ...base }, { name: 'B', ...base }).winner, 0);
});

test('multiplayer leaderboard: merge dedupes, summary ranks by best score, CSV roundtrip', async () => {
  const lb = await import('./multiplayerLeaderboard.ts');
  const row = (matchId: string, playerKey: string, score: number, outcome: 'menang' | 'kalah' | 'seri') => ({
    matchId, playerKey, name: playerKey, avatar: '🐠', level: 1, score, correct: 10, wrong: 1, pearls: 3,
    timeMs: 300_000, status: 'finished' as const, outcome, opponentName: 'x', date: '2026-10-31T10:00:00.000Z'
  });
  const rows = [row('m1', 'ana', 800, 'menang'), row('m1', 'budi', 500, 'kalah'), row('m2', 'budi', 900, 'menang')];
  const merged = lb.mergeMultiResults(rows, [row('m1', 'ana', 800, 'menang'), row('m3', 'citra', 100, 'kalah')]);
  assert.equal(merged.length, 4);

  const summary = lb.summarizePlayers(merged);
  assert.deepEqual(summary.map((s) => s.playerKey), ['budi', 'ana', 'citra']);
  assert.equal(summary[0].matches, 2);
  assert.equal(summary[0].wins, 1);

  const parsed = lb.parseMultiResultsCSV(lb.exportMultiResultsToCSV(merged));
  assert.equal(parsed.error, undefined);
  assert.deepEqual(parsed.rows, merged);

  // A player who leaves loses
  const left = lb.resolveMatch(
    { name: 'A', avatar: '🐠', score: 900, correct: 14, wrong: 0, pearls: 5, timeMs: 0, status: 'left' },
    { name: 'B', avatar: '🐬', score: 100, correct: 2, wrong: 3, pearls: 0, timeMs: 0, status: 'eliminated' }
  );
  assert.equal(left.winner, 2);
});
