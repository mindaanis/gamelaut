import React from 'react';
import { AUTHOR_NAME } from '../game/constants.ts';
import { seaAudio } from '../game/audio.ts';

interface SplashScreenProps {
  onStart: () => void;
  onOpenGuide: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, onOpenGuide }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 relative z-10 text-center animate-fadeIn overflow-y-auto">
      <div className="max-w-[760px] w-full max-h-[95vh] overflow-y-auto p-5 sm:p-8 md:p-10 rounded-[24px] sm:rounded-[28px] bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 sm:gap-6 my-auto">
        
        {/* Logo Resmi PGRI & Pemkab Wonogiri */}
        <div className="flex flex-wrap gap-5 items-center justify-center">
          <div className="flex items-center gap-3 bg-[#000f21]/80 border-[1.5px] border-[#39CCCC]/50 rounded-2xl px-4 py-2.5 shadow-inner">
            <img
              src="https://lh3.googleusercontent.com/d/108U4lxE-NSOpI9tr8VahupSz69xFcfkj"
              alt="Logo Resmi PGRI"
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain filter drop-shadow-md flex-shrink-0"
            />
            <div className="text-left leading-tight">
              <strong className="text-[#FFDC00] text-sm block">PGRI</strong>
              <span className="text-[#b8d4f0] text-xs">Cabang Jatiroto, Wonogiri</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[#000f21]/80 border-[1.5px] border-[#39CCCC]/50 rounded-2xl px-4 py-2.5 shadow-inner">
            <img
              src="https://lh3.googleusercontent.com/d/13yDyw7PMGhR2jEdXngjCseJtnRhd4eP5"
              alt="Logo Pemkab Wonogiri"
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-contain filter drop-shadow-md flex-shrink-0"
            />
            <div className="text-left leading-tight">
              <strong className="text-[#FFDC00] text-sm block">PEMKAB WONOGIRI</strong>
              <span className="text-[#b8d4f0] text-xs">Kabupaten Wonogiri</span>
            </div>
          </div>
        </div>

        {/* Banner Juknis Lomba */}
        <div className="bg-gradient-to-r from-red-500/20 via-yellow-400/20 to-emerald-400/20 border border-[#FFDC00]/50 rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-[#FFDC00] text-center shadow-sm">
          HUT Ke-81 PGRI & HGN 2026 <br/> Lomba Pembuatan Game Edukasi Berbasis AI
        </div>

        {/* Judul & Subjudul Game */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-b from-white via-[#7FDBFF] to-[#FFDC00] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,116,217,0.8)]">
            Petualangan Pecahan Bawah Laut
          </h1>
          <p className="text-base md:text-lg text-[#c4e4ff] font-semibold">
            Belajar Pecahan Seru Bersama Ikan Cerdas
          </p>
        </div>

        {/* Identitas Resmi Pengembang */}
        <div className="bg-[#00142e]/70 border border-dashed border-[#39CCCC]/40 rounded-2xl p-4 text-xs md:text-sm text-[#e0f0ff] leading-relaxed max-w-lg">
          <p className="text-[#99ccff]">Pengembang Game:</p>
          <strong className="text-[#FFDC00] text-sm md:text-base block mt-0.5">
            {AUTHOR_NAME}
          </strong>
          <p className="text-[11px] text-[#a0c8f0] mt-1">
            Media Pembelajaran Interaktif Matematika SD  (Fase B Kelas 4)
          </p>
        </div>

        {/* Tombol Aksi (Splash screen tidak auto-close) */}
        <div className="flex flex-wrap gap-4 justify-center w-full mt-2">
          <button
            id="btn-splash-start"
            onClick={() => {
              seaAudio.klik();
              onStart();
            }}
            className="flex-1 min-w-[200px] max-w-[280px] py-3.5 px-6 rounded-2xl font-bold text-base bg-gradient-to-br from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-[0_4px_20px_rgba(255,220,0,0.45)] hover:shadow-[0_6px_28px_rgba(255,220,0,0.7)] active:scale-95 transition-all cursor-pointer"
          >
            🎮 Mulai Petualangan
          </button>
          <button
            id="btn-splash-guide"
            onClick={() => {
              seaAudio.klik();
              onOpenGuide();
            }}
            className="py-3.5 px-6 rounded-2xl font-bold text-base bg-white/10 hover:bg-white/20 border border-white/25 text-white active:scale-95 transition-all cursor-pointer"
          >
            ❓ Petunjuk Singkat
          </button>
        </div>

      </div>
    </div>
  );
};
