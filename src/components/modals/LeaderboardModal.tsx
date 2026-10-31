import React, { useState } from 'react';
import {
  PlayerScoreRecord,
  exportUsersToCSV,
  parseUsersCSV,
  isAvatarEligibleForTab,
  compareAvatars,
  formatDuration
} from '../../game/logic.ts';
import {
  MultiResultRow,
  summarizePlayers,
  summarizeMatches,
  exportMultiResultsToCSV,
  parseMultiResultsCSV
} from '../../game/multiplayerLeaderboard.ts';
import { verifyTeacherPassword } from '../../game/teacherAuth.ts';
import { exportUrl } from '../../game/cloudDb.ts';
import { AvatarProfile } from '../../types/game.ts';
import { seaAudio } from '../../game/audio.ts';
import { COLOR_GRADIENTS } from '../../game/constants.ts';

/** Teacher actions on the shared database. Each one is re-checked by the server with the password. */
export interface LeaderboardTeacherActions {
  deleteAvatar: (pwd: string, id: string) => Promise<void>;
  resetScores: (pwd: string) => Promise<void>;
  importSingle: (pwd: string, profiles: AvatarProfile[]) => Promise<void>;
  deleteMultiPlayer: (pwd: string, key: string) => Promise<void>;
  deleteMultiMatch: (pwd: string, id: string) => Promise<void>;
  resetMulti: (pwd: string) => Promise<void>;
  importMulti: (pwd: string, rows: MultiResultRow[]) => Promise<void>;
}

interface LeaderboardModalProps {
  initialMode?: 'single' | 'multi';
  avatars: AvatarProfile[];
  multiResults: MultiResultRow[];
  dbStatus: 'syncing' | 'online' | 'offline';
  onRefresh: () => Promise<boolean>;
  teacher: LeaderboardTeacherActions;
  onClose: () => void;
}

type FilterTab = 'overall' | 'zone1' | 'zone2' | 'zone3';
type MultiTab = 'players' | 'matches';

