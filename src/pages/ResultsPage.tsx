import React from 'react';
import { PlayerResult, PlayerStats, ScoreBreakdown } from '../types/game.ts';
import { calculateStars, formatDuration, MAX_GAME_SCORE, SCORE_WEIGHTS } from '../game/logic.ts';
import { resolveMatch } from '../game/multiplayerLeaderboard.ts';
import { seaAudio } from '../game/audio.ts';

interface ResultsPageProps {
  gameMode: 'single' | 'multi';
  currentLevel: number;
  p1: PlayerStats;
  /** Multiplayer: opponent result (live while they are still playing) */
  opponent?: PlayerResult;
  isGameOver?: boolean;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onHome: () => void;
}

const STATUS_LABEL: Record<PlayerResult['status'], { text: string; cls: string }> = {
  playing: { text: '⏳ Masih bermain', cls: 'bg-sky-500/20 text-sky-200 border-sky-400/50' },
  finished: { text: '🏁 Selesai', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50' },
  eliminated: { text: '💀 Nyawa habis', cls: 'bg-rose-500/20 text-rose-200 border-rose-400/50' },
  left: { text: '🚪 Keluar', cls: 'bg-white/10 text-white/70 border-white/25' }
};

const BreakdownBars: React.FC<{ breakdown?: ScoreBreakdown; compact?: boolean }> = ({ breakdown, compact }) => {
  if (!breakdown) return null;
  const items = [
    { label: '🎯 Jawaban benar', value: breakdown.correctPts, max: SCORE_WEIGHTS.correct, color: 'bg-emerald-400' },
    { label: '🦪 Mutiara', value: breakdown.pearlPts, max: SCORE_WEIGHTS.pearls, color: 'bg-sky-300' },
    { label: '⏱️ Bonus waktu', value: breakdown.timePts, max: SCORE_WEIGHTS.time, color: 'bg-amber-400' }
  ];
  return (
    <div className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'} w-full text-left`}>
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex justify-between text-[11px] sm:text-xs text-[#d0e4f7]">
            <span>{it.label}</span>
            <span className="font-bold tabular-nums text-white">
              {it.value}<span className="text-white/50">/{it.max}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-0.5">
            <div className={`h-full ${it.color}`} style={{ width: `${Math.round((it.value / it.max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const PlayerCard: React.FC<{ label: string; player: PlayerResult; highlight?: boolean; accent: string }> = ({ label, player, highlight, accent }) => {
  const status = STATUS_LABEL[player.status];
  return (
    <div className={`p-4 rounded-2xl bg-[#00142e]/80 border text-left flex flex-col gap-3 ${highlight ? 'border-[#FFDC00] shadow-[0_0_20px_rgba(255,220,0,0.25)]' : 'border-[#39CCCC]/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-sm sm:text-base font-bold flex items-center gap-1.5 min-w-0 ${accent}`}>
          <span className="text-xl">{player.avatar}</span>
          <span className="truncate">{player.name}</span>
          <span className="text-[10px] text-white/50 font-semibold shrink-0">({label})</span>
        </h4>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.cls}`}>{status.text}</span>
      </div>

      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-black text-[#FFDC00] tabular-nums">{player.score}</span>
        <span className="text-xs text-white/50 mb-1">/ {MAX_GAME_SCORE}{player.status === 'playing' ? ' (sementara)' : ''}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
        <div className="rounded-lg bg-white/5 py-1.5"><div className="font-black text-[#2ECC40] text-sm">{player.correct}</div>Benar</div>
        <div className="rounded-lg bg-white/5 py-1.5"><div className="font-black text-[#FF4136] text-sm">{player.wrong}</div>Salah</div>
        <div className="rounded-lg bg-white/5 py-1.5"><div className="font-black text-sky-300 text-sm">{player.pearls}</div>Mutiara</div>
        <div className="rounded-lg bg-white/5 py-1.5">
          <div className="font-black text-white text-sm tabular-nums">{player.status === 'finished' ? formatDuration(player.timeMs) : '–'}</div>Waktu
        </div>
      </div>

      <BreakdownBars breakdown={player.breakdown} compact />
    </div>
  );
};

export const ResultsPage: React.FC<ResultsPageProps> = ({
  gameMode,
  p1,
  opponent,
  isGameOver,
  onPlayAgain,
  onViewLeaderboard,
  onHome
}) => {
  const stars = isGameOver ? 0 : calculateStars(p1.score, MAX_GAME_SCORE);
  const me: PlayerResult = {
    name: p1.name,
    avatar: p1.avatar,
    score: p1.score,
    correct: p1.correct,
    wrong: p1.wrong,
    pearls: p1.pearls || 0,
    timeMs: p1.timeMs || 0,
    status: p1.status || (isGameOver ? 'eliminated' : 'finished'),
    breakdown: p1.breakdown
  };

  const isMulti = gameMode === 'multi';
  const waitingForOpponent = isMulti && (!opponent || opponent.status === 'playing');
  const verdict = isMulti && opponent && !waitingForOpponent ? resolveMatch(me, opponent) : null;

  return (
    <div className="max-w-3xl mx-auto w-full px-3 py-4 sm:p-6 flex flex-col items-center justify-center min-h-[100dvh] text-center relative z-10 animate-fadeIn">
      <div className={`w-full p-4 sm:p-8 rounded-[24px] sm:rounded-[32px] border-[1.5px] backdrop-blur-md shadow-2xl flex flex-col items-center gap-4 sm:gap-5 ${
        isGameOver
          ? 'bg-[#220710]/92 border-rose-500/50 shadow-[0_20px_60px_rgba(244,63,94,0.3)]'
          : 'bg-[#041d3e]/92 border-[#39CCCC]/45 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
      }`}>

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          {isGameOver ? (
            <>
              <div className="text-4xl sm:text-5xl">💀</div>
              <h2 className="text-2xl sm:text-4xl font-black text-rose-400 leading-tight">
                Nyawa Habis!
              </h2>
              <p className="text-xs sm:text-base text-rose-200/90 font-semibold max-w-lg mx-auto">
                {isMulti
                  ? 'Kamu tidak bisa bermain lagi di pertandingan ini. Skor jawaban benar & mutiara tetap dihitung, tetapi tanpa bonus waktu.'
                  : 'Peringkat tidak dicatat ke dalam Papan Peringkat. Ayo evaluasi dan coba lagi!'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Petualangan Selesai! 🎉
              </h2>
              <p className="text-xs sm:text-base text-[#7FDBFF] font-semibold">
                Kamu telah menunjukkan kecerdasan pecahanmu!
              </p>
            </>
          )}
        </div>

        {/* Stars (single player) */}
        {!isMulti && (
          isGameOver ? (
            <div className="flex gap-2 text-3xl sm:text-4xl" title="Nyawa Habis">
              <span>🖤</span><span>🖤</span><span>🖤</span>
            </div>
          ) : (
            <div className="flex gap-3 text-5xl drop-shadow-[0_4px_16px_rgba(255,220,0,0.6)]">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={i < stars ? 'text-[#FFDC00]' : 'text-white/20'}>★</span>
              ))}
            </div>
          )
        )}

        {/* Single player: own result */}
        {!isMulti && (
          <div className="w-full max-w-md">
            <PlayerCard label="Kamu" player={me} accent="text-[#7FDBFF]" />
          </div>
        )}

        {/* Multiplayer: verdict or waiting state */}
        {isMulti && (
          <div className="w-full flex flex-col gap-4">
            {waitingForOpponent ? (
              <div className="p-4 rounded-2xl bg-[#00244d]/85 border-2 border-dashed border-[#39CCCC] text-center">
                <h3 className="text-base sm:text-xl font-black text-[#39CCCC] flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  Menunggu {opponent?.name || 'lawan'} menyelesaikan permainan...
                </h3>
                <p className="text-xs text-[#d0e4f7] mt-1">
                  Skor lawan di bawah diperbarui langsung. Pemenang diumumkan setelah lawan selesai.
                </p>
              </div>
            ) : verdict && (
              <div className="p-4 rounded-2xl bg-[#00244d]/85 border-2 border-[#FFDC00] text-center shadow-md">
                <h3 className="text-lg sm:text-2xl font-black text-[#FFDC00]">
                  🏆 {verdict.winner === 1 ? 'Kamu Menang!' : verdict.winner === 2 ? `Pemenang: ${opponent!.name}` : 'Hasil Imbang!'}
                </h3>
                <p className="text-xs sm:text-sm text-[#d0e4f7] mt-1 font-medium">{verdict.message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <PlayerCard label="Kamu" player={me} highlight={verdict?.winner === 1} accent="text-[#7FDBFF]" />
              {opponent && <PlayerCard label="Lawan" player={opponent} highlight={verdict?.winner === 2} accent="text-[#39CCCC]" />}
            </div>
          </div>
        )}

        {/* Scoring explanation */}
        <p className="text-[10px] sm:text-[11px] text-[#a0c8f0] max-w-xl leading-relaxed">
          Skor maksimal {MAX_GAME_SCORE}: jawaban benar {SCORE_WEIGHTS.correct} • mutiara {SCORE_WEIGHTS.pearls} • bonus waktu {SCORE_WEIGHTS.time}.
          Bonus waktu hanya untuk yang menjawab semua soal dan dikalikan ketepatan jawaban.
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-1 min-[420px]:flex min-[420px]:flex-wrap gap-2.5 sm:gap-3.5 justify-center w-full">
          {/* Multiplayer: no replay in the same match */}
          {!isMulti && (
            <button
              onClick={() => {
                seaAudio.klik();
                onPlayAgain();
              }}
              className={`min-h-11 py-3 px-6 rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer ${
                isGameOver
                  ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                  : 'bg-gradient-to-br from-[#FFDC00] to-[#ff9800] text-[#00172e]'
              }`}
            >
              🔄 {isGameOver ? 'Coba Lagi' : 'Main Lagi'}
            </button>
          )}

          {(isMulti || !isGameOver) && (
            <button
              onClick={() => {
                seaAudio.klik();
                onViewLeaderboard();
              }}
              className="min-h-11 py-3 px-6 rounded-2xl font-extrabold text-sm bg-gradient-to-br from-[#39CCCC] to-[#0074D9] text-white shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              🏆 Papan Peringkat
            </button>
          )}

          <button
            onClick={() => {
              seaAudio.klik();
              onHome();
            }}
            className="min-h-11 py-3 px-6 rounded-2xl font-extrabold text-sm bg-white/10 hover:bg-white/20 border border-white/25 text-white active:scale-95 transition-all cursor-pointer"
          >
            🏠 Menu Utama
          </button>
        </div>

      </div>
    </div>
  );
};
