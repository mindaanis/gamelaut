import React, { useState } from 'react';
import { AVATAR_EMOJIS, COLOR_GRADIENTS } from '../../game/constants.ts';
import { AvatarProfile } from '../../types/game.ts';
import { seaAudio } from '../../game/audio.ts';

interface AvatarModalProps {
  avatars: AvatarProfile[];
  activeAvatarId: string | null;
  onSelectAvatar: (avatarId: string) => void;
  onCreateAvatar: (avatar: AvatarProfile) => boolean;
  onDeleteAvatar: (avatarId: string) => void;
  onClose: () => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  avatars,
  activeAvatarId,
  onSelectAvatar,
  onCreateAvatar,
  onDeleteAvatar,
  onClose
}) => {
  // If no avatars exist yet, default directly to create mode
  const [isCreating, setIsCreating] = useState(avatars.length === 0);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🐠');
  const [color, setColor] = useState<'blue' | 'coral' | 'gold' | 'green' | 'purple'>('blue');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Nama pemain wajib diisi!');
      seaAudio.salahkan();
      return;
    }

    // Check duplicate name
    const isDuplicate = avatars.some(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg(`Avatar dengan nama "${trimmed}" sudah ada! Pilih nama lain.`);
      seaAudio.salahkan();
      return;
    }

    const newAvatar: AvatarProfile = {
      id: `AVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed.slice(0, 15),
      emoji,
      color,
      totalScore: 0,
      totalPearls: 0,
      totalCorrect: 0,
      totalWrong: 0,
      gamesPlayed: 0,
      zoneScores: { 1: 0, 2: 0, 3: 0 },
      createdAt: new Date().toISOString(),
      lastPlayed: new Date().toISOString()
    };

    const success = onCreateAvatar(newAvatar);
    if (success) {
      seaAudio.levelUp();
      setName('');
      setIsCreating(false);
      setErrorMsg(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 sm:gap-5 text-white my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🐠</span> {isCreating ? 'Buat Avatar Baru' : 'Kelola & Ganti Avatar'}
          </h3>
          <button
            onClick={() => {
              seaAudio.klik();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher / Action Bar */}
        {avatars.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                seaAudio.klik();
                setIsCreating(false);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                !isCreating
                  ? 'bg-[#39CCCC] text-[#00172e] shadow-md'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              👥 Pilih / Ganti Avatar ({avatars.length})
            </button>
            <button
              onClick={() => {
                seaAudio.klik();
                setIsCreating(true);
                setErrorMsg(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isCreating
                  ? 'bg-[#FFDC00] text-[#00172e] shadow-md'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              ➕ Buat Avatar Baru
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            VIEW 1: LIST AVATARS (Pilih / Ganti Avatar)
            ═══════════════════════════════════════════════ */}
        {!isCreating && avatars.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#b8d4f0]">
              Pilih avatar yang ingin kamu mainkan. Semua skor dan mutiara melekat pada avatar masing-masing:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto p-1">
              {avatars.map((avt) => {
                const isActive = avt.id === activeAvatarId;
                return (
                  <div
                    key={avt.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col gap-3 transition-all ${
                      isActive
                        ? 'bg-[#002b5e] border-[#FFDC00] shadow-[0_0_18px_rgba(255,220,0,0.35)]'
                        : 'bg-[#00142e]/85 border-[#39CCCC]/30 hover:border-[#39CCCC]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-3xl border-2 border-white shadow-md flex-shrink-0"
                        style={{ background: COLOR_GRADIENTS[avt.color] || COLOR_GRADIENTS.blue }}
                      >
                        {avt.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-base text-white truncate block">
                            {avt.name}
                          </strong>
                          {isActive && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#2ECC40]/25 text-[#2ECC40] border border-[#2ECC40]/50">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#FFDC00] font-black mt-0.5">
                          🏆 Skor Total: {avt.totalScore}
                        </div>
                        <div className="text-[11px] text-[#b8d4f0] flex items-center gap-2 mt-0.5">
                          <span>🦪 {avt.totalPearls}</span>
                          <span>•</span>
                          <span>✓ {avt.totalCorrect} Benar</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-auto pt-1">
                      {isActive ? (
                        <div className="flex-1 py-2 text-center text-xs font-bold text-[#FFDC00] bg-[#FFDC00]/15 rounded-xl border border-[#FFDC00]/40">
                          ✓ Avatar Sedang Dipakai
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            seaAudio.levelUp();
                            onSelectAvatar(avt.id);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#39CCCC] to-[#0074D9] text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow"
                        >
                          Ganti ke Avatar Ini ➔
                        </button>
                      )}

                      {avatars.length > 1 && (
                        <button
                          onClick={() => {
                            seaAudio.klik();
                            onDeleteAvatar(avt.id);
                          }}
                          title="Hapus Avatar"
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white/70 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            VIEW 2: CREATE NEW AVATAR FORM
            ═══════════════════════════════════════════════ */}
        {isCreating && (
          <div className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-600/30 border border-rose-500 text-xs text-rose-200 font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Live Preview */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/30 border border-dashed border-white/30 gap-1.5">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow-xl transition-all"
                style={{ background: COLOR_GRADIENTS[color] }}
              >
                {emoji}
              </div>
              <strong className="text-base text-white font-black mt-1">
                {name.trim() || 'Penyelam Cerdas'}
              </strong>
              <span className="text-[11px] text-[#a0c8f0]">SDN 2 Jatiroto - Wonogiri</span>
            </div>

            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#7FDBFF]">
                Nama Avatar Pemain (Maks 15 Karakter):
              </label>
              <input
                type="text"
                value={name}
                maxLength={15}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Contoh: Budi, Siti, Penyelam1..."
                className="w-full px-4 py-3 rounded-xl bg-[#000f21] border border-[#39CCCC]/40 text-white font-medium outline-none focus:border-[#FFDC00]"
              />
            </div>

            {/* Emoji Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#7FDBFF]">
                Pilih Karakter Biota Laut:
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      seaAudio.klik();
                      setEmoji(e);
                    }}
                    className={`h-12 rounded-xl text-2xl flex items-center justify-center border transition-all cursor-pointer ${
                      emoji === e
                        ? 'border-[#FFDC00] bg-[#FFDC00]/25 shadow-[0_0_12px_rgba(255,220,0,0.5)] scale-105'
                        : 'border-white/15 bg-white/5 hover:bg-white/15'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Aura */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#7FDBFF]">
                Pilih Warna Aura Avatar:
              </label>
              <div className="flex gap-3 justify-center py-1">
                {(['blue', 'coral', 'gold', 'green', 'purple'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      seaAudio.klik();
                      setColor(c);
                    }}
                    className={`w-9 h-9 rounded-full border-2 transition-all cursor-pointer ${
                      color === c
                        ? 'border-white scale-120 shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                        : 'border-transparent'
                    }`}
                    style={{ background: COLOR_GRADIENTS[c] }}
                  />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-xl font-bold text-xs md:text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                💾 Simpan & Gunakan Avatar
              </button>
              {avatars.length > 0 && (
                <button
                  onClick={() => {
                    seaAudio.klik();
                    setIsCreating(false);
                    setErrorMsg(null);
                  }}
                  className="px-5 py-3.5 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all cursor-pointer"
                >
                  Kembali
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
