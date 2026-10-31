import React from 'react';
import { AUTHOR_NAME, COLOR_GRADIENTS } from '../game/constants.ts';
import { AvatarProfile, ModalType } from '../types/game.ts';
import { seaAudio } from '../game/audio.ts';
import { LogoHeader } from '../components/LogoHeader.tsx';

interface HomePageProps {
  avatar: AvatarProfile | null;
  avatarsCount: number;
  highScore: number;
  onOpenModal: (modal: ModalType) => void;
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
}

interface MenuCardProps {
  id: string;
  icon: string;
  iconClassName: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  onClick: () => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ id, icon, iconClassName, title, description, badge, onClick }) => (
  <button
    id={id}
    type="button"
    onClick={() => {
      seaAudio.klik();
      onClick();
    }}
    className="group w-full text-left p-4 sm:p-5 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 hover:border-[#FFDC00] focus-visible:border-[#FFDC00] focus-visible:outline-none shadow-lg flex flex-row sm:flex-col items-start gap-3 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-[0.98]"
  >
    <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border ${iconClassName}`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1 flex flex-col gap-1.5 sm:gap-2 h-full">
      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#FFDC00] transition-colors leading-snug">
        {title}
      </h3>
      <p className="text-xs text-[#b8d4f0] leading-relaxed">{description}</p>
      {badge && <div className="mt-auto pt-1">{badge}</div>}
    </div>
  </button>
);

export const HomePage: React.FC<HomePageProps> = ({
  avatar,
  avatarsCount,
  highScore,
  onOpenModal,
  onStartSinglePlayer,
  onStartMultiplayer
}) => {
  return (
    <div className="max-w-6xl mx-auto w-full px-3 py-4 sm:p-6 pb-12 flex flex-col gap-4 sm:gap-6 relative z-10 animate-fadeIn">
      {/* Header: Logo Pemkab (kiri) · Judul · Logo PGRI (kanan) */}
      <header className="w-full p-3 sm:p-5 md:p-6 rounded-3xl bg-[#041d3e]/90 border-[1.5px] border-[#39CCCC]/40 backdrop-blur-md shadow-xl flex flex-col gap-3 sm:gap-4">
        <LogoHeader>
          <h2 className="text-[clamp(0.95rem,3.6vw,1.75rem)] font-black text-white leading-tight">
            <span className="hidden min-[360px]:inline">🌊 </span>Petualangan Pecahan Bawah Laut
          </h2>
          <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-[#FFDC00] mt-1 leading-snug line-clamp-2">
            {AUTHOR_NAME}
          </p>
        </LogoHeader>

        {/* Profile User Status & Switcher */}
        <button
          type="button"
          onClick={() => {
            seaAudio.klik();
            onOpenModal('avatar');
          }}
          className="w-full sm:w-auto sm:self-center flex items-center gap-3 bg-[#00142e]/85 border border-[#39CCCC]/40 hover:border-[#FFDC00] rounded-2xl px-3 sm:px-4 py-2 cursor-pointer transition-all shadow-md group text-left"
          title="Klik untuk ganti atau buat avatar baru"
        >
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md shrink-0 group-hover:scale-105 transition-transform"
            style={{
              background: avatar ? COLOR_GRADIENTS[avatar.color] || COLOR_GRADIENTS.blue : 'rgba(255, 255, 255, 0.15)'
            }}
          >
            {avatar ? avatar.emoji : '❓'}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[11px] text-[#b8d4f0]">Pemain Aktif</div>
            <strong className="text-sm sm:text-base text-white block truncate">
              {avatar ? avatar.name : 'Buat Avatar'}
            </strong>
          </div>
          <div className="shrink-0 text-right leading-tight pl-2 border-l border-white/10">
            <div className="text-xs text-[#FFDC00] font-black">
              🏆 {avatar ? avatar.totalScore : highScore}
            </div>
            <div className="text-[10px] text-[#39CCCC] underline mt-0.5">Ganti ({avatarsCount})</div>
          </div>
        </button>
      </header>

      {/* Single Player (Featured) */}
      <button
        id="btn-menu-play-single"
        type="button"
        onClick={() => {
          seaAudio.klik();
          onStartSinglePlayer();
        }}
        className="w-full text-left p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0074D9]/85 via-[#004b87]/90 to-[#041d3e]/95 border-2 border-[#FFDC00] shadow-[0_8px_30px_rgba(0,116,217,0.4)] flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:shadow-[0_12px_36px_rgba(255,220,0,0.35)] transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#FFDC00]/20 border border-[#FFDC00]/40 flex items-center justify-center text-3xl shrink-0">
            🎮
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight">
              Mulai Petualangan <span className="text-[#FFDC00] text-sm sm:text-lg font-bold whitespace-nowrap">(Single Player)</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#d0e6ff] mt-1 leading-relaxed">
              Jelajahi 3 Zona Samudra: Terumbu Karang, Kapal Karam, & Palung Mariana. Cari gelembung soal dan kumpulkan mutiara!
            </p>
          </div>
        </div>
        <span className="w-full md:w-auto text-center py-3 px-6 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md whitespace-nowrap">
          PILIH LEVEL ➔
        </span>
      </button>

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        <MenuCard
          id="btn-menu-play-multi"
          icon="⚔️"
          iconClassName="bg-[#39CCCC]/20 border-[#39CCCC]/40"
          title="Multiplayer Antar-Device (Room)"
          description="Tanding bersama teman di perangkat berbeda via Room Kode! Berebut 15 soal & mutiara secara real-time."
          badge={
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#39CCCC]/25 text-[#39CCCC] border border-[#39CCCC]/50">
              Real-time Room
            </span>
          }
          onClick={onStartMultiplayer}
        />

        <MenuCard
          id="btn-menu-avatar"
          icon="🐠"
          iconClassName="bg-white/10 border-white/20"
          title={`Kelola & Ganti Avatar (${avatarsCount})`}
          description="Buat 2 atau lebih avatar, ganti avatar pemain, dan kumpulkan skor serta mutiara pada setiap karakter."
          onClick={() => onOpenModal('avatar')}
        />

        <MenuCard
          id="btn-menu-crud"
          icon="📚"
          iconClassName="bg-[#FFDC00]/15 border-[#FFDC00]/40"
          title="Kelola Bank Soal & CSV"
          description="Akses khusus guru (dilindungi password) untuk menambah, mengedit, menghapus, serta Import/Export CSV."
          badge={
            <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/20 text-[#FFDC00] border border-amber-400/40 items-center gap-1">
              <span>🔒</span> Khusus Guru
            </span>
          }
          onClick={() => onOpenModal('teacher-auth')}
        />

        <MenuCard
          id="btn-menu-leaderboard"
          icon="🏆"
          iconClassName="bg-[#FFDC00]/20 border-[#FFDC00]/40"
          title="Papan Peringkat & Juara Umum"
          description="Peringkat juara umum & per-zona samudra. Skor total kuis pecahan dan perolehan mutiara tercatat otomatis."
          onClick={() => onOpenModal('leaderboard')}
        />

        <MenuCard
          id="btn-menu-settings"
          icon="⚙️"
          iconClassName="bg-white/10 border-white/20"
          title="Pengaturan & Tujuan Belajar"
          description="Tujuan Pembelajaran TP 1, 2, 3 Matematika SD, kontrol audio, & reset data."
          onClick={() => onOpenModal('settings')}
        />

        <MenuCard
          id="btn-menu-guide"
          icon="❓"
          iconClassName="bg-white/10 border-white/20"
          title="Petunjuk Cara Bermain"
          description="Pelajari cara navigasi, gelembung soal stasioner, mutiara bonus, & sengatan ubur-ubur."
          onClick={() => onOpenModal('guide')}
        />
      </div>
    </div>
  );
};
