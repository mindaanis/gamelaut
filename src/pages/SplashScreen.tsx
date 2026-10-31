import React from 'react';
import { AUTHOR_NAME } from '../game/constants.ts';
import { seaAudio } from '../game/audio.ts';
import { LogoHeader } from '../components/LogoHeader.tsx';

interface SplashScreenProps {
  onStart: () => void;
  onOpenGuide: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, onOpenGuide }) => {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-3 py-4 sm:p-6 relative z-10 text-center animate-fadeIn">
      <div className="w-full max-w-[760px] p-4 sm:p-8 md:p-10 rounded-[22px] sm:rounded-[28px] bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col items-center gap-3 sm:gap-6">

        {/* Logo Pemkab Wonogiri (kiri) & PGRI (kanan) — selalu sejajar */}
        <LogoHeader>
          <div className="leading-tight">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#b8d4f0]">
              Pemkab Wonogiri · PGRI Cabang Jatiroto
            </p>
            <p className="mt-1 text-[11px] sm:text-sm font-black text-[#FFDC00]">
              HUT Ke-81 PGRI & HGN 2026
            </p>
          </div>
        </LogoHeader>

        {/* Banner Juknis Lomba */}
        <div className="w-full bg-gradient-to-r from-red-500/20 via-yellow-400/20 to-emerald-400/20 border border-[#FFDC00]/50 rounded-xl px-3 py-2 text-[11px] sm:text-sm font-bold text-[#FFDC00]">
          Lomba Pembuatan Game Edukasi Berbasis AI
        </div>

        {/* Judul & Subjudul Game */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <h1 className="text-[clamp(1.6rem,6vw,3rem)] leading-tight font-black tracking-tight bg-gradient-to-b from-white via-[#7FDBFF] to-[#FFDC00] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,116,217,0.8)]">
            Petualangan Pecahan Bawah Laut
          </h1>
          <p className="text-sm sm:text-lg text-[#c4e4ff] font-semibold">
            Belajar Pecahan Seru Bersama Ikan Cerdas
          </p>
        </div>

        {/* Identitas Resmi Pengembang */}
        <div className="w-full max-w-lg bg-[#00142e]/70 border border-dashed border-[#39CCCC]/40 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm text-[#e0f0ff] leading-relaxed">
          <p className="text-[#99ccff]">Pengembang Game:</p>
          <strong className="text-[#FFDC00] text-xs sm:text-base block mt-0.5">
            {AUTHOR_NAME}
          </strong>
          <p className="text-[10px] sm:text-[11px] text-[#a0c8f0] mt-1">
            Media Pembelajaran Interaktif Matematika SD (Fase B Kelas 4)
          </p>
        </div>

        {/* Tombol Aksi (Splash screen tidak auto-close) */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 sm:gap-4 w-full max-w-lg mt-1">
          <button
            id="btn-splash-start"
            onClick={() => {
              seaAudio.klik();
              onStart();
            }}
            className="min-h-12 py-3 px-5 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-br from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-[0_4px_20px_rgba(255,220,0,0.45)] hover:shadow-[0_6px_28px_rgba(255,220,0,0.7)] active:scale-95 transition-all cursor-pointer"
          >
            🎮 Mulai Petualangan
          </button>
          <button
            id="btn-splash-guide"
            onClick={() => {
              seaAudio.klik();
              onOpenGuide();
            }}
            className="min-h-12 py-3 px-5 rounded-2xl font-bold text-sm sm:text-base bg-white/10 hover:bg-white/20 border border-white/25 text-white active:scale-95 transition-all cursor-pointer"
          >
            ❓ Petunjuk Singkat
          </button>
        </div>

      </div>
    </div>
  );
};
