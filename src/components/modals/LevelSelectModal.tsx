import React from 'react';
import { seaAudio } from '../../game/audio.ts';

interface LevelSelectModalProps {
  unlockedLevels: number[];
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  unlockedLevels,
  onSelectLevel,
  onClose
}) => {
  const isL2Unlocked = unlockedLevels.includes(2);
  const isL3Unlocked = unlockedLevels.includes(3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 sm:gap-5 text-white my-auto">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-xl md:text-2xl font-black flex items-center gap-2">
            <span>🎯</span> Pilih Tingkat Petualangan (Tujuan Pembelajaran)
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs md:text-sm text-[#b8d4f0] leading-relaxed">
          Pilihlah zona samudra yang ingin kamu jelajahi. Setiap level terdiri dari 5 soal pecahan yang terhubung langsung dengan Capaian Pembelajaran Matematika SD.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          
          {/* Level 1: Terumbu Karang Dangkal */}
          <div
            id="btn-choose-lvl-1"
            onClick={() => {
              seaAudio.klik();
              onSelectLevel(1);
            }}
            className="p-5 rounded-2xl bg-[#00172e]/90 border-2 border-[#39CCCC]/50 hover:border-[#FFDC00] hover:shadow-[0_8px_24px_rgba(255,220,0,0.35)] flex flex-col gap-3 cursor-pointer transition-all"
          >
            <span className="w-fit px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-[#39CCCC]/25 text-[#39CCCC] border border-[#39CCCC]">
              🌊 ZONA 1 (TERBUKA)
            </span>
            <h4 className="text-lg font-bold text-white">Terumbu Karang Dangkal</h4>
            <p className="text-xs text-[#b8d4f0] leading-relaxed">
              <strong>TP 1:</strong> Membandingkan & mengurutkan pecahan (pembilang 1 dan penyebut sama).
            </p>
            <div className="mt-auto pt-2 text-[11px] text-[#FFDC00] font-bold">
              ✨ 5 Soal di taman karang tropis.
            </div>
          </div>

          {/* Level 2: Kapal Karam Misterius */}
          <div
            id="btn-choose-lvl-2"
            onClick={() => {
              if (!isL2Unlocked) {
                alert('Level 2 masih terkunci! Selesaikan Level 1 terlebih dahulu.');
                return;
              }
              seaAudio.klik();
              onSelectLevel(2);
            }}
            className={`p-5 rounded-2xl bg-[#00172e]/90 border-2 flex flex-col gap-3 transition-all ${
              isL2Unlocked
                ? 'border-[#7FDBFF]/50 hover:border-[#FFDC00] hover:shadow-[0_8px_24px_rgba(255,220,0,0.35)] cursor-pointer'
                : 'border-white/15 opacity-55 cursor-not-allowed grayscale'
            }`}
          >
            <span className={`w-fit px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
              isL2Unlocked ? 'bg-[#7FDBFF]/25 text-[#7FDBFF] border-[#7FDBFF]' : 'bg-white/10 text-white/50 border-white/20'
            }`}>
              {isL2Unlocked ? '⭐ ZONA 2 (TERBUKA)' : '🔒 TERKUNCI (Selesaikan L1)'}
            </span>
            <h4 className="text-lg font-bold text-white">Kapal Karam Misterius</h4>
            <p className="text-xs text-[#b8d4f0] leading-relaxed">
              <strong>TP 2:</strong> Mengenali pecahan senilai menggunakan gambar dan simbol.
            </p>
            <div className="mt-auto pt-2 text-[11px] text-[#FFDC00] font-bold">
              ⚓ 5 Soal di bangkai kapal bajak laut.
            </div>
          </div>

          {/* Level 3: Palung Mariana */}
          <div
            id="btn-choose-lvl-3"
            onClick={() => {
              if (!isL3Unlocked) {
                alert('Level 3 masih terkunci! Selesaikan Level 2 terlebih dahulu.');
                return;
              }
              seaAudio.klik();
              onSelectLevel(3);
            }}
            className={`p-5 rounded-2xl bg-[#00172e]/90 border-2 flex flex-col gap-3 transition-all ${
              isL3Unlocked
                ? 'border-[#FFDC00]/50 hover:border-[#FFDC00] hover:shadow-[0_8px_24px_rgba(255,220,0,0.35)] cursor-pointer'
                : 'border-white/15 opacity-55 cursor-not-allowed grayscale'
            }`}
          >
            <span className={`w-fit px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
              isL3Unlocked ? 'bg-[#FFDC00]/25 text-[#FFDC00] border-[#FFDC00]' : 'bg-white/10 text-white/50 border-white/20'
            }`}>
              {isL3Unlocked ? '⭐ ZONA 3 (TERBUKA)' : '🔒 TERKUNCI (Selesaikan L2)'}
            </span>
            <h4 className="text-lg font-bold text-white">Palung Mariana & Gua Harta</h4>
            <p className="text-xs text-[#b8d4f0] leading-relaxed">
              <strong>TP 3:</strong> Mengubah dan membandingkan pecahan desimal & persen.
            </p>
            <div className="mt-auto pt-2 text-[11px] text-[#FFDC00] font-bold">
              💎 5 Soal di palung abisal bercahaya.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