interface PendingConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const rankLabel = (idx: number) => (idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`);
const shortDate = (iso: string) => (iso || '-').split('T')[0];

const toolbarBtn =
  'min-h-9 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold shadow active:scale-95 transition-all cursor-pointer flex items-center gap-1.5';
const dangerBtn =
  'min-h-9 px-3 py-2 rounded-xl bg-rose-600/25 hover:bg-rose-600/45 border border-rose-400/60 text-rose-100 text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center gap-1.5';
const rowDeleteBtn =
  'w-8 h-8 rounded-lg bg-rose-600/20 hover:bg-rose-600/50 border border-rose-400/50 text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  initialMode = 'single',
  avatars,
  multiResults,
  dbStatus,
  onRefresh,
  teacher,
  onClose
}) => {
  const [mode, setMode] = useState<'single' | 'multi'>(initialMode);
  const [activeTab, setActiveTab] = useState<FilterTab>('overall');
  const [multiTab, setMultiTab] = useState<MultiTab>('players');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Teacher management mode (unlocked with the teacher password, only for this modal session)
  const [teacherPwd, setTeacherPwd] = useState<string | null>(null);
  const teacherMode = teacherPwd !== null;
  const [showUnlock, setShowUnlock] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Live leaderboard: pull the shared database every 8 s while this modal is open
  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);
  React.useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  /** Runs a teacher action against the server and reports the outcome */
  const runTeacher = async (action: (pwd: string) => Promise<void>, successMsg: string) => {
    if (!teacherPwd) return;
    setBusy(true);
    try {
      await action(teacherPwd);
      showFeedback(successMsg);
    } catch (e: any) {
      seaAudio.salahkan();
      showFeedback(`Gagal: ${e?.message || 'server tidak dapat dihubungi'}`, true);
    } finally {
      setBusy(false);
    }
  };

  const askConfirm = (c: PendingConfirm) => {
    seaAudio.klik();
    setPendingConfirm(c);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTeacherPassword(pwd)) {
      seaAudio.levelUp();
      setTeacherPwd(pwd.trim());
      setShowUnlock(false);
      setPwd('');
      setPwdError(null);
      showFeedback('Mode Guru aktif: kamu bisa menghapus, mereset, dan mengimpor data peringkat.');
    } else {
      seaAudio.salahkan();
      setPwdError('Kata sandi guru salah.');
    }
  };

  /* ─────────────── Single player data ─────────────── */

  // - Avatar only appears in a zone tab if they have actually played in that zone
  // - Ranking calculation prioritizes score, then mutiara/pearls, then correct answers, then games
  const rankedAvatars = React.useMemo(() => {
    return avatars
      .filter((a) => isAvatarEligibleForTab(a, activeTab))
      .sort((a, b) => compareAvatars(a, b, activeTab));
  }, [avatars, activeTab]);

  const handleExportSingleCSV = () => {
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
    downloadCSV(exportUsersToCSV(records), `peringkat_single_player_${Date.now()}.csv`);
    showFeedback('Berhasil mengekspor peringkat single player ke CSV!');
  };

  const handleImportSingleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = parseUsersCSV(event.target?.result as string);
      if (res.error) {
        showFeedback(res.error, true);
        seaAudio.salahkan();
        return;
      }
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
      runTeacher(
        (p) => teacher.importSingle(p, importedAvatars),
        `Berhasil mengimpor ${importedAvatars.length} profil pemain ke database kelas!`
      );
    };
    reader.readAsText(file);
  };

  /* ─────────────── Multiplayer data ─────────────── */

  const playerSummaries = React.useMemo(() => summarizePlayers(multiResults), [multiResults]);
  const matchSummaries = React.useMemo(() => summarizeMatches(multiResults), [multiResults]);

  const handleExportMultiCSV = () => {
    seaAudio.klik();
    downloadCSV(exportMultiResultsToCSV(multiResults), `peringkat_multiplayer_${Date.now()}.csv`);
    showFeedback('Berhasil mengekspor peringkat multiplayer ke CSV!');
  };

  const handleImportMultiCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = parseMultiResultsCSV(event.target?.result as string);
      if (res.error) {
        showFeedback(res.error, true);
        seaAudio.salahkan();
        return;
      }
      runTeacher(
        (p) => teacher.importMulti(p, res.rows),
        `Berhasil menggabungkan ${res.rows.length} baris (duplikat otomatis dilewati).`
      );
    };
    reader.readAsText(file);
  };

  const tabBtn = (active: boolean, primary = false) =>
    `px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
      active
        ? primary
          ? 'bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] shadow-md'
          : 'bg-[#39CCCC] text-[#00172e] shadow-md'
        : 'text-white/70 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#000c1a]/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-5xl max-h-[94dvh] overflow-y-auto p-3 sm:p-6 md:p-8 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC]/40 shadow-2xl flex flex-col gap-3 sm:gap-4 text-white my-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl">🏆</span>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">Papan Peringkat</h3>
              <p className="text-[11px] sm:text-xs text-[#b8d4f0]">
                {mode === 'single'
                  ? 'Petualangan single player — akumulasi skor tiap avatar'
                  : 'Event multiplayer — semua pemain yang bertanding tercatat'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {teacherMode ? (
              <button
                type="button"
                onClick={() => {
                  seaAudio.klik();
                  setTeacherPwd(null);
                }}
                className="min-h-9 px-3 rounded-xl bg-amber-500/25 border border-amber-400/60 text-[#FFDC00] text-xs font-black cursor-pointer"
                title="Kunci kembali Mode Guru"
              >
                🔓 <span className="hidden sm:inline">Mode Guru</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  seaAudio.klik();
                  setShowUnlock((v) => !v);
                }}
                className="min-h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer"
                title="Kelola peringkat (khusus guru)"
              >
                🔒 <span className="hidden sm:inline">Kelola (Guru)</span>
              </button>
            )}
            <button
              onClick={() => {
                seaAudio.klik();
                onClose();
              }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center text-lg transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Teacher unlock form */}
        {showUnlock && !teacherMode && (
          <form onSubmit={handleUnlock} className="p-3 rounded-2xl bg-[#00142e] border border-amber-400/40 flex flex-col sm:flex-row gap-2 sm:items-center">
            <span className="text-xs font-bold text-[#FFDC00] shrink-0">🔒 Kata sandi guru:</span>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                setPwdError(null);
              }}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#001024] border border-white/20 text-sm text-white focus:outline-none focus:border-[#FFDC00]"
              placeholder="Masukkan kata sandi"
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFDC00] to-[#ff9800] text-[#00172e] text-xs font-black cursor-pointer">
              Buka
            </button>
            {pwdError && <span className="text-xs text-rose-300 font-bold">{pwdError}</span>}
          </form>
        )}

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

        {/* Mode switch: Single Player vs Multiplayer Event */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#001024] rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              seaAudio.klik();
              setMode('single');
            }}
            className={tabBtn(mode === 'single', true) + ' justify-center py-2.5'}
          >
            🧭 Single Player
          </button>
          <button
            type="button"
            onClick={() => {
              seaAudio.klik();
              setMode('multi');
            }}
            className={tabBtn(mode === 'multi', true) + ' justify-center py-2.5'}
          >
            ⚔️ Multiplayer Event
          </button>
        </div>

        {/* Shared database status + CSV database files */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2 font-bold">
            {dbStatus === 'online' && <span className="text-emerald-300">● Database kelas tersambung — semua perangkat melihat data yang sama</span>}
            {dbStatus === 'syncing' && <span className="text-sky-300">● Menyambungkan ke database kelas...</span>}
            {dbStatus === 'offline' && <span className="text-amber-300">● Offline — menampilkan data terakhir, hasil baru dikirim saat tersambung</span>}
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 cursor-pointer disabled:opacity-50"
              title="Muat ulang data dari database"
            >
              <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
            </button>
          </div>
          {teacherMode && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#b8d4f0]">⬇️ Database CSV:</span>
              <a href={exportUrl('avatars.csv')} download className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 font-bold">avatars.csv</a>
              <a href={exportUrl('games.csv')} download className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 font-bold">games.csv</a>
              <a href={exportUrl('multiplayer.csv')} download className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 font-bold">multiplayer.csv</a>
            </div>
          )}
        </div>

        {/* ═══════════════ SINGLE PLAYER ═══════════════ */}
        {mode === 'single' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 p-1 bg-[#001024] rounded-2xl border border-white/10 overflow-x-auto max-w-full">
                <button onClick={() => { seaAudio.klik(); setActiveTab('overall'); }} className={tabBtn(activeTab === 'overall', true)}>🌟 Juara Umum</button>
                <button onClick={() => { seaAudio.klik(); setActiveTab('zone1'); }} className={tabBtn(activeTab === 'zone1')}>🌊 Zona 1</button>
                <button onClick={() => { seaAudio.klik(); setActiveTab('zone2'); }} className={tabBtn(activeTab === 'zone2')}>⚓ Zona 2</button>
                <button onClick={() => { seaAudio.klik(); setActiveTab('zone3'); }} className={tabBtn(activeTab === 'zone3')}>💎 Zona 3</button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleExportSingleCSV} className={toolbarBtn}>📥 Export CSV</button>
                {teacherMode && (
                  <>
                    <label className={toolbarBtn}>
                      📤 Import CSV
                      <input type="file" accept=".csv" onChange={handleImportSingleCSV} className="hidden" />
                    </label>
                    <button
                      type="button"
                      disabled={avatars.length === 0}
                      onClick={() =>
                        askConfirm({
                          title: 'Reset semua skor single player?',
                          message: `Skor, mutiara, dan jawaban dari ${avatars.length} avatar akan dikembalikan ke 0. Avatar tetap ada. Tindakan ini tidak bisa dibatalkan.`,
                          confirmLabel: 'Ya, Reset Skor',
                          onConfirm: () => runTeacher((p) => teacher.resetScores(p), 'Semua skor single player telah direset.')
                        })
                      }
                      className={`${dangerBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      ♻️ Reset Semua Skor
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-[#a0c8f0] bg-black/25 px-3.5 py-2 rounded-xl border border-white/5">
              {activeTab === 'overall' && <span>🌟 <strong>Juara Umum:</strong> total skor semua petualangan (jawaban benar + mutiara + bonus waktu).</span>}
              {activeTab === 'zone1' && <span>🌊 <strong>Zona 1: Terumbu Karang Dangkal</strong> — skor terbaik di zona ini (TP 1).</span>}
              {activeTab === 'zone2' && <span>⚓ <strong>Zona 2: Kapal Karam Misterius</strong> — skor terbaik di zona ini (TP 2).</span>}
              {activeTab === 'zone3' && <span>💎 <strong>Zona 3: Palung Mariana</strong> — skor terbaik di zona ini (TP 3).</span>}
            </div>

            <div className="w-full overflow-x-auto max-h-[50dvh] rounded-2xl border border-[#39CCCC]/30 bg-[#001024]/85">
              <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                <thead className="bg-[#002b5e] text-[#FFDC00] sticky top-0 font-bold border-b border-[#39CCCC]/40 z-10">
                  <tr>
                    <th className="p-3 w-16 text-center">Rank</th>
                    <th className="p-3">Pemain</th>
                    <th className="p-3 text-center">{activeTab === 'overall' ? 'Total Skor' : `Skor ${activeTab.replace('zone', 'Zona ')}`}</th>
                    <th className="p-3 text-center">🦪</th>
                    <th className="p-3 text-center">Benar</th>
                    <th className="p-3 text-right">Terakhir</th>
                    {teacherMode && <th className="p-3 text-center w-14">Hapus</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rankedAvatars.length === 0 ? (
                    <tr>
                      <td colSpan={teacherMode ? 7 : 6} className="p-8 text-center text-[#b8d4f0]">
                        Belum ada data pemain untuk tab ini. Ayo jelajahi samudra untuk mencetak rekor!
                      </td>
                    </tr>
                  ) : (
                    rankedAvatars.map((avt, idx) => {
                      const displayScore =
                        activeTab === 'overall'
                          ? avt.totalScore
                          : avt.zoneScores?.[Number(activeTab.slice(-1)) as 1 | 2 | 3] || 0;
                      return (
                        <tr key={avt.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-center font-extrabold text-sm whitespace-nowrap">{rankLabel(idx)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-xl border border-white shadow-sm shrink-0"
                                style={{ background: COLOR_GRADIENTS[avt.color] || COLOR_GRADIENTS.blue }}
                              >
                                {avt.emoji}
                              </div>
                              <strong className="text-white text-sm truncate max-w-[160px]">{avt.name}</strong>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-base text-[#FFDC00] tabular-nums">{displayScore}</td>
                          <td className="p-3 text-center font-bold">{avt.totalPearls}</td>
                          <td className="p-3 text-center">
                            <span className="text-emerald-400 font-bold">{avt.totalCorrect}</span>
                            {avt.totalWrong > 0 && <span className="text-red-400/80 text-[10px] block">({avt.totalWrong} salah)</span>}
                          </td>
                          <td className="p-3 text-right text-[11px] text-[#b8d4f0] whitespace-nowrap">{shortDate(avt.lastPlayed || avt.createdAt)}</td>
                          {teacherMode && (
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                title={`Hapus ${avt.name}`}
                                aria-label={`Hapus ${avt.name}`}
                                onClick={() =>
                                  askConfirm({
                                    title: `Hapus ${avt.name}?`,
                                    message: 'Avatar beserta seluruh riwayat permainan single player-nya akan dihapus dari database kelas (semua perangkat).',
                                    confirmLabel: 'Ya, Hapus',
                                    onConfirm: () => runTeacher((p) => teacher.deleteAvatar(p, avt.id), `${avt.name} telah dihapus.`)
                                  })
                                }
                                className={rowDeleteBtn}
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ═══════════════ MULTIPLAYER EVENT ═══════════════ */}
        {mode === 'multi' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 p-1 bg-[#001024] rounded-2xl border border-white/10">
                <button onClick={() => { seaAudio.klik(); setMultiTab('players'); }} className={tabBtn(multiTab === 'players')}>
                  👥 Peringkat Pemain ({playerSummaries.length})
                </button>
                <button onClick={() => { seaAudio.klik(); setMultiTab('matches'); }} className={tabBtn(multiTab === 'matches')}>
                  📜 Riwayat ({matchSummaries.length})
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleExportMultiCSV} disabled={multiResults.length === 0} className={`${toolbarBtn} disabled:opacity-40 disabled:cursor-not-allowed`}>
                  📥 Export CSV
                </button>
                {teacherMode && (
                  <>
                    <label className={toolbarBtn} title="Gabungkan hasil dari file CSV (duplikat dilewati)">
                      📤 Gabung CSV
                      <input type="file" accept=".csv" onChange={handleImportMultiCSV} className="hidden" />
                    </label>
                    <button
                      type="button"
                      disabled={multiResults.length === 0}
                      onClick={() =>
                        askConfirm({
                          title: 'Reset peringkat multiplayer?',
                          message: `Semua ${matchSummaries.length} pertandingan dan ${playerSummaries.length} pemain akan dihapus dari database kelas (semua perangkat). Disarankan Export CSV terlebih dahulu sebagai cadangan.`,
                          confirmLabel: 'Ya, Reset Semua',
                          onConfirm: () => runTeacher((p) => teacher.resetMulti(p), 'Peringkat multiplayer telah direset.')
                        })
                      }
                      className={`${dangerBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      ♻️ Reset Multiplayer
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-[#a0c8f0] bg-black/25 px-3.5 py-2 rounded-xl border border-white/5">
              ⚔️ Peringkat berdasarkan <strong>skor terbaik</strong> (maks 1000 = jawaban benar 500 + mutiara 200 + bonus waktu 300), lalu jumlah kemenangan.
              Semua pertandingan dari semua perangkat tersimpan di satu database kelas.
            </div>

            {multiTab === 'players' ? (
              <div className="w-full overflow-x-auto max-h-[50dvh] rounded-2xl border border-[#39CCCC]/30 bg-[#001024]/85">
                <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                  <thead className="bg-[#002b5e] text-[#FFDC00] sticky top-0 font-bold border-b border-[#39CCCC]/40 z-10">
                    <tr>
                      <th className="p-3 w-16 text-center">Rank</th>
                      <th className="p-3">Pemain</th>
                      <th className="p-3 text-center">Skor Terbaik</th>
                      <th className="p-3 text-center">M / S / K</th>
                      <th className="p-3 text-center">Rata-rata</th>
                      <th className="p-3 text-center">Benar</th>
                      <th className="p-3 text-center">🦪</th>
                      <th className="p-3 text-center">Waktu Terbaik</th>
                      {teacherMode && <th className="p-3 text-center w-14">Hapus</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {playerSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={teacherMode ? 9 : 8} className="p-8 text-center text-[#b8d4f0]">
                          Belum ada pertandingan multiplayer yang tercatat.
                        </td>
                      </tr>
                    ) : (
                      playerSummaries.map((p, idx) => (
                        <tr key={p.playerKey} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-center font-extrabold text-sm whitespace-nowrap">{rankLabel(idx)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{p.avatar}</span>
                              <div className="min-w-0">
                                <strong className="text-white text-sm block truncate max-w-[150px]">{p.name}</strong>
                                <span className="text-[10px] text-[#a0c8f0]">{p.matches} pertandingan</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-base text-[#FFDC00] tabular-nums">{p.bestScore}</td>
                          <td className="p-3 text-center font-bold whitespace-nowrap">
                            <span className="text-emerald-400">{p.wins}</span> / <span className="text-white/70">{p.draws}</span> / <span className="text-rose-400">{p.losses}</span>
                          </td>
                          <td className="p-3 text-center tabular-nums">{p.avgScore}</td>
                          <td className="p-3 text-center text-emerald-400 font-bold">{p.totalCorrect}</td>
                          <td className="p-3 text-center font-bold">{p.totalPearls}</td>
                          <td className="p-3 text-center tabular-nums">{p.bestTimeMs !== null ? formatDuration(p.bestTimeMs) : '–'}</td>
                          {teacherMode && (
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                title={`Hapus ${p.name}`}
                                aria-label={`Hapus ${p.name}`}
                                onClick={() =>
                                  askConfirm({
                                    title: `Hapus ${p.name} dari peringkat multiplayer?`,
                                    message: `Semua ${p.matches} hasil pertandingan milik ${p.name} akan dihapus. Hasil lawannya tetap tercatat.`,
                                    confirmLabel: 'Ya, Hapus',
                                    onConfirm: () =>
                                      runTeacher((pw) => teacher.deleteMultiPlayer(pw, p.playerKey), `${p.name} dihapus dari peringkat multiplayer.`)
                                  })
                                }
                                className={rowDeleteBtn}
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[50dvh] overflow-y-auto pr-1">
                {matchSummaries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#b8d4f0] rounded-2xl border border-[#39CCCC]/30 bg-[#001024]/85">
                    Belum ada riwayat pertandingan.
                  </div>
                ) : (
                  matchSummaries.map((m) => (
                    <div key={m.matchId} className="p-3 rounded-2xl bg-[#001024]/85 border border-[#39CCCC]/30 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="text-[10px] text-[#a0c8f0] sm:w-24 shrink-0">
                        <div className="font-bold text-white text-xs">Zona {m.level}</div>
                        {shortDate(m.date)}
                      </div>
                      <div className="flex-1 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                        {m.rows.map((r) => (
                          <div
                            key={r.playerKey}
                            className={`px-3 py-2 rounded-xl border flex items-center gap-2 ${
                              r.outcome === 'menang' ? 'border-[#FFDC00]/70 bg-[#FFDC00]/10' : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <span className="text-lg">{r.avatar}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">
                                {r.name} {r.outcome === 'menang' ? '🏆' : r.outcome === 'seri' ? '🤝' : ''}
                              </div>
                              <div className="text-[10px] text-[#b8d4f0]">
                                {r.correct} benar • {r.pearls} 🦪 • {r.status === 'finished' ? formatDuration(r.timeMs) : r.status === 'eliminated' ? '💀 nyawa habis' : '🚪 keluar'}
                              </div>
                            </div>
                            <span className="font-black text-[#FFDC00] tabular-nums">{r.score}</span>
                          </div>
                        ))}
                      </div>
                      {teacherMode && (
                        <button
                          type="button"
                          title="Hapus pertandingan"
                          aria-label="Hapus pertandingan"
                          onClick={() =>
                            askConfirm({
                              title: 'Hapus pertandingan ini?',
                              message: `Hasil ${m.rows.map((r) => r.name).join(' vs ')} (Zona ${m.level}, ${shortDate(m.date)}) akan dihapus.`,
                              confirmLabel: 'Ya, Hapus',
                              onConfirm: () => runTeacher((p) => teacher.deleteMultiMatch(p, m.matchId), 'Pertandingan dihapus.')
                            })
                          }
                          className={`${rowDeleteBtn} self-end sm:self-center`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

      </div>

      {/* Confirmation dialog (no window.confirm) */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md p-5 sm:p-6 rounded-3xl bg-[#041d3e] border-2 border-rose-400 shadow-2xl flex flex-col gap-3 text-center">
            <span className="text-3xl">⚠️</span>
            <h4 className="text-base sm:text-lg font-black text-white">{pendingConfirm.title}</h4>
            <p className="text-xs sm:text-sm text-[#b8d4f0]">{pendingConfirm.message}</p>
            <div className="grid grid-cols-2 gap-2.5 mt-1">
              <button
                type="button"
                onClick={() => {
                  seaAudio.klik();
                  setPendingConfirm(null);
                }}
                className="py-3 rounded-xl font-bold text-xs sm:text-sm bg-white/10 hover:bg-white/20 border border-white/25 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  seaAudio.klik();
                  await pendingConfirm.onConfirm();
                  setPendingConfirm(null);
                }}
                className="py-3 rounded-xl font-bold text-xs sm:text-sm bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white cursor-pointer"
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
