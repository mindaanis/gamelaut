import React, { useState } from 'react';
import { seaAudio } from '../../game/audio.ts';

interface MultiplayerModalProps {
  playerName: string;
  playerAvatar: string;
  onJoinOrCreateRoom: (roomId: string, level: number, isHost: boolean) => void;
  onStartGame: () => void;
  onClose: () => void;
  roomConnected: boolean;
  roomStatus: 'idle' | 'waiting' | 'ready';
  currentRoomId: string;
  networkMessage?: string;
  p1Info?: { name: string; avatar: string };
  p2Info?: { name: string; avatar: string };
  isHost: boolean;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  playerAvatar,
  onJoinOrCreateRoom,
  onStartGame,
  onClose,
  roomConnected,
  roomStatus,
  currentRoomId,
  networkMessage,
  p1Info,
  p2Info,
  isHost
}) => {
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [hostCode, setHostCode] = useState('LAUT81');
  const [joinCode, setJoinCode] = useState('');
  const [selectedZone, setSelectedZone] = useState(1);

  const handleRandomizeCode = () => {
    seaAudio.klik();
    setHostCode('LAUT' + Math.floor(Math.random() * 89 + 10));
  };

  const handleHostRoom = () => {
    if (!hostCode.trim()) return;
    seaAudio.klik();
    onJoinOrCreateRoom(hostCode.trim().toUpperCase(), selectedZone, true);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      alert('Masukkan kode room terlebih dahulu!');
      return;
    }
    seaAudio.klik();
    onJoinOrCreateRoom(joinCode.trim().toUpperCase(), selectedZone, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 sm:gap-5 text-white my-auto">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>⚔️</span> Multiplayer Samudra Antar-Device
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!roomConnected ? (
          <>
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-black/30 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  seaAudio.klik();
                  setActiveTab('host');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'host' ? 'bg-[#39CCCC] text-[#00172e] shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                🏠 Buat Room (Host)
              </button>
              <button
                type="button"
                onClick={() => {
                  seaAudio.klik();
                  setActiveTab('join');
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'join' ? 'bg-[#39CCCC] text-[#00172e] shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                🔗 Gabung Room
              </button>
            </div>

            {/* Host Form */}
            {activeTab === 'host' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#7FDBFF]">Kode Room Petualangan:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hostCode}
                      maxLength={8}
                      onChange={(e) => setHostCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-3 rounded-xl bg-[#000f21] border border-[#39CCCC]/40 text-white font-extrabold tracking-widest uppercase outline-none focus:border-[#FFDC00]"
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeCode}
                      className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer"
                    >
                      Acak
                    </button>
                  </div>
                  <span className="text-[11px] text-[#b8d4f0]">
                    Bagikan kode ini kepada teman di HP/laptop lain agar dapat bertanding bersamamu.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#7FDBFF]">Pilih Zona Petualangan (15 Soal Kontinu):</label>
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-[#000f21] border border-[#39CCCC]/40 text-white text-xs md:text-sm font-semibold outline-none focus:border-[#FFDC00]"
                  >
                    <option value={1}>🌊 ZONA 1: Terumbu Karang Dangkal (TP 1: Perbandingan & Pengurutan)</option>
                    <option value={2}>⚓ ZONA 2: Kapal Karam Misterius (TP 2: Pecahan Senilai)</option>
                    <option value={3}>💎 ZONA 3: Palung Mariana (TP 3: Desimal & Persen)</option>
                  </select>
                </div>

                <button
                  type="button"
                  id="btn-create-and-wait-room"
                  onClick={handleHostRoom}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#39CCCC] to-[#0074D9] text-white shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer mt-1"
                >
                  📡 Buka Room & Tunggu Lawan
                </button>
              </div>
            )}

            {/* Join Form */}
            {activeTab === 'join' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#7FDBFF]">Masukkan Kode Room dari Teman:</label>
                  <input
                    type="text"
                    value={joinCode}
                    maxLength={8}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: LAUT81"
                    className="w-full px-4 py-3 rounded-xl bg-[#000f21] border border-[#39CCCC]/40 text-white font-extrabold tracking-widest uppercase outline-none focus:border-[#FFDC00]"
                  />
                  <span className="text-[11px] text-[#b8d4f0]">
                    Ketik kode room yang dibagikan oleh Host untuk masuk ke arena pertandingan.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer mt-1"
                >
                  🚀 Masuk ke Room Lawan
                </button>
              </div>
            )}
          </>
        ) : (
          /* Waiting Room Lobby (Both connected) */
          <div id="panel-room-status" className="flex flex-col gap-4 bg-black/30 p-5 rounded-2xl border border-[#FFDC00]/40">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#FFDC00]">
                Room: {currentRoomId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                roomStatus === 'ready'
                  ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500'
                  : 'bg-amber-500/25 text-amber-300 border border-amber-500'
              }`}>
                {roomStatus === 'ready' ? '✓ Lawan Siap!' : 'Menunggu Lawan Masuk...'}
              </span>
            </div>

            {/* Network Mode Indicator for Netlify / Static Hosting */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00172e] border border-[#39CCCC]/30 text-[11px] text-[#7FDBFF]">
              <span className="animate-pulse">🌐</span>
              <span className="truncate">{networkMessage || 'Jaringan: WebRTC P2P Cloud (Mendukung Netlify & Antar-Device)'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              {/* Player 1 Card */}
              <div className="p-4 rounded-xl bg-[#00142e]/90 border border-[#39CCCC]/40 flex flex-col items-center text-center">
                <span className="text-4xl">{p1Info?.avatar || playerAvatar}</span>
                <strong className="text-sm text-white font-bold mt-1">
                  {p1Info?.name || 'Pemain 1'}
                </strong>
                <span className="text-[10px] text-emerald-400 font-bold mt-0.5">✓ Siap (Host)</span>
              </div>

              {/* Player 2 Card */}
              <div className="p-4 rounded-xl bg-[#00142e]/90 border border-[#39CCCC]/40 flex flex-col items-center text-center">
                <span className="text-4xl">{p2Info?.avatar || (roomStatus === 'ready' ? '🐬' : '⏳')}</span>
                <strong className="text-sm text-white font-bold mt-1">
                  {p2Info?.name || (roomStatus === 'ready' ? 'Pemain 2' : 'Menunggu...')}
                </strong>
                <span className={`text-[10px] font-bold mt-0.5 ${
                  roomStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {roomStatus === 'ready' ? '✓ Terhubung' : 'Belum Masuk'}
                </span>
              </div>
            </div>

            {/* Start Button: Only host can trigger when ready, or auto-ready */}
            {isHost ? (
              <button
                type="button"
                id="btn-start-multiplayer-game"
                disabled={roomStatus !== 'ready'}
                onClick={() => {
                  seaAudio.klik();
                  onStartGame();
                }}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                  roomStatus === 'ready'
                    ? 'bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-lg active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                🎮 Mulai Petualangan Bersama!
              </button>
            ) : (
              <div className="text-center text-xs text-[#7FDBFF] font-semibold py-2">
                Menunggu Host memulai permainan...
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
