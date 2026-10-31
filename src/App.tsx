import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SplashScreen } from './pages/SplashScreen.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { GameplayPage } from './pages/GameplayPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';

import { AvatarModal } from './components/modals/AvatarModal.tsx';
import { LevelSelectModal } from './components/modals/LevelSelectModal.tsx';
import { MultiplayerModal } from './components/modals/MultiplayerModal.tsx';
import { GuideModal } from './components/modals/GuideModal.tsx';
import { SettingsModal } from './components/modals/SettingsModal.tsx';
import { CrudModal } from './components/modals/CrudModal.tsx';
import { TeacherAuthModal } from './components/modals/TeacherAuthModal.tsx';
import { LeaderboardModal } from './components/modals/LeaderboardModal.tsx';

import {
  DEFAULT_QUESTIONS,
  Question,
  PlayerScoreRecord
} from './game/logic.ts';
import {
  ActivePage,
  ModalType,
  AvatarProfile,
  PlayerStats,
  PlayerResult
} from './types/game.ts';
import { MultiResultRow, loadMultiResults, resolveMatch } from './game/multiplayerLeaderboard.ts';
import {
  DbOp,
  DbState,
  buildAvatarProfiles,
  legacyProfilesToRecords
} from './game/database.ts';
import {
  loadLocalDb,
  syncDb,
  queueOp,
  upsertAvatarOp,
  addGamesOp,
  addMultiOp,
  teacherApi
} from './game/cloudDb.ts';
import { seaAudio } from './game/audio.ts';

import { multiplayerNet } from './game/multiplayerNetwork.ts';

