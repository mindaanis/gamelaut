import React, { useState, useEffect, useRef } from 'react';
import { Question, calculateScore } from '../../game/logic.ts';
import { seaAudio } from '../../game/audio.ts';

interface QuestionModalProps {
  question: Question;
  bubbleId: string;
  playerName: string;
  currentLives: number;
  onAnswerSubmitted: (isCorrect: boolean, points: number) => void;
  onClose: () => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  question,
  playerName,
  currentLives,
  onAnswerSubmitted,
  onClose
}) => {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25); // 25 seconds countdown timer
  const [isTimeout, setIsTimeout] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (isAnswered) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswered]);

  const handleTimeout = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setIsTimeout(true);
    seaAudio.salahkan();
    onAnswerSubmitted(false, 0);
  };

  const handleSelectOption = (optKey: 'A' | 'B' | 'C' | 'D') => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOpt(optKey);
    setIsAnswered(true);

    const isCorrect = (optKey === question.answer);
    const points = calculateScore(question.level, isCorrect);

    if (isCorrect) {
      seaAudio.benarkan();
    } else {
      seaAudio.salahkan();
    }

    onAnswerSubmitted(isCorrect, points);
  };

  const timerPct = Math.max(0, Math.min(100, (timeLeft / 25) * 100));
  const timerColor =
    timeLeft > 10 ? 'bg-emerald-400' : timeLeft > 5 ? 'bg-amber-400' : 'bg-rose-500 animate-pulse';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/88 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-[24px] sm:rounded-[28px] bg-[#041d3e] border-2 border-[#FFDC00] shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col gap-3 md:gap-4 text-white my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide bg-[#FFDC00]/20 text-[#FFDC00] border border-[#FFDC00]/50">
              ZONA {question.level} — SOAL PECAHAN
            </span>
            <div className="flex items-center text-xs sm:text-sm ml-1" title="Sisa Nyawa">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-xs sm:text-sm">
                  {i < currentLives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
          <span className="text-[11px] sm:text-xs text-[#b8d4f0] font-semibold">
            {playerName}
          </span>
        </div>

        {/* 25-Second Timer Bar */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold">
            <span className="text-[#7FDBFF] flex items-center gap-1">
              ⏱️ Waktu Menjawab:
            </span>
            <span
              className={`font-mono text-xs sm:text-sm px-2 py-0.5 rounded-md ${
                timeLeft <= 5 ? 'bg-rose-600 text-white font-black animate-bounce' : 'text-[#FFDC00]'
              }`}
            >
              {timeLeft} detik
            </span>
          </div>
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        </div>

        {/* Question Text */}
        <div className="p-3 sm:p-4 md:p-5 rounded-2xl bg-black/40 border border-white/10 text-center text-sm sm:text-base md:text-lg font-bold text-white leading-relaxed">
          {question.question}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
            const optVal = question[`option${optKey}` as keyof Question];
            const isCorrectAnswer = (optKey === question.answer);
            const isChosen = (selectedOpt === optKey);

            let btnStyle = 'bg-[#00244d]/90 border-[#39CCCC]/40 hover:border-[#FFDC00] hover:bg-[#003b7d]';
            if (isAnswered) {
              if (isCorrectAnswer) {
                btnStyle = 'bg-emerald-600 border-emerald-300 text-white shadow-[0_0_18px_rgba(16,185,129,0.7)]';
              } else if (isChosen && !isCorrectAnswer) {
                btnStyle = 'bg-red-600 border-red-300 text-white shadow-[0_0_18px_rgba(239,68,68,0.7)]';
              } else {
                btnStyle = 'bg-white/5 border-white/10 text-white/50 opacity-60';
              }
            }

            return (
              <button
                key={optKey}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(optKey)}
                className={`p-3 sm:p-4 rounded-2xl border-2 flex items-center gap-2.5 sm:gap-3 text-left font-bold text-xs sm:text-sm md:text-base transition-all cursor-pointer ${btnStyle}`}
              >
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 flex items-center justify-center text-xs flex-shrink-0">
                  {optKey}
                </span>
                <span className="flex-1 leading-snug">{optVal}</span>
              </button>
            );
          })}
        </div>

        {/* Alert & Explanation */}
        {isAnswered && (
          <div className="flex flex-col gap-2">
            {isTimeout ? (
              <div className="p-2.5 rounded-xl bg-rose-600/30 border border-rose-500 text-xs sm:text-sm text-rose-200 font-bold flex items-center gap-2">
                <span>⏰</span>
                <span>Waktu Habis! Nyawa berkurang 1 ❤️ (-1).</span>
              </div>
            ) : selectedOpt === question.answer ? (
              <div className="p-2.5 rounded-xl bg-emerald-600/30 border border-emerald-500 text-xs sm:text-sm text-emerald-200 font-bold flex items-center gap-2">
                <span>✅</span>
                <span>Jawabanmu Benar! Pecahan luar biasa!</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-rose-600/30 border border-rose-500 text-xs sm:text-sm text-rose-200 font-bold flex items-center gap-2">
                <span>❌</span>
                <span>Jawaban Kurang Tepat. Nyawa berkurang 1 ❤️ (-1).</span>
              </div>
            )}

            <div className="p-3 sm:p-4 rounded-xl bg-black/45 border-l-4 border-[#FFDC00] text-xs sm:text-sm text-[#e0f0ff] leading-relaxed">
              <strong className="text-[#FFDC00] block mb-0.5">💡 Pembahasan Cerdas:</strong>
              {question.explanation || 'Tetap semangat berlatih pecahan!'}
            </div>
          </div>
        )}

        {/* Action Button */}
        {isAnswered && (
          <button
            type="button"
            onClick={() => {
              seaAudio.klik();
              onClose();
            }}
            className="self-end py-2.5 px-5 sm:py-3 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer mt-1"
          >
            Lanjut Berpetualang ➔
          </button>
        )}

      </div>
    </div>
  );
};
