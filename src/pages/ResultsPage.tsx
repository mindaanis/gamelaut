import React from 'react';
import { PlayerStats } from '../types/game.ts';
import { calculateStars, determineMultiplayerWinner } from '../game/logic.ts';
import { seaAudio } from '../game/audio.ts';

interface ResultsPageProps {
  gameMode: 'single' | 'multi';
  currentLevel: number;
  p1: PlayerStats;
  p2: PlayerStats;
  isGameOver?: boolean;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onHome: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  gameMode,
  p1,
  p2,
  isGameOver,
  onPlayAgain,
  onViewLeaderboard,
  onHome
}) => {
  const totalQ = p1.correct + p1.wrong;
  const accuracy = totalQ > 0 ? Math.round((p1.correct / totalQ) * 100) : 0;
  const maxScore = (gameMode === 'multi' ? 15 : 5) * 30;
  const stars = isGameOver ? 0 : calculateStars(p1.score, maxScore);

  const multiVerdict = gameMode === 'multi' ? determineMultiplayerWinner(
    { name: p1.name, score: p1.score, correct: p1.correct, timeElapsed: Date.now() - p1.startTime },
    { name: p2.name, score: p2.score, correct: p2.correct, timeElapsed: Date.now() - p2.startTime }
  ) : null;

  return (
    <div className="max-w-3xl mx-auto w-full p-2 sm:p-4 md:p-8 flex flex-col items-center justify-center min-h-[90vh] text-center relative z-10 animate-fadeIn overflow-y-auto">
      <div className={`w-full max-h-[92vh] overflow-y-auto p-5 sm:p-8 md:p-10 rounded-[24px] sm:rounded-[32px] border-[1.5px] backdrop-blur-md shadow-2xl flex flex-col items-center gap-4 sm:gap-6 my-auto ${
        isGameOver
          ? 'bg-[#220710]/92 border-rose-500/50 shadow-[0_20px_60px_rgba(244,63,94,0.3)]'
          : 'bg-[#041d3e]/92 border-[#39CCCC]/45 shadow-[0_20px_60px_rgba(0,0,0,0.8)]'
      }`}>
        
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          {isGameOver ? (
            <>
              <div className="text-5xl md:text-6xl mb-1">💀</div>
              <h2 className="text-3xl md:text-4xl font-black text-rose-400">
                PERMAINAN BERAKHIR (GAME OVER)
              </h2>
              <p className="text-sm md:text-base text-rose-200/90 font-semibold max-w-lg mx-auto">
                Nyawa kamu telah habis! Peringkat tidak dicatat ke dalam Papan Peringkat. Ayo evaluasi dan coba lagi!
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-black text-white">
                Petualangan Selesai! 🎉
              </h2>
              <p className="text-sm md:text-base text-[#7FDBFF] font-semibold">
                Kamu telah menunjukkan kecerdasan pecahanmu!
              </p>
            </>
          )}
        </div>

        {/* Stars or Broken Hearts */}
        {isGameOver ? (
          <div className="flex gap-2 text-4xl" title="Nyawa Habis">
            <span>🖤</span>
            <span>🖤</span>
            <span>🖤</span>
          </div>
        ) : (
          <div className="flex gap-3 text-5xl md:text-6xl drop-shadow-[0_4px_16px_rgba(255,220,0,0.6)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? 'text-[#FFDC00]' : 'text-white/20'}>
                ★
              </span>
            ))}
          </div>
        )}

        {/* Single Player Stats Grid */}
        {gameMode === 'single' && (
          <div className="flex flex-col gap-3 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
              <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4 flex flex-col items-center">
                <span className={`text-3xl font-black ${isGameOver ? 'text-rose-400' : 'text-[#FFDC00]'}`}>
                  {p1.score}
                </span>
                <span className="text-xs text-[#b8d4f0] font-bold mt-1">Total Skor {isGameOver ? 'Sementara' : 'Akhir'}</span>
              </div>
              <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-3xl font-black text-[#2ECC40]">{p1.correct}</span>
                <span className="text-xs text-[#b8d4f0] font-bold mt-1">Soal Benar</span>
              </div>
              <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-3xl font-black text-[#FF4136]">{p1.wrong}</span>
                <span className="text-xs text-[#b8d4f0] font-bold mt-1">Soal Salah</span>
              </div>
              <div className="bg-[#00142e]/80 border border-[#39CCCC]/35 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-3xl font-black text-[#39CCCC]">
                  {p1.pearls || 0}
                </span>
                <span className="text-xs text-[#b8d4f0] font-bold mt-1">Mutiara (🦪)</span>
              </div>
            </div>

            {/* Pearl & Question Point Breakdown */}
            {!isGameOver && (
              <div className="p-3 rounded-2xl bg-[#00142e]/80 border border-[#FFDC00]/40 text-xs text-[#e0f0ff] flex flex-wrap items-center justify-around gap-2">
                <span>🎯 Poin Kuis: <strong className="text-white font-bold">{p1.score - ((p1.pearls || 0) * 10)} Poin</strong></span>
                <span>•</span>
                <span>🦪 Bonus Mutiara: <strong className="text-[#39CCCC] font-bold">{(p1.pearls || 0) * 10} Poin ({p1.pearls || 0} x 10)</strong></span>
                <span>•</span>
                <span>✨ Melekat pada avatar: <strong className="text-[#FFDC00] font-bold">{p1.name}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Multiplayer Comparison */}
        {gameMode === 'multi' && multiVerdict && (
          <div className="w-full flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#00244d]/85 border-2 border-[#FFDC00] text-center shadow-md">
              <h3 className="text-xl md:text-2xl font-black text-[#FFDC00]">
                🏆 {multiVerdict.winner === 1 ? `Pemenang: ${p1.name}!` : (multiVerdict.winner === 2 ? `Pemenang: ${p2.name}!` : 'Hasil Imbang!')}
              </h3>
              <p className="text-xs md:text-sm text-[#d0e4f7] mt-1 font-medium">
                {multiVerdict.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#00142e]/80 border border-[#39CCCC]/40 text-left">
                <h4 className="text-base font-bold text-[#7FDBFF] flex items-center gap-1.5">
                  <span>{p1.avatar}</span> {p1.name} (P1)
                </h4>
                <div className="text-xs md:text-sm mt-2 text-[#e0f0ff] flex flex-col gap-1">
                  <div>Skor: <strong className="text-[#FFDC00]">{p1.score}</strong></div>
                  <div>Benar: <strong className="text-[#2ECC40]">{p1.correct}</strong></div>
                  <div>Salah: <strong className="text-[#FF4136]">{p1.wrong}</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#00142e]/80 border border-[#39CCCC]/40 text-left">
                <h4 className="text-base font-bold text-[#39CCCC] flex items-center gap-1.5">
                  <span>{p2.avatar}</span> {p2.name} (P2)
                </h4>
                <div className="text-xs md:text-sm mt-2 text-[#e0f0ff] flex flex-col gap-1">
                  <div>Skor: <strong className="text-[#FFDC00]">{p2.score}</strong></div>
                  <div>Benar: <strong className="text-[#2ECC40]">{p2.correct}</strong></div>
                  <div>Salah: <strong className="text-[#FF4136]">{p2.wrong}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3.5 justify-center w-full mt-2">
          <button
            onClick={() => {
              seaAudio.klik();
              onPlayAgain();
            }}
            className={`py-3 px-6 rounded-2xl font-extrabold text-sm text-[#00172e] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer ${
              isGameOver
                ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-900/50'
                : 'bg-gradient-to-br from-[#FFDC00] to-[#ff9800]'
            }`}
          >
            🔄 {isGameOver ? 'Coba Lagi' : 'Main Lagi'}
          </button>

          {!isGameOver && (
            <button
              onClick={() => {
                seaAudio.klik();
                onViewLeaderboard();
              }}
              className="py-3 px-6 rounded-2xl font-extrabold text-sm bg-gradient-to-br from-[#39CCCC] to-[#0074D9] text-white shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              🏆 Papan Peringkat
            </button>
          )}

          <button
            onClick={() => {
              seaAudio.klik();
              onHome();
            }}
            className="py-3 px-6 rounded-2xl font-extrabold text-sm bg-white/10 hover:bg-white/20 border border-white/25 text-white active:scale-95 transition-all cursor-pointer"
          >
            🏠 Menu Utama
          </button>
        </div>

      </div>
    </div>
  );
};