const STORAGE_KEYS = {
  AVATARS_LIST: 'pa_avatars_list',
  ACTIVE_AVATAR_ID: 'pa_active_avatar_id',
  OLD_AVATAR: 'pa_avatar', // For migration
  SOUND: 'pa_sound',
  QUESTIONS: 'pa_questions',
  UNLOCKED_LEVELS: 'pa_unlocked_levels',
  DB_MIGRATED: 'pa_db_migrated'
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

/**
 * One-time upload of data saved by older versions of the app (per-device avatars & multiplayer
 * results in localStorage) into the shared database outbox.
 */
function migrateLegacyLocalData() {
  if (loadStorage<boolean>(STORAGE_KEYS.DB_MIGRATED, false)) return;
  saveStorage(STORAGE_KEYS.DB_MIGRATED, true);

  let profiles = loadStorage<AvatarProfile[]>(STORAGE_KEYS.AVATARS_LIST, []);
  const old = loadStorage<any>(STORAGE_KEYS.OLD_AVATAR, null);
  if (profiles.length === 0 && old && old.name) {
    profiles = [{
      id: `AVT-${Date.now()}`,
      name: old.name,
      emoji: old.emoji || '🐠',
      color: old.color || 'blue',
      totalScore: 0,
      totalPearls: 0,
      totalCorrect: 0,
      totalWrong: 0,
      gamesPlayed: 0,
      zoneScores: { 1: 0, 2: 0, 3: 0 },
      createdAt: new Date().toISOString(),
      lastPlayed: new Date().toISOString()
    }];
  }

  let state = loadLocalDb();
  const { avatars, games } = legacyProfilesToRecords(profiles);
  avatars.forEach((a) => { state = queueOp(state, upsertAvatarOp(a)); });
  if (games.length) state = queueOp(state, addGamesOp(games));
  const multi = loadMultiResults();
  if (multi.length) queueOp(state, addMultiOp(multi));
}

export default function App() {
  // Page Router
  const [currentPage, setCurrentPage] = useState<ActivePage>('splash');
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ═══════════════════════════════════════════════
  // SHARED CSV DATABASE (all devices): registered avatars, single-player game records,
  // multiplayer results. Local changes are applied instantly and synced via an outbox.
  // ═══════════════════════════════════════════════
  const [db, setDb] = useState<DbState>(() => {
    migrateLegacyLocalData();
    return loadLocalDb();
  });
  const dbRef = useRef(db);
  const [dbStatus, setDbStatus] = useState<'syncing' | 'online' | 'offline'>('syncing');

  const avatars = React.useMemo(() => buildAvatarProfiles(db.avatars, db.games), [db.avatars, db.games]);
  const multiResults = db.multi;

  // Side effects (outbox) stay outside the state updater so they never run twice
  const applyDbChange = (op: DbOp) => {
    const next = queueOp(dbRef.current, op);
    dbRef.current = next;
    setDb(next);
  };

  const refreshDb = useCallback(async () => {
    try {
      const next = await syncDb();
      dbRef.current = next;
      setDb(next);
      setDbStatus('online');
      return true;
    } catch {
      setDbStatus('offline');
      return false;
    }
  }, []);

  // Sync on start, when the tab regains focus / network, and every 30 s
  useEffect(() => {
    refreshDb();
    const onWake = () => refreshDb();
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onWake);
    const timer = setInterval(refreshDb, 30000);
    return () => {
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onWake);
      clearInterval(timer);
    };
  }, [refreshDb]);

  const [activeAvatarId, setActiveAvatarId] = useState<string | null>(() => {
    return loadStorage<string | null>(STORAGE_KEYS.ACTIVE_AVATAR_ID, null);
  });

  // Current active avatar on THIS device (the list is shared, so never auto-pick someone else's)
  const activeAvatar = React.useMemo(() => {
    return avatars.find((a) => a.id === activeAvatarId) || null;
  }, [avatars, activeAvatarId]);

  // Sound & Questions
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    loadStorage(STORAGE_KEYS.SOUND, true)
  );
  const [questions, setQuestions] = useState<Question[]>(() =>
    loadStorage(STORAGE_KEYS.QUESTIONS, DEFAULT_QUESTIONS)
  );
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>(() =>
    loadStorage(STORAGE_KEYS.UNLOCKED_LEVELS, [1])
  );

  // Active Game State
  const [gameMode, setGameMode] = useState<'single' | 'multi'>('single');
  const [currentLevel, setCurrentLevel] = useState<number>(1);

  // Results State
  const [finalP1, setFinalP1] = useState<PlayerStats | null>(null);
  const [finalP2, setFinalP2] = useState<PlayerStats | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Multiplayer match tracking (opponent may still be playing after we finish)
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponentResult, setOpponentResult] = useState<PlayerResult | null>(null);

  const [leaderboardMode, setLeaderboardMode] = useState<'single' | 'multi'>('single');

  // Only calls state setters, so it is safe to use from the stable network callback
  const resetMatchState = () => {
    setFinalP1(null);
    setFinalP2(null);
    setIsGameOver(false);
    setOpponentResult(null);
  };

  // Multiplayer State (P2P Cloud + WebSockets + BroadcastChannel)
  const [networkMessage, setNetworkMessage] = useState<string>('Jaringan WebRTC P2P Siap');
  const [roomConnected, setRoomConnected] = useState(false);
  const [roomStatus, setRoomStatus] = useState<'idle' | 'waiting' | 'ready'>('idle');
  const [currentRoomId, setCurrentRoomId] = useState('LAUT81');
  const [isHost, setIsHost] = useState(true);
  const [p1Info, setP1Info] = useState<{ name: string; avatar: string }>({ name: 'Host', avatar: '🐠' });
  const [p2Info, setP2Info] = useState<{ name: string; avatar: string }>({ name: 'Lawan', avatar: '🐬' });
  const isHostRef = useRef(true);
  const localPlayerIdRef = useRef<string | null>(null);
  const multiListenersRef = useRef(new Set<(msg: any) => void>());

  const subscribeMultiplayerEvents = useCallback((handler: (msg: any) => void) => {
    multiListenersRef.current.add(handler);
    return () => {
      multiListenersRef.current.delete(handler);
    };
  }, []);

  // Keep Audio Engine in sync
  useEffect(() => {
    seaAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Auto Landscape & Fullscreen handling when entering/exiting gameplay
  useEffect(() => {
    const docEl = document.documentElement as any;

    if (currentPage === 'gameplay') {
      // Enter Fullscreen & Lock Landscape
      try {
        if (!document.fullscreenElement) {
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen().catch(() => {});
          }
        }
      } catch {}

      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}
    } else {
      // Exit Fullscreen & Restore Portrait
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen().catch(() => {});
          }
        }
      } catch {}

      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('portrait').catch(() => {
            if (screen.orientation && screen.orientation.unlock) {
              screen.orientation.unlock();
            }
          });
        } else if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch {}
    }
  }, [currentPage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // ═══════════════════════════════════════════════
  // AVATAR MANAGEMENT HANDLERS (Multiple Avatars & Switcher)
  // ═══════════════════════════════════════════════

  const handleSelectAvatar = (id: string) => {
    setActiveAvatarId(id);
    saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, id);
    const selected = avatars.find(a => a.id === id);
    if (selected) {
      showToast(`Aktif sebagai ${selected.name} ${selected.emoji}`);
    }
  };

  // New avatars are registered in the shared database so every device sees them
  const handleCreateAvatar = (newAvatar: AvatarProfile): boolean => {
    applyDbChange(
      upsertAvatarOp({
        id: newAvatar.id,
        name: newAvatar.name,
        emoji: newAvatar.emoji,
        color: newAvatar.color,
        createdAt: newAvatar.createdAt
      })
    );
    setActiveAvatarId(newAvatar.id);
    saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, newAvatar.id);
    showToast(`Avatar ${newAvatar.name} berhasil dibuat!`);
    return true;
  };

  // Teacher-only (password checked again by the server)
  const runTeacherAction = async (action: () => Promise<unknown>) => {
    await action();
    await refreshDb();
  };

  const handleTeacherDeleteAvatar = (pwd: string, id: string) =>
    runTeacherAction(async () => {
      await teacherApi.deleteAvatar(pwd, id);
      if (activeAvatarId === id) {
        setActiveAvatarId(null);
        saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, null);
      }
    });

  const activeAvatarRef = useRef(activeAvatar);
  useEffect(() => {
    activeAvatarRef.current = activeAvatar;
  }, [activeAvatar]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Find the other player's info in a room message. Uses player ids so it stays correct
  // even if a transport (e.g. the WS server) assigned slots differently than the local role.
  const pickOpponentInfo = (msg: any): { name: string; avatar: string } | null => {
    const candidates = [msg.p1, msg.p2].filter((p: any) => p && p.name);
    const myId = localPlayerIdRef.current;
    const byId = candidates.find((p: any) => p.id && myId && p.id !== myId);
    const fallback = isHostRef.current ? msg.p2 : msg.p1;
    const other = byId || (fallback && (!fallback.id || fallback.id !== myId) ? fallback : null);
    return other ? { name: other.name, avatar: other.avatar } : null;
  };

  const applyRoomPlayers = (msg: any) => {
    const self = {
      name: activeAvatarRef.current?.name || (isHostRef.current ? 'Pemain 1' : 'Pemain 2'),
      avatar: activeAvatarRef.current?.emoji || (isHostRef.current ? '🐠' : '🐬')
    };
    const opponent = pickOpponentInfo(msg);
    if (isHostRef.current) {
      setP1Info(self);
      if (opponent) setP2Info(opponent);
    } else {
      setP2Info(self);
      if (opponent) setP1Info(opponent);
    }
    return opponent;
  };

  // Handle Multiplayer Message (Listens for room join, room ready, and game start)
  const handleIncomingWsMessage = useCallback((msg: any) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'room-joined') {
      setRoomConnected(true);
      // Local role is decided by the player's choice (host/guest), not by whichever transport answered first
      setIsHost(isHostRef.current);
      const opponent = applyRoomPlayers(msg);
      setRoomStatus(isHostRef.current && !opponent ? 'waiting' : 'ready');
    } else if (msg.type === 'room-ready') {
      setRoomConnected(true);
      setRoomStatus('ready');
      applyRoomPlayers(msg);
      seaAudio.levelUp();
    } else if (msg.type === 'game-started' || msg.type === 'start-game' || msg.type === 'start_game') {
      if (msg.matchId) setMatchId(msg.matchId);
      resetMatchState();
      setCurrentModal(null);
      setCurrentLevel(msg.level || 1);
      setGameMode('multi');
      setCurrentPage('gameplay');
      if (soundEnabledRef.current) seaAudio.startBGM();
    } else {
      multiListenersRef.current.forEach((handler) => handler(msg));
    }
  }, []);

  // Track the opponent's progress for the results screen. This keeps running after our own
  // game ended (e.g. we ran out of hearts) so we see their final result when they finish.
  useEffect(() => {
    if (gameMode !== 'multi') return;
    const num = (v: any, fallback: number) => (typeof v === 'number' ? v : fallback);
    const empty: PlayerResult = { name: '', avatar: '', score: 0, correct: 0, wrong: 0, pearls: 0, timeMs: 0, status: 'playing' };

    return subscribeMultiplayerEvents((msg: any) => {
      if (msg.type === 'answer-submitted' || msg.type === 'pearl-collected') {
        setOpponentResult((prev) => {
          if (prev && prev.status !== 'playing') return prev;
          const base = prev || empty;
          return {
            ...base,
            score: num(msg.score, base.score),
            correct: num(msg.correct, base.correct),
            wrong: num(msg.wrong, base.wrong),
            pearls: num(msg.pearls, base.pearls)
          };
        });
      } else if (msg.type === 'player-finished') {
        setOpponentResult({
          avatarId: msg.avatarId,
          name: msg.name || '',
          avatar: msg.avatar || '',
          score: num(msg.score, 0),
          correct: num(msg.correct, 0),
          wrong: num(msg.wrong, 0),
          pearls: num(msg.pearls, 0),
          timeMs: num(msg.timeMs, 0),
          status: msg.status === 'eliminated' ? 'eliminated' : 'finished',
          breakdown: msg.breakdown
        });
      } else if (msg.type === 'opponent-left') {
        setOpponentResult((prev) => (prev && prev.status !== 'playing' ? prev : { ...(prev || empty), status: 'left' }));
      }
    });
  }, [gameMode, subscribeMultiplayerEvents]);

  // Opponent info as known from the room, merged with their reported progress
  const opponentInfo = isHost ? p2Info : p1Info;
  const opponentDisplay: PlayerResult = {
    ...(opponentResult || { score: 0, correct: 0, wrong: 0, pearls: 0, timeMs: 0, status: 'playing' as const }),
    name: opponentResult?.name || opponentInfo.name,
    avatar: opponentResult?.avatar || opponentInfo.avatar
  };

  // Record the match in the multiplayer leaderboard once both results are known (once per match)
  const recordedMatchesRef = useRef(new Set<string>());
  useEffect(() => {
    if (gameMode !== 'multi' || !matchId || !finalP1 || !opponentResult || opponentResult.status === 'playing') return;
    if (recordedMatchesRef.current.has(matchId)) return;
    recordedMatchesRef.current.add(matchId);

    const me: PlayerResult = {
      avatarId: activeAvatar?.id,
      name: finalP1.name,
      avatar: finalP1.avatar,
      score: finalP1.score,
      correct: finalP1.correct,
      wrong: finalP1.wrong,
      pearls: finalP1.pearls,
      timeMs: finalP1.timeMs || 0,
      status: finalP1.status || (isGameOver ? 'eliminated' : 'finished')
    };
    const verdict = resolveMatch(me, opponentDisplay);
    const date = new Date().toISOString();
    const toRow = (p: PlayerResult, outcome: MultiResultRow['outcome'], opponentName: string): MultiResultRow => ({
      matchId,
      playerKey: p.avatarId || p.name,
      name: p.name,
      avatar: p.avatar,
      level: currentLevel,
      score: p.score,
      correct: p.correct,
      wrong: p.wrong,
      pearls: p.pearls,
      timeMs: p.timeMs,
      status: p.status,
      outcome,
      opponentName,
      date
    });
    const rows = [
      toRow(me, verdict.winner === 1 ? 'menang' : verdict.winner === 2 ? 'kalah' : 'seri', opponentDisplay.name),
      toRow(opponentDisplay, verdict.winner === 2 ? 'menang' : verdict.winner === 1 ? 'kalah' : 'seri', me.name)
    ];
    applyDbChange(addMultiOp(rows));

    if (currentPage !== 'results') {
      showToast(`Pertandingan selesai: ${verdict.message}`);
    }
  }, [gameMode, matchId, finalP1, opponentResult]);

  // Connect to Multiplayer Room (Multi-tier: WebRTC PeerJS + WebSocket + BroadcastChannel)
  const handleJoinOrCreateRoom = (roomId: string, level: number, asHost: boolean) => {
    setCurrentRoomId(roomId);
    setIsHost(asHost);
    isHostRef.current = asHost;
    setCurrentLevel(level);

    const playerId = `P-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    localPlayerIdRef.current = playerId;
    const playerPayload = {
      id: playerId,
      name: activeAvatar?.name || (asHost ? 'Pemain 1' : 'Pemain 2'),
      avatar: activeAvatar?.emoji || (asHost ? '🐠' : '🐬'),
      color: activeAvatar?.color || 'blue'
    };

    multiplayerNet.init(
      roomId,
      level,
      asHost,
      playerPayload,
      handleIncomingWsMessage,
      (status, statusMsg) => {
        if (statusMsg) setNetworkMessage(statusMsg);
        if (status === 'waiting' || status === 'ready' || status === 'connecting') {
          setRoomConnected(true);
        }
        if (status === 'waiting') {
          setRoomStatus('waiting');
        } else if (status === 'ready') {
          setRoomStatus('ready');
        } else if (status === 'error') {
          showToast(statusMsg || 'Koneksi room gagal.');
        }
      }
    );
  };

  const broadcastMultiplayerEvent = (msg: any) => {
    multiplayerNet.send(msg);
  };

  const handleStartMultiplayerMatch = () => {
    const newMatchId = `${currentRoomId}-${Date.now()}`;
    setMatchId(newMatchId);
    resetMatchState();
    broadcastMultiplayerEvent({
      type: 'game-started',
      level: currentLevel,
      matchId: newMatchId
    });
    broadcastMultiplayerEvent({
      type: 'start-game',
      level: currentLevel,
      matchId: newMatchId
    });
    setCurrentModal(null);
    setGameMode('multi');
    setCurrentPage('gameplay');
    if (soundEnabled) seaAudio.startBGM();
  };

  const handleSelectSingleLevel = (lvl: number) => {
    setCurrentModal(null);
    setCurrentLevel(lvl);
    setGameMode('single');
    setCurrentPage('gameplay');
    if (soundEnabled) seaAudio.startBGM();
  };

  // When game completes (accumulates points & mutiara to active avatar)
  const handleFinishGame = (p1Stats: PlayerStats, p2Stats: PlayerStats, gameOverState?: boolean) => {
    // Copy: the gameplay refs are mutable objects
    setFinalP1({ ...p1Stats });
    setFinalP2({ ...p2Stats });
    setIsGameOver(!!gameOverState);
    seaAudio.stopBGM();

    // Multiplayer results go to the separate multiplayer leaderboard (recorded once
    // the opponent's final result is known), not to the single-player avatar stats.
    if (gameMode === 'multi') {
      setCurrentPage('results');
      return;
    }

    // Every game is saved as a row in the shared games.csv. Game-over rows are kept as a
    // record for the teacher but are not counted in the ranking (peringkat tidak dicatat).
    if (activeAvatar) {
      applyDbChange(
        addGamesOp([
          {
            gameId: `G-${activeAvatar.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            avatarId: activeAvatar.id,
            level: currentLevel,
            score: p1Stats.score,
            pearls: p1Stats.pearls || 0,
            correct: p1Stats.correct,
            wrong: p1Stats.wrong,
            timeMs: p1Stats.timeMs || 0,
            status: gameOverState ? 'eliminated' : 'finished',
            date: new Date().toISOString()
          }
        ])
      );
    }

    if (!gameOverState && activeAvatar) {
      // Unlock next level if Level 1/2 completed with >= 3 correct answers
      if (p1Stats.correct >= 3) {
        if (currentLevel === 1 && !unlockedLevels.includes(2)) {
          const nextUnlocked = [...unlockedLevels, 2];
          setUnlockedLevels(nextUnlocked);
          saveStorage(STORAGE_KEYS.UNLOCKED_LEVELS, nextUnlocked);
        } else if (currentLevel === 2 && !unlockedLevels.includes(3)) {
          const nextUnlocked = [...unlockedLevels, 3];
          setUnlockedLevels(nextUnlocked);
          saveStorage(STORAGE_KEYS.UNLOCKED_LEVELS, nextUnlocked);
        }
      }
    }

    setCurrentPage('results');
  };

  return (
    <div className="min-h-screen w-full bg-[#00172e] text-white flex flex-col relative overflow-x-hidden font-sans">
      
      {/* Toast Notification Container (No window.alert) */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#00244d] border-2 border-[#FFDC00] text-white font-bold text-sm shadow-2xl animate-fadeIn flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Background Ambient Bubbles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-50px] -left-1/4 w-[150%] h-[70%] bg-[repeating-linear-gradient(75deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_35px,transparent_35px,transparent_90px)] blur-md" />
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-radial from-white/70 to-[#7FDBFF]/20 border border-white/40 animate-rise"
            style={{
              width: `${(i % 5) * 6 + 12}px`,
              height: `${(i % 5) * 6 + 12}px`,
              left: `${(i * 5.6) % 100}%`,
              bottom: '-30px',
              animationDuration: `${(i % 6) * 2 + 7}s`,
              animationDelay: `-${(i % 5) * 1.5}s`
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          PAGES
          ═══════════════════════════════════════════════ */}

      {/* 1. SPLASH SCREEN PAGE */}
      {currentPage === 'splash' && (
        <SplashScreen
          onStart={() => {
            seaAudio.init();
            setCurrentPage('home');
          }}
          onOpenGuide={() => setCurrentModal('guide')}
        />
      )}

      {/* 2. HOME PAGE */}
      {currentPage === 'home' && (
        <HomePage
          avatar={activeAvatar}
          avatarsCount={avatars.length}
          highScore={activeAvatar ? activeAvatar.totalScore : 0}
          onOpenModal={(modal) => setCurrentModal(modal)}
          onStartSinglePlayer={() => {
            if (!activeAvatar) {
              showToast('Buat avatar dulu ya sebelum bertualang!');
              setCurrentModal('avatar');
            } else {
              setCurrentModal('level');
            }
          }}
          onStartMultiplayer={() => {
            if (!activeAvatar) {
              showToast('Buat avatar dulu ya sebelum bertualang!');
              setCurrentModal('avatar');
            } else {
              setCurrentModal('multiplayer');
            }
          }}
        />
      )}

      {/* 3. GAMEPLAY PAGE */}
      {currentPage === 'gameplay' && (
        <GameplayPage
          gameMode={gameMode}
          currentLevel={currentLevel}
          playerAvatar={{
            id: activeAvatar?.id,
            name: activeAvatar?.name || 'Penyelam',
            emoji: activeAvatar?.emoji || '🐠',
            color: activeAvatar?.color || 'blue'
          }}
          p2Profile={isHost ? p2Info : p1Info}
          questions={questions}
          onExitGame={() => {
            seaAudio.stopBGM();
            setCurrentPage('home');
          }}
          onFinishGame={handleFinishGame}
          broadcastEvent={broadcastMultiplayerEvent}
          subscribeMultiplayerEvents={subscribeMultiplayerEvents}
        />
      )}

      {/* 4. RESULTS PAGE */}
      {currentPage === 'results' && finalP1 && (
        <ResultsPage
          gameMode={gameMode}
          currentLevel={currentLevel}
          p1={finalP1}
          opponent={gameMode === 'multi' ? opponentDisplay : undefined}
          isGameOver={isGameOver}
          onPlayAgain={() => {
            // Single player only — a multiplayer match cannot be replayed in the same session
            if (gameMode === 'multi') return;
            setCurrentPage('gameplay');
            if (soundEnabled) seaAudio.startBGM();
          }}
          onViewLeaderboard={() => {
            setLeaderboardMode(gameMode);
            setCurrentModal('leaderboard');
          }}
          onHome={() => {
            setCurrentPage('home');
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════ */}

      {/* Avatar Creator & Switcher Modal (Supports 2 or more avatars) */}
      {currentModal === 'avatar' && (
        <AvatarModal
          avatars={avatars}
          activeAvatarId={activeAvatar?.id || null}
          onSelectAvatar={handleSelectAvatar}
          onCreateAvatar={handleCreateAvatar}
          dbStatus={dbStatus}
          onClose={() => setCurrentModal(null)}
        />
      )}

      {/* Single Player Level Select Modal */}
      {currentModal === 'level' && (
        <LevelSelectModal
          unlockedLevels={unlockedLevels}
          onSelectLevel={handleSelectSingleLevel}
          onClose={() => setCurrentModal(null)}
        />
      )}

      {/* Multiplayer Room Modal */}
      {currentModal === 'multiplayer' && (
        <MultiplayerModal
          playerName={activeAvatar?.name || 'Penyelam'}
          playerAvatar={activeAvatar?.emoji || '🐠'}
          onJoinOrCreateRoom={handleJoinOrCreateRoom}
          onStartGame={handleStartMultiplayerMatch}
          onClose={() => {
            setRoomConnected(false);
            setRoomStatus('idle');
            setCurrentModal(null);
            multiplayerNet.destroy();
          }}
          roomConnected={roomConnected}
          roomStatus={roomStatus}
          currentRoomId={currentRoomId}
          networkMessage={networkMessage}
          p1Info={p1Info}
          p2Info={p2Info}
          isHost={isHost}
        />
      )}

      {/* Guide / Petunjuk Modal */}
      {currentModal === 'guide' && (
        <GuideModal onClose={() => setCurrentModal(null)} />
      )}

      {/* Settings Modal */}
      {currentModal === 'settings' && (
        <SettingsModal
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            saveStorage(STORAGE_KEYS.SOUND, next);
            if (!next) {
              seaAudio.stopBGM();
            }
          }}
          onResetData={() => {
            // Resets THIS device only. The shared leaderboard database stays on the server
            // (teachers manage it from the leaderboard's Mode Guru).
            const unsent = localStorage.getItem('pa_db_outbox'); // keep results not yet uploaded
            localStorage.clear();
            if (unsent) localStorage.setItem('pa_db_outbox', unsent);
            saveStorage(STORAGE_KEYS.DB_MIGRATED, true);
            setActiveAvatarId(null);
            setUnlockedLevels([1]);
            setQuestions(DEFAULT_QUESTIONS);
            dbRef.current = loadLocalDb();
            setDb(dbRef.current);
            refreshDb();
            setCurrentModal(null);
            showToast('Data perangkat ini berhasil direset.');
          }}
          onClose={() => setCurrentModal(null)}
        />
      )}

      {/* Teacher Authentication Modal for Question Bank & CSV */}
      {currentModal === 'teacher-auth' && (
        <TeacherAuthModal
          onSuccess={() => {
            setCurrentModal('crud');
          }}
          onClose={() => setCurrentModal(null)}
        />
      )}

      {/* CRUD & CSV Bank Soal Modal (Teacher Access) */}
      {currentModal === 'crud' && (
        <CrudModal
          questions={questions}
          onSaveQuestions={(newQuestions) => {
            setQuestions(newQuestions);
            saveStorage(STORAGE_KEYS.QUESTIONS, newQuestions);
          }}
          onClose={() => setCurrentModal(null)}
        />
      )}

      {/* Leaderboard Modal (Unique Avatars with Filters: Juara Umum, Zona 1, Zona 2, Zona 3) */}
      {currentModal === 'leaderboard' && (
        <LeaderboardModal
          initialMode={leaderboardMode}
          avatars={avatars}
          multiResults={multiResults}
          dbStatus={dbStatus}
          onRefresh={refreshDb}
          teacher={{
            deleteAvatar: handleTeacherDeleteAvatar,
            resetScores: (pwd) => runTeacherAction(() => teacherApi.resetGames(pwd)),
            importSingle: (pwd, profiles) =>
              runTeacherAction(() => teacherApi.importData(pwd, legacyProfilesToRecords(profiles))),
            deleteMultiPlayer: (pwd, key) => runTeacherAction(() => teacherApi.deleteMultiPlayer(pwd, key)),
            deleteMultiMatch: (pwd, id) => runTeacherAction(() => teacherApi.deleteMultiMatch(pwd, id)),
            resetMulti: (pwd) => runTeacherAction(() => teacherApi.resetMulti(pwd)),
            importMulti: (pwd, rows) => runTeacherAction(() => teacherApi.importData(pwd, { multi: rows }))
          }}
          onClose={() => {
            setLeaderboardMode('single');
            setCurrentModal(null);
          }}
        />
      )}

    </div>
  );
}
