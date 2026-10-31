import React from 'react';
import { AUTHOR_NAME } from '../../game/constants.ts';
import { seaAudio } from '../../game/audio.ts';

interface SettingsModalProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  soundEnabled,
  onToggleSound,
  onResetData,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-4 text-white my-auto">
        
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>⚙️</span> Pengaturan & Tujuan Pembelajaran (TP)
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3.5 text-xs md:text-sm text-[#e0f0ff] leading-relaxed">
          {/* Tujuan Pembelajaran */}
          <div className="bg-[#00142e]/80 border border-[#39CCCC]/40 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00] mb-2">
              🎯 Capaian & Tujuan Pembelajaran Matematika SD (Fase B/C):
            </h4>
            <ul className="flex flex-col gap-1.5 pl-4 list-disc text-xs leading-normal">
              <li>
                <strong>TP 1 (Level 1):</strong> Membandingkan & mengurutkan antar-pecahan dengan pembilang satu (misal 1/2, 1/4, 1/8) dan penyebut yang sama (misal 2/7, 5/7).
              </li>
              <li>
                <strong>TP 2 (Level 2):</strong> Mengenali pecahan senilai menggunakan representasi gambar konkret, diagram luas, dan simbol matematika (misal 1/2 = 2/4 = 4/8).
              </li>
              <li>
                <strong>TP 3 (Level 3):</strong> Mengubah & menghubungkan pecahan desimal persepuluhan dan perseratusan serta pecahan biasa dengan persen (misal 0,5 = 50% = 1/2).
              </li>
            </ul>
          </div>

          {/* Identitas Resmi Pengembang */}
          <div className="bg-[#000f21]/80 border border-dashed border-[#FFDC00]/50 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-[#FFDC00]">👨‍🏫 Identitas Pengembang:</h4>
            <p className="mt-1 font-bold text-white text-sm">{AUTHOR_NAME}</p>
            <p className="text-[11px] text-[#a0c8f0] mt-0.5">
              Dibuat untuk memeriahkan HUT Ke-81 PGRI & Hari Guru Nasional (HGN) 2026.
            </p>
          </div>

          {/* Audio Engine */}
          <div className="flex items-center justify-between bg-[#00142e]/60 p-4 rounded-2xl border border-white/10">
            <div>
              <strong className="block text-sm">Efek Audio Web Audio API:</strong>
              <span className="text-xs text-[#b8d4f0]">Sintesis nada murni tanpa beban file audio eksternal.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                seaAudio.klik();
                onToggleSound();
              }}
              className="px-4 py-2 rounded-xl bg-[#39CCCC] text-[#00172e] font-bold text-xs hover:bg-[#7FDBFF] transition-all cursor-pointer"
            >
              {soundEnabled ? '🔊 Audio: Aktif' : '🔇 Audio: Mati'}
            </button>
          </div>

          {/* Reset Game Data */}
          <div className="flex items-center justify-between bg-red-500/15 p-4 rounded-2xl border border-red-500/35">
            <div>
              <strong className="block text-sm text-red-400">Reset Data Permainan:</strong>
              <span className="text-xs text-[#b8d4f0]">Mereset perangkat ini saja (avatar aktif, bank soal lokal, kunci Level 2 & 3). Papan peringkat kelas tetap aman — guru mengelolanya lewat Papan Peringkat › Kelola (Guru).</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Yakin ingin mereset data di perangkat ini (avatar aktif & kunci level)?')) {
                  onResetData();
                }
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all cursor-pointer"
            >
              ⚠️ Reset Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
