import React, { useState } from 'react';
import {
  PlayerScoreRecord,
  exportUsersToCSV,
  parseUsersCSV,
  isAvatarEligibleForTab,
  compareAvatars
} from '../../game/logic.ts';
import { AvatarProfile } from '../../types/game.ts';
import { seaAudio } from '../../game/audio.ts';
import { COLOR_GRADIENTS } from '../../game/constants.ts';

interface LeaderboardModalProps {
  avatars: AvatarProfile[];
  onImportAvatars: (imported: AvatarProfile[]) => void;
  onClose: () => void;
}

type FilterTab = 'overall' | 'zone1' | 'zone2' | 'zone3';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  avatars,
  onImportAvatars,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('overall');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Sort and filter avatars based on active tab:
  // - Avatar only appears in a zone tab if they have actually played in that zone
  // - Ranking calculation prioritizes score, then mutiara/pearls, then correct answers, then games
  const rankedAvatars = React.useMemo(() => {
    return avatars
      .filter((a) => isAvatarEligibleForTab(a, activeTab))
      .sort((a, b) => compareAvatars(a, b, activeTab));
  }, [avatars, activeTab]);

  // Export unique avatars to CSV
  const handleExportCSV = () => {
    seaAudio.klik();
    const records: PlayerScoreRecord[] = avatars.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.emoji,
      color: a.color,
      level: 1,
      score: a.totalScore,
      pearls: a.totalPearls,
      correct: a.totalCorrect,
      wrong: a.totalWrong,
      zone1Score: a.zoneScores?.[1] || 0,
      zone2Score: a.zoneScores?.[2] || 0,
      zone3Score: a.zoneScores?.[3] || 0,
      date: (a.lastPlayed || a.createdAt || new Date().toISOString()).split('T')[0],
      registeredAt: a.createdAt || new Date().toISOString()
    }));

    const csv = exportUsersToCSV(records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `database_papan_peringkat_petualangan_pecahan_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback('Berhasil mengekspor database pemain ke CSV!');
  };

  // Import avatars from CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseUsersCSV(text);
      if (res.error) {
        showFeedback(res.error, true);
        seaAudio.salahkan();
      } else {
        // Convert parsed records to unique avatars
        const importedAvatars: AvatarProfile[] = res.users.map((u, i) => {
          const played: number[] = [];
          if ((u.zone1Score || 0) > 0 || u.level === 1) played.push(1);
          if ((u.zone2Score || 0) > 0 || u.level === 2) played.push(2);
          if ((u.zone3Score || 0) > 0 || u.level === 3) played.push(3);

          return {
            id: u.id || `AVT-IMP-${i}-${Date.now()}`,
            name: u.name,
            emoji: u.avatar || '🐠',
            color: (u.color as any) || 'blue',
            totalScore: u.score || 0,
            totalPearls: u.pearls || 0,
            totalCorrect: u.correct || 0,
            totalWrong: u.wrong || 0,
            gamesPlayed: 1,
            playedZones: played.length > 0 ? played : [1],
            zoneScores: {
              1: u.zone1Score || (u.level === 1 ? u.score : 0),
              2: u.zone2Score || (u.level === 2 ? u.score : 0),
              3: u.zone3Score || (u.level === 3 ? u.score : 0)
            },
            createdAt: u.registeredAt || new Date().toISOString(),
            lastPlayed: u.date || new Date().toISOString()
          };
        });

        onImportAvatars(importedAvatars);
        showFeedback(`Berhasil mengimpor ${importedAvatars.length} profil pemain!`);
        seaAudio.levelUp();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-3.5 sm:gap-4 text-white my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏆</span>
            <div>
              <h3 className="text-xl font-black text-white">
                Papan Peringkat & Juara Samudra
              </h3>
              <p className="text-xs text-[#b8d4f0]">
                Setiap avatar dihitung satu identitas unik dengan akumulasi poin soal & mutiara
              </p>
            </div>
          </div>
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

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.isError
                ? 'bg-rose-600/30 border border-rose-500 text-rose-200'
                : 'bg-emerald-600/30 border border-emerald-500 text-emerald-200'
            }`}
          >
            <span>{feedbackMsg.isError ? '⚠️' : '✅'}</span>
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-[#001024] rounded-2xl border border-white/10">
            <button
              onClick={() => {
                seaAudio.klik();
                setActiveTab('overall');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overall'
                  ? 'bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌟</span>
              <span>Juara Umum</span>
            </button>
            <button
              onClick={() => {
                seaAudio.klik();
                setActiveTab('zone1');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'zone1'
                  ? 'bg-[#39CCCC] text-[#00172e] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌊</span>
              <span>Zona 1</span>
            </button>
            <button
              onClick={() => {
                seaAudio.klik();
                setActiveTab('zone2');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'zone2'
                  ? 'bg-[#39CCCC] text-[#00172e] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>⚓</span>
              <span>Zona 2</span>
            </button>
            <button
              onClick={() => {
                seaAudio.klik();
                setActiveTab('zone3');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'zone3'
                  ? 'bg-[#39CCCC] text-[#00172e] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>💎</span>
              <span>Zona 3</span>
            </button>
          </div>

          {/* CSV Import / Export */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold shadow active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
            <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5">
              <span>📤</span>
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tab Description */}
        <div className="text-xs text-[#a0c8f0] bg-black/25 px-3.5 py-2 rounded-xl border border-white/5">
          {activeTab === 'overall' && (
            <span>🌟 <strong>Peringkat Juara Umum:</strong> Ditentukan dari total perolehan skor kuis pecahan ditambah seluruh perolehan poin mutiara (🦪).</span>
          )}
          {activeTab === 'zone1' && (
            <span>🌊 <strong>Peringkat Zona 1: Terumbu Karang Dangkal</strong> (TP 1: Perbandingan & Pengurutan Pecahan).</span>
          )}
          {activeTab === 'zone2' && (
            <span>⚓ <strong>Peringkat Zona 2: Kapal Karam Misterius</strong> (TP 2: Pecahan Senilai Gambar & Simbol).</span>
          )}
          {activeTab === 'zone3' && (
            <span>💎 <strong>Peringkat Zona 3: Palung Mariana</strong> (TP 3: Pecahan Desimal & Persen).</span>
          )}
        </div>

        {/* Table of Unique Avatars */}
        <div className="w-full overflow-x-auto max-h-[260px] sm:max-h-[420px] rounded-2xl border border-[#39CCCC]/30 bg-[#001024]/85">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#002b5e] text-[#FFDC00] sticky top-0 font-bold border-b border-[#39CCCC]/40 z-10">
              <tr>
                <th className="p-3 w-16 text-center">Rank</th>
                <th className="p-3">Avatar & Nama Pemain</th>
                <th className="p-3 text-center">
                  {activeTab === 'overall' ? 'Total Skor (Soal + Mutiara)' : `Skor ${activeTab.toUpperCase()}`}
                </th>
                <th className="p-3 text-center">Mutiara (🦪)</th>
                <th className="p-3 text-center">Soal Benar</th>
                <th className="p-3 text-right">Terakhir Main</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rankedAvatars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#b8d4f0]">
                    {activeTab === 'overall'
                      ? 'Belum ada data pemain. Buat avatar dan jelajahi samudra untuk mencetak rekor juara!'
                      : `Belum ada pemain yang menjelajahi ${activeTab === 'zone1' ? 'Zona 1 (Terumbu Karang Dangkal)' : activeTab === 'zone2' ? 'Zona 2 (Kapal Karam Misterius)' : 'Zona 3 (Palung Mariana)'}. Mainkan zona ini untuk mencetak rekor!`}
                  </td>
                </tr>
              ) : (
                rankedAvatars.map((avt, idx) => {
                  const displayScore =
                    activeTab === 'overall'
                      ? avt.totalScore
                      : activeTab === 'zone1'
                      ? avt.zoneScores?.[1] || 0
                      : activeTab === 'zone2'
                      ? avt.zoneScores?.[2] || 0
                      : avt.zoneScores?.[3] || 0;

                  return (
                    <tr key={avt.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-center font-extrabold text-sm">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="p-3 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xl border border-white shadow-sm flex-shrink-0"
                          style={{ background: COLOR_GRADIENTS[avt.color] || COLOR_GRADIENTS.blue }}
                        >
                          {avt.emoji}
                        </div>
                        <div>
                          <strong className="text-white text-sm block">
                            {avt.name}
                          </strong>
                          <span className="text-[10px] text-[#a0c8f0]">
                            SDN 2 Jatiroto - Wonogiri
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-base text-[#FFDC00]">
                          {displayScore}
                        </span>
                        {activeTab === 'overall' && (
                          <div className="text-[10px] text-[#b8d4f0]">
                            ({avt.totalScore - (avt.totalPearls * 10)} soal + {avt.totalPearls * 10} mutiara)
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-white bg-white/10 px-2 py-0.5 rounded-full text-xs">
                          <span>🦪</span>
                          <span>{avt.totalPearls}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-emerald-400 font-bold">
                          {avt.totalCorrect} Benar
                        </span>
                        {avt.totalWrong > 0 && (
                          <span className="text-red-400/80 text-[10px] block">
                            ({avt.totalWrong} salah)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-[11px] text-[#b8d4f0]">
                        {(avt.lastPlayed || avt.createdAt || '-').split('T')[0]}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
