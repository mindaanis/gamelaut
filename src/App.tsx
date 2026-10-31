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
import {
  MultiResultRow,
  loadMultiResults,
  saveMultiResults,
  mergeMultiResults,
  resolveMatch
} from './game/multiplayerLeaderboard.ts';
import { seaAudio } from './game/audio.ts';

import { multiplayerNet } from './game/multiplayerNetwork.ts';

const STORAGE_KEYS = {
  AVATARS_LIST: 'pa_avatars_list',
  ACTIVE_AVATAR_ID: 'pa_active_avatar_id',
  OLD_AVATAR: 'pa_avatar', // For migration
  SOUND: 'pa_sound',
  QUESTIONS: 'pa_questions',
  UNLOCKED_LEVELS: 'pa_unlocked_levels'
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

export default function App() {
  // Page Router
  const [currentPage, setCurrentPage] = useState<ActivePage>('splash');
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persistence State: Multiple Avatars System
  const [avatars, setAvatars] = useState<AvatarProfile[]>(() => {
    const list = loadStorage<AvatarProfile[]>(STORAGE_KEYS.AVATARS_LIST, []);
    if (list.length > 0) {
      return list.map((a) => {
        if (!a.playedZones) {
          const pz: number[] = [];
          if ((a.zoneScores?.[1] || 0) > 0) pz.push(1);
          if ((a.zoneScores?.[2] || 0) > 0) pz.push(2);
          if ((a.zoneScores?.[3] || 0) > 0) pz.push(3);
          return { ...a, playedZones: pz };
        }
        return a;
      });
    }

    // Check legacy avatar migration
    const old = loadStorage<any>(STORAGE_KEYS.OLD_AVATAR, null);
    if (old && old.name) {
      const migrated: AvatarProfile = {
        id: `AVT-${Date.now()}`,
        name: old.name,
        emoji: old.emoji || '🐠',
        color: old.color || 'blue',
        totalScore: 0,
        totalPearls: 0,
        totalCorrect: 0,
        totalWrong: 0,
        gamesPlayed: 0,
        playedZones: [],
        zoneScores: { 1: 0, 2: 0, 3: 0 },
        createdAt: new Date().toISOString(),
        lastPlayed: new Date().toISOString()
      };
      saveStorage(STORAGE_KEYS.AVATARS_LIST, [migrated]);
      return [migrated];
    }
    return [];
  });

  const [activeAvatarId, setActiveAvatarId] = useState<string | null>(() => {
    return loadStorage<string | null>(STORAGE_KEYS.ACTIVE_AVATAR_ID, null);
  });

  // Current active avatar
  const activeAvatar = React.useMemo(() => {
    if (!avatars || avatars.length === 0) return null;
    return avatars.find((a) => a.id === activeAvatarId) || avatars[0];
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
  const [multiResults, setMultiResults] = useState<MultiResultRow[]>(() => loadMultiResults());

  const [leaderboardMode, setLeaderboardMode] = useState<'single' | 'multi'>('single');

  // Only calls state setters, so it is safe to use from the stable network callback
  const resetMatchState = () => {
    setFinalP1(null);
    setFinalP2(null);
    setIsGameOver(false);
    setOpponentResult(null);
  };

  const updateMultiResults = (next: MultiResultRow[]) => {
    setMultiResults(next);
    saveMultiResults(next);
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

  const handleCreateAvatar = (newAvatar: AvatarProfile): boolean => {
    const updated = [...avatars, newAvatar];
    setAvatars(updated);
    setActiveAvatarId(newAvatar.id);
    saveStorage(STORAGE_KEYS.AVATARS_LIST, updated);
    saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, newAvatar.id);
    showToast(`Avatar ${newAvatar.name} berhasil dibuat!`);
    return true;
  };

  const handleDeleteAvatar = (id: string) => {
    const updated = avatars.filter(a => a.id !== id);
    setAvatars(updated);
    saveStorage(STORAGE_KEYS.AVATARS_LIST, updated);
    if (activeAvatarId === id) {
      const nextActive = updated.length > 0 ? updated[0].id : null;
      setActiveAvatarId(nextActive);
      saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, nextActive);
    }
    showToast('Avatar telah dihapus.');
  };

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
    setMultiResults((prev) => {
      const next = mergeMultiResults(prev, rows);
      saveMultiResults(next);
      return next;
    });

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

    // If game over, DO NOT RECORD to leaderboard or avatar (Sesuai Permintaan: peringkat tidak dicatat)
    if (!gameOverState && activeAvatar) {
      const sessionTotal = p1Stats.score; // Already includes question points + pearls * 10
      const sessionPearls = p1Stats.pearls || 0;

      // Update avatar: all points and pearls permanently attach to this unique avatar!
      const updatedAvatars = avatars.map((a) => {
        if (a.id === activeAvatar.id) {
          const currentZoneBest = a.zoneScores?.[currentLevel as 1 | 2 | 3] || 0;
          const currentPlayed = Array.from(new Set([...(a.playedZones || []), currentLevel]));
          return {
            ...a,
            totalScore: a.totalScore + sessionTotal,
            totalPearls: a.totalPearls + sessionPearls,
            totalCorrect: a.totalCorrect + p1Stats.correct,
            totalWrong: a.totalWrong + p1Stats.wrong,
            gamesPlayed: a.gamesPlayed + 1,
            playedZones: currentPlayed,
            zoneScores: {
              ...a.zoneScores,
              [currentLevel]: Math.max(currentZoneBest, sessionTotal)
            },
            lastPlayed: new Date().toISOString()
          };
        }
        return a;
      });

      setAvatars(updatedAvatars);
      saveStorage(STORAGE_KEYS.AVATARS_LIST, updatedAvatars);

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
          onDeleteAvatar={handleDeleteAvatar}
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
            localStorage.clear();
            setAvatars([]);
            setActiveAvatarId(null);
            setUnlockedLevels([1]);
            setQuestions(DEFAULT_QUESTIONS);
            setMultiResults([]);
            setCurrentModal(null);
            showToast('Semua data berhasil direset.');
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
          onImportAvatars={(imported) => {
            setAvatars(imported);
            saveStorage(STORAGE_KEYS.AVATARS_LIST, imported);
            if (imported.length > 0 && !activeAvatarId) {
              setActiveAvatarId(imported[0].id);
              saveStorage(STORAGE_KEYS.ACTIVE_AVATAR_ID, imported[0].id);
            }
          }}
          onDeleteAvatar={handleDeleteAvatar}
          onResetAllScores={() => {
            const reset = avatars.map((a) => ({
              ...a,
              totalScore: 0,
              totalPearls: 0,
              totalCorrect: 0,
              totalWrong: 0,
              gamesPlayed: 0,
              playedZones: [],
              zoneScores: { 1: 0, 2: 0, 3: 0 }
            }));
            setAvatars(reset);
            saveStorage(STORAGE_KEYS.AVATARS_LIST, reset);
          }}
          multiResults={multiResults}
          onMultiResultsChange={updateMultiResults}
          onClose={() => {
            setLeaderboardMode('single');
            setCurrentModal(null);
          }}
        />
      )}

    </div>
  );
}
