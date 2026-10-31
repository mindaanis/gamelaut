import React from 'react';
import { AUTHOR_NAME, COLOR_GRADIENTS } from '../game/constants.ts';
import { AvatarProfile, ModalType } from '../types/game.ts';
import { seaAudio } from '../game/audio.ts';

interface HomePageProps {
  avatar: AvatarProfile | null;
  avatarsCount: number;
  highScore: number;
  onOpenModal: (modal: ModalType) => void;
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  avatar,
  avatarsCount,
  highScore,
  onOpenModal,
  onStartSinglePlayer,
  onStartMultiplayer
}) => {
  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-6 pb-16 flex flex-col gap-6 relative z-10 animate-fadeIn">
      {/* Top Banner Identitas Pengembang dengan Logo Resmi PGRI & Pemkab Wonogiri */}
      <div className="w-full p-5 md:p-6 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-center md:text-left">
          {/* Logo PGRI & Pemkab Wonogiri */}
          <div className="flex items-center gap-2.5 bg-[#001024]/80 p-1.5 px-3 rounded-2xl border border-white/10">
            <img
              src="https://lh3.googleusercontent.com/d/108U4lxE-NSOpI9tr8VahupSz69xFcfkj"
              alt="Logo PGRI"
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain filter drop-shadow"
            />
            <img
              src="https://lh3.googleusercontent.com/d/13yDyw7PMGhR2jEdXngjCseJtnRhd4eP5"
              alt="Logo Pemkab Wonogiri"
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-contain filter drop-shadow"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-2xl">🌊</span>
              <h2 className="text-xl md:text-2xl font-black text-white">
                Petualangan Pecahan Bawah Laut
              </h2>
            </div>
            <p className="text-xs md:text-sm font-semibold text-[#FFDC00] mt-0.5">
              {AUTHOR_NAME}
            </p>
          </div>
        </div>

        {/* Profile User Status & Switcher */}
        <div
          onClick={() => {
            seaAudio.klik();
            onOpenModal('avatar');
          }}
          className="flex items-center gap-3.5 bg-[#00142e]/85 border border-[#39CCCC]/40 hover:border-[#FFDC00] rounded-2xl px-4 py-2.5 cursor-pointer transition-all shadow-md group"
          title="Klik untuk ganti atau buat avatar baru"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{
              background: avatar ? COLOR_GRADIENTS[avatar.color] || COLOR_GRADIENTS.blue : 'rgba(255, 255, 255, 0.15)'
            }}
          >
            {avatar ? avatar.emoji : '❓'}
          </div>
          <div className="leading-tight text-left">
            <div className="text-[11px] text-[#b8d4f0] flex items-center justify-between gap-2">
              <span>Pemain Aktif</span>
              <span className="text-[10px] text-[#39CCCC] underline">Ganti ({avatarsCount})</span>
            </div>
            <strong className="text-sm md:text-base text-white block truncate max-w-[130px]">
              {avatar ? avatar.name : 'Buat Avatar'}
            </strong>
            <div className="text-xs text-[#FFDC00] font-black mt-0.5">
              Skor: {avatar ? avatar.totalScore : highScore}
            </div>
          </div>
        </div>
      </div>

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Single Player (Featured) */}
        <div
          id="btn-menu-play-single"
          onClick={() => {
            seaAudio.klik();
            onStartSinglePlayer();
          }}
          className="col-span-1 md:col-span-2 lg:col-span-3 p-6 rounded-3xl bg-gradient-to-r from-[#0074D9]/85 via-[#004b87]/90 to-[#041d3e]/95 border-2 border-[#FFDC00] shadow-[0_8px_30px_rgba(0,116,217,0.4)] flex flex-col md:flex-row items-center justify-between gap-5 cursor-pointer hover:shadow-[0_12px_36px_rgba(255,220,0,0.35)] transition-all"
        >
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-[#FFDC00]/20 border border-[#FFDC00]/40 flex items-center justify-center text-3xl flex-shrink-0">
              🎮
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">
                Mulai Petualangan (Single Player)
              </h3>
              <p className="text-xs md:text-sm text-[#d0e6ff] mt-1">
                Jelajahi 3 Zona Samudra: Terumbu Karang, Kapal Karam, & Palung Mariana. Cari gelembung soal dan kumpulkan mutiara!
              </p>
            </div>
          </div>
          <button className="py-3 px-6 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] pointer-events-none shadow-md">
            PILIH LEVEL ➔
          </button>
        </div>

        {/* Multiplayer Lintas Device */}
        <div
          id="btn-menu-play-multi"
          onClick={() => {
            seaAudio.klik();
            onStartMultiplayer();
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#39CCCC]/20 border border-[#39CCCC]/40 flex items-center justify-center text-3xl">
            ⚔️
          </div>
          <h3 className="text-lg font-bold text-white">Multiplayer Antar-Device (Room)</h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Tanding bersama teman di perangkat berbeda via Room Kode! Berebut 15 soal & mutiara secara real-time.
          </p>
          <div className="mt-auto pt-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#39CCCC]/25 text-[#39CCCC] border border-[#39CCCC]/50">
              Real-time WebSocket Room
            </span>
          </div>
        </div>

        {/* Avatar Creator & Switcher */}
        <div
          id="btn-menu-avatar"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('avatar');
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl">
            🐠
          </div>
          <h3 className="text-lg font-bold text-white">Kelola & Ganti Avatar ({avatarsCount})</h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Buat 2 atau lebih avatar, ganti avatar pemain, dan kumpulkan skor serta mutiara pada setiap karakter.
          </p>
        </div>

        {/* Kelola Soal & Bank Soal CSV (Password Akses Guru) */}
        <div
          id="btn-menu-crud"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('teacher-auth');
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-2xl bg-[#FFDC00]/15 border border-[#FFDC00]/40 flex items-center justify-center text-3xl">
              📚
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/20 text-[#FFDC00] border border-amber-400/40 flex items-center gap-1">
              <span>🔒</span> Khusus Guru
            </span>
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-[#FFDC00] transition-colors">
            Kelola Bank Soal & CSV
          </h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Akses khusus guru (dilindungi password) untuk menambah, mengedit, menghapus, serta Import/Export CSV.
          </p>
        </div>

        {/* Leaderboard & Database Pengguna CSV */}
        <div
          id="btn-menu-leaderboard"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('leaderboard');
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#FFDC00]/20 border border-[#FFDC00]/40 flex items-center justify-center text-3xl">
            🏆
          </div>
          <h3 className="text-lg font-bold text-white">Papan Peringkat & Juara Umum</h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Peringkat juara umum & per-zona samudra. Skor total kuis pecahan dan perolehan mutiara tercatat otomatis.
          </p>
        </div>

        {/* Pengaturan & Capaian Pembelajaran */}
        <div
          id="btn-menu-settings"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('settings');
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl">
            ⚙️
          </div>
          <h3 className="text-lg font-bold text-white">Pengaturan & Tujuan Belajar</h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Tujuan Pembelajaran TP 1, 2, 3 Matematika SD, kontrol audio Web Audio API, & reset data.
          </p>
        </div>

        {/* Petunjuk Bermain */}
        <div
          id="btn-menu-guide"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('guide');
          }}
          className="p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] shadow-lg flex flex-col gap-3 cursor-pointer transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl">
            ❓
          </div>
          <h3 className="text-lg font-bold text-white">Petunjuk Cara Bermain</h3>
          <p className="text-xs text-[#b8d4f0] leading-relaxed">
            Pelajari cara navigasi, gelembung soal stasioner, mutiara bonus, & sengatan ubur-ubur.
          </p>
        </div>

      </div>
    </div>
  );
};
