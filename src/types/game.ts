export type ActivePage = 'splash' | 'home' | 'gameplay' | 'results';
export type ModalType =
  | 'avatar'
  | 'level'
  | 'multiplayer'
  | 'guide'
  | 'settings'
  | 'crud'
  | 'teacher-auth'
  | 'question-form'
  | 'leaderboard'
  | 'question'
  | null;

export interface AvatarProfile {
  id: string;
  name: string;
  emoji: string;
  color: 'blue' | 'coral' | 'gold' | 'green' | 'purple';
  totalScore: number;
  totalPearls: number;
  totalCorrect: number;
  totalWrong: number;
  gamesPlayed: number;
  playedZones?: number[];
  zoneScores: {
    1: number;
    2: number;
    3: number;
  };
  createdAt: string;
  lastPlayed: string;
}

export interface PlayerStats {
  id: string;
  name: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  speed: number;
  baseSpeed: number;
  facingRight: boolean;
  isShocked: boolean;
  shockTimer?: NodeJS.Timeout | number | null;
  score: number;
  correct: number;
  wrong: number;
  pearls: number;
  startTime: number;
  // Filled in when the game ends
  timeMs?: number;
  status?: PlayerStatus;
  breakdown?: ScoreBreakdown;
}

export type PlayerStatus = 'playing' | 'finished' | 'eliminated' | 'left';

export interface ScoreBreakdown {
  correctPts: number;
  pearlPts: number;
  timePts: number;
  total: number;
}

/** A player's result as known on this device (own result or opponent's reported result) */
export interface PlayerResult {
  avatarId?: string;
  name: string;
  avatar: string;
  score: number;
  correct: number;
  wrong: number;
  pearls: number;
  timeMs: number;
  status: PlayerStatus;
  breakdown?: ScoreBreakdown;
}

export interface StationaryBubble {
  id: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface PearlItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export interface MovingJellyfish {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  minY: number;
  maxY: number;
}

export interface AmbientFish {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  size: number;
}

export interface ZoneThemeConfig {
  id: number;
  name: string;
  subtitle: string;
  tp: string;
  bgGradient: string;
  ambientLight: string;
  creatures: string[];
}
