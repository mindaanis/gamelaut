import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  ZONE_CONFIGS,
  BUBBLE_COORDS,
  ORGANIC_PEARL_COORDS,
  ZONA_1_DECOR,
  ZONA_2_DECOR,
  ZONA_3_DECOR,
  ORGANIC_WORLD_BUBBLES
} from '../game/constants.ts';
import {
  PlayerStats,
  StationaryBubble,
  PearlItem,
  MovingJellyfish,
  AmbientFish
} from '../types/game.ts';
import { Question, checkCollision } from '../game/logic.ts';
import { seaAudio } from '../game/audio.ts';
import { QuestionModal } from '../components/modals/QuestionModal.tsx';

interface GameplayPageProps {
  gameMode: 'single' | 'multi';
  currentLevel: number;
  playerAvatar: { name: string; emoji: string; color?: string };
  p2Profile?: { name: string; avatar: string; color?: string };
  questions: Question[];
  onExitGame: () => void;
  onFinishGame: (finalP1: PlayerStats, finalP2: PlayerStats, isGameOver?: boolean) => void;
  broadcastEvent?: (msg: any) => void;
  subscribeMultiplayerEvents?: (handler: (msg: any) => void) => () => void;
}

export const GameplayPage: React.FC<GameplayPageProps> = ({
  gameMode,
  currentLevel,
  playerAvatar,
  p2Profile,
  questions,
  onExitGame,
  onFinishGame,
  broadcastEvent,
  subscribeMultiplayerEvents
}) => {
  const zoneConfig = ZONE_CONFIGS[currentLevel] || ZONE_CONFIGS[1];
  const arenaRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sound toggle state
  const [soundOn, setSoundOn] = useState(seaAudio.enabled);

  // Custom Exit Confirmation Modal State (replaces blocked window.confirm)
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Exploration Hint Toast
  const [showIntroToast, setShowIntroToast] = useState(true);

  // Mobile Device Detection & Orientation State
  const [isTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
    );
  });

  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  const [showRotatePrompt, setShowRotatePrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 850);
    return isMobile && window.innerHeight > window.innerWidth;
  });

  const [showVirtualControls, setShowVirtualControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Monitor orientation & fullscreen changes
  useEffect(() => {
    const handleResize = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      setIsFullscreen(!!document.fullscreenElement);
      if (!portrait) {
        setShowRotatePrompt(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  const requestFullscreenAndLandscape = async () => {
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
      setIsFullscreen(true);
    } catch {}

    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch {}
    setShowRotatePrompt(false);
  };

  const exitFullscreenAndRestorePortrait = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch {}

    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('portrait');
      } else if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch {
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch {}
    }
  };

  // Grace period before bubbles can be triggered (prevents instant pop on start)
  const [canInteractWithBubbles, setCanInteractWithBubbles] = useState(false);

  // Active question modal state
  const [activeQuestion, setActiveQuestion] = useState<{ id: string; q: Question } | null>(null);

  // Lives state (3 hearts)
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  livesRef.current = lives;

  // Player 1 state (Starts at safe dock/origin away from bubbles)
  const p1Ref = useRef<PlayerStats>({
    id: `P1-${Date.now()}`,
    name: playerAvatar.name || 'Penyelam',
    avatar: playerAvatar.emoji || '🐠',
    color: playerAvatar.color || 'blue',
    x: 200,
    y: 200,
    width: 58,
    height: 58,
    vx: 0,
    vy: 0,
    speed: 5.8,
    baseSpeed: 5.8,
    facingRight: true,
    isShocked: false,
    score: 0,
    correct: 0,
    wrong: 0,
    pearls: 0,
    startTime: Date.now()
  });

  // Player 2 state (for multiplayer)
  const p2Ref = useRef<PlayerStats>({
    id: `P2-${Date.now()}`,
    name: p2Profile?.name || 'Lawan',
    avatar: p2Profile?.avatar || '🐬',
    color: p2Profile?.color || 'coral',
    x: 280,
    y: 200,
    width: 58,
    height: 58,
    vx: 0,
    vy: 0,
    speed: 5.8,
    baseSpeed: 5.8,
    facingRight: false,
    isShocked: false,
    score: 0,
    correct: 0,
    wrong: 0,
    pearls: 0,
    startTime: Date.now()
  });

  const [hudScores, setHudScores] = useState({ p1: 0, p2: 0 });
  const [answeredCount, setAnsweredCount] = useState(0);
  const answeredCountRef = useRef(0);
  answeredCountRef.current = answeredCount;

  // Stationary Bubbles (Fixed locations, DO NOT MOVE, SMALLER SIZE)
  const [bubbles, setBubbles] = useState<StationaryBubble[]>([]);
  const bubblesRef = useRef<StationaryBubble[]>([]);

  // Collectible Pearls (+10 bonus points)
  const [pearls, setPearls] = useState<PearlItem[]>([]);
  const pearlsRef = useRef<PearlItem[]>([]);

  // Moving Jellyfish Obstacles (PATROLLING & DRIFTING)
  const jellyfishesRef = useRef<MovingJellyfish[]>([]);

  // Moving Ambient School of Small Fish
  const ambientFishesRef = useRef<AmbientFish[]>([]);

  // Viewport Camera coordinates
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const keysDownRef = useRef<Record<string, boolean>>({});

  // Questions pool for this level
  const targetCount = gameMode === 'multi' ? 15 : 5;
  const levelQuestionsRef = useRef<Question[]>([]);

  // Start BGM on mount if sound is enabled & request landscape/fullscreen automatically
  useEffect(() => {
    if (seaAudio.enabled) {
      seaAudio.startBGM();
    }
    requestFullscreenAndLandscape();

    return () => {
      seaAudio.stopBGM();
      exitFullscreenAndRestorePortrait();
    };
  }, []);

  // Initialize Entities on Mount / Level Change
  useEffect(() => {
    // Filter questions
    const pool = questions.filter(q => q.level === currentLevel);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    levelQuestionsRef.current = shuffled.slice(0, targetCount);

    // Spawn Stationary Bubbles (Evenly and randomly distributed across the entire 3000x2000 arena)
    // In single player (5 bubbles), bubbles span shallow, mid-depth, and deep seabed!
    const initialBubbles: StationaryBubble[] = [];
    for (let i = 0; i < targetCount; i++) {
      const coord = BUBBLE_COORDS[i % BUBBLE_COORDS.length];
      const offsetX = ((i * 37) % 60) - 30;
      const offsetY = ((i * 43) % 60) - 30;
      initialBubbles.push({
        id: `bubble-${i}`,
        index: i,
        x: Math.max(120, Math.min(WORLD_WIDTH - 120, coord.x + offsetX)),
        y: Math.max(220, Math.min(WORLD_HEIGHT - 140, coord.y + offsetY)),
        width: 52,
        height: 52,
        active: true
      });
    }
    setBubbles(initialBubbles);
    bubblesRef.current = initialBubbles;

    // Spawn Collectible Pearls using organic non-diagonal layout
    const initialPearls: PearlItem[] = [];
    for (let i = 0; i < ORGANIC_PEARL_COORDS.length; i++) {
      const pCoord = ORGANIC_PEARL_COORDS[i];
      initialPearls.push({
        id: `pearl-${i}`,
        x: pCoord.x,
        y: pCoord.y,
        width: 36,
        height: 36,
        active: true
      });
    }
    setPearls(initialPearls);
    pearlsRef.current = initialPearls;

    // Spawn Moving Jellyfishes with velocities (patrolling & drifting)
    const initialJellies: MovingJellyfish[] = [];
    for (let i = 0; i < 11; i++) {
      const baseY = Math.floor(i / 3) * 560 + 380;
      initialJellies.push({
        id: `jelly-${i}`,
        x: (i * 290) % (WORLD_WIDTH - 320) + 200,
        y: baseY,
        vx: (Math.random() * 1.6 + 0.9) * (i % 2 === 0 ? 1 : -1),
        vy: (Math.random() * 1.3 + 0.7) * (i % 3 === 0 ? 1 : -1),
        width: 54,
        height: 54,
        minY: Math.max(120, baseY - 200),
        maxY: Math.min(WORLD_HEIGHT - 140, baseY + 200)
      });
    }
    jellyfishesRef.current = initialJellies;

    // Spawn Moving Ambient Small Fishes (schools of fish according to zone)
    const initialAmbientFish: AmbientFish[] = [];
    const fishEmojis = currentLevel === 3
      ? ['🦑', '🐟', '🐡', '🏮', '✨']
      : currentLevel === 2
      ? ['🐟', '🦈', '🐠', '🐙']
      : ['🐠', '🐡', '🐟', '🐬'];

    for (let i = 0; i < 24; i++) {
      initialAmbientFish.push({
        id: `ambient-fish-${i}`,
        emoji: fishEmojis[i % fishEmojis.length],
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * (WORLD_HEIGHT - 200) + 100,
        vx: (Math.random() * 2.2 + 1.2) * (i % 2 === 0 ? 1 : -1),
        size: Math.floor(Math.random() * 18) + 24
      });
    }
    ambientFishesRef.current = initialAmbientFish;

    // Reset player position safely at (200, 200)
    p1Ref.current.x = 200;
    p1Ref.current.y = 200;
    p1Ref.current.score = 0;
    p1Ref.current.correct = 0;
    p1Ref.current.wrong = 0;
    p1Ref.current.pearls = 0;
    p1Ref.current.isShocked = false;
    p1Ref.current.speed = p1Ref.current.baseSpeed;
    p1Ref.current.facingRight = true;

    p2Ref.current.x = 280;
    p2Ref.current.y = 200;
    p2Ref.current.score = 0;
    p2Ref.current.correct = 0;
    p2Ref.current.wrong = 0;
    p2Ref.current.facingRight = false;

    setLives(3);
    setHudScores({ p1: 0, p2: 0 });
    setAnsweredCount(0);
    setActiveQuestion(null);

    // 2.5-second grace period before bubbles can be triggered
    setCanInteractWithBubbles(false);
    const graceTimer = setTimeout(() => {
      setCanInteractWithBubbles(true);
    }, 2500);

    // Hide intro exploration toast after 5 seconds
    const toastTimer = setTimeout(() => {
      setShowIntroToast(false);
    }, 5500);

    seaAudio.levelUp();

    return () => {
      clearTimeout(graceTimer);
      clearTimeout(toastTimer);
    };
  }, [currentLevel, targetCount, questions, gameMode]);

  // Keep the opponent's identity in sync with the room info
  useEffect(() => {
    if (!p2Profile) return;
    p2Ref.current.name = p2Profile.name || p2Ref.current.name;
    p2Ref.current.avatar = p2Profile.avatar || p2Ref.current.avatar;
  }, [p2Profile?.name, p2Profile?.avatar]);

  const onFinishGameRef = useRef(onFinishGame);
  onFinishGameRef.current = onFinishGame;

  // Synchronize incoming multiplayer events (p2Ref always = the opponent on this device)
  useEffect(() => {
    if (gameMode !== 'multi' || !subscribeMultiplayerEvents) return;

    return subscribeMultiplayerEvents((msg: any) => {
      const p2 = p2Ref.current;

      // 'player-pos' arrives raw via WebRTC / BroadcastChannel / WS relay, 'opponent-pos' from older servers
      if (msg.type === 'player-pos' || msg.type === 'opponent-pos') {
        if (typeof msg.x === 'number') p2.x = msg.x;
        if (typeof msg.y === 'number') p2.y = msg.y;
        p2.facingRight = !!msg.facingRight;
        p2.isShocked = !!msg.isShocked;
      } else if (msg.type === 'answer-submitted') {
        if (typeof msg.score === 'number') p2.score = msg.score;
        if (typeof msg.correct === 'number') p2.correct = msg.correct;
        if (typeof msg.wrong === 'number') p2.wrong = msg.wrong;
        setHudScores({ p1: p1Ref.current.score, p2: p2.score });
      } else if (msg.type === 'pearl-collected' || msg.type === 'pearl-collected-broadcast') {
        const pearl = pearlsRef.current.find(p => p.id === msg.pearlId);
        if (pearl && pearl.active) {
          pearl.active = false;
          setPearls([...pearlsRef.current]);
        }
        if (typeof msg.score === 'number') {
          p2.score = msg.score;
          if (typeof msg.pearls === 'number') p2.pearls = msg.pearls;
          setHudScores({ p1: p1Ref.current.score, p2: p2.score });
        }
      } else if (msg.type === 'bubble-popped-broadcast') {
        const bubble = bubblesRef.current.find(b => b.id === msg.bubbleId);
        if (bubble) {
          bubble.active = false;
          setBubbles([...bubblesRef.current]);
        }
      } else if (msg.type === 'match-ended') {
        onFinishGameRef.current(p1Ref.current, p2Ref.current, false);
      }
    });
  }, [gameMode, subscribeMultiplayerEvents]);

  // Handle Shock on Jellyfish collision
  const triggerShock = useCallback((player: PlayerStats) => {
    player.isShocked = true;
    player.speed = player.baseSpeed * 0.4; // 60% slow down for 5 seconds
    seaAudio.shockBuzz();

    if (player.shockTimer) clearTimeout(player.shockTimer as number);
    player.shockTimer = setTimeout(() => {
      player.isShocked = false;
      player.speed = player.baseSpeed;
    }, 5000);
  }, []);

  // Trigger Game Over when lives reach 0
  const handleTriggerGameOver = useCallback(() => {
    seaAudio.gameOver();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    onFinishGame(p1Ref.current, p2Ref.current, true);
  }, [onFinishGame]);

  // Handle Answer Submitted from Question Modal
  const handleAnswerSubmitted = (isCorrect: boolean, points: number) => {
    const p1 = p1Ref.current;
    if (isCorrect) {
      p1.score += points;
      p1.correct += 1;
    } else {
      p1.wrong += 1;
      const nextLives = livesRef.current - 1;
      setLives(nextLives);
      livesRef.current = nextLives;

      if (nextLives <= 0) {
        // Nyawa habis -> Game Over!
        setTimeout(() => {
          setActiveQuestion(null);
          handleTriggerGameOver();
        }, 1200);
        return;
      }
    }

    setHudScores({ p1: p1.score, p2: p2Ref.current.score });

    if (gameMode === 'multi' && broadcastEvent) {
      broadcastEvent({
        type: 'answer-submitted',
        isCorrect,
        points,
        score: p1.score,
        correct: p1.correct,
        wrong: p1.wrong
      });
    }

    const nextCount = answeredCountRef.current + 1;
    setAnsweredCount(nextCount);
    answeredCountRef.current = nextCount;

    // Check if target questions are met
    if (nextCount >= targetCount) {
      setTimeout(() => {
        setActiveQuestion(null);
        seaAudio.levelUp();
        onFinishGame(p1Ref.current, p2Ref.current, false);
      }, 1500);
    }
  };

  // Main Game Loop: Player motion, Moving Jellyfish, Moving Fish, Camera tracking
  useEffect(() => {
    let lastBroadcastTime = 0;

    const loop = (timestamp: number) => {
      const p1 = p1Ref.current;
      const keys = keysDownRef.current;

      // Pause player movement while question modal or exit confirm is open
      if (!activeQuestion && !showExitConfirm) {
        // 1. Player 1 Movement
        let dx = 0;
        let dy = 0;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
        if (keys['ArrowDown'] || keys['KeyS']) dy += 1;
        if (keys['ArrowLeft'] || keys['KeyA']) { dx -= 1; p1.facingRight = false; }
        if (keys['ArrowRight'] || keys['KeyD']) { dx += 1; p1.facingRight = true; }

        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        p1.x += dx * p1.speed;
        p1.y += dy * p1.speed;

        // Clamp inside world boundaries
        p1.x = Math.max(20, Math.min(WORLD_WIDTH - p1.width - 20, p1.x));
        p1.y = Math.max(20, Math.min(WORLD_HEIGHT - p1.height - 20, p1.y));
      }

      // Broadcast position for multiplayer at ~25fps
      if (gameMode === 'multi' && broadcastEvent && timestamp - lastBroadcastTime > 40) {
        lastBroadcastTime = timestamp;
        broadcastEvent({
          type: 'player-pos',
          x: p1.x,
          y: p1.y,
          facingRight: p1.facingRight,
          isShocked: p1.isShocked
        });
      }

      // 2. Update Moving Jellyfish Obstacles (Drifting & Patrolling)
      jellyfishesRef.current.forEach(jelly => {
        jelly.x += jelly.vx;
        jelly.y += jelly.vy;

        // Bounce horizontally
        if (jelly.x <= 60 || jelly.x >= WORLD_WIDTH - 120) {
          jelly.vx = -jelly.vx;
        }

        // Bounce vertically within territory
        if (jelly.y <= jelly.minY || jelly.y >= jelly.maxY) {
          jelly.vy = -jelly.vy;
        }

        // Check collision with player
        if (!activeQuestion && !showExitConfirm && checkCollision(p1, jelly) && !p1.isShocked) {
          triggerShock(p1);
        }
      });

      // 3. Update Moving Ambient Small Fishes (Continuous swimming)
      ambientFishesRef.current.forEach(fish => {
        fish.x += fish.vx;
        if (fish.vx > 0 && fish.x > WORLD_WIDTH + 80) {
          fish.x = -80;
          fish.y = Math.random() * (WORLD_HEIGHT - 200) + 100;
        } else if (fish.vx < 0 && fish.x < -80) {
          fish.x = WORLD_WIDTH + 80;
          fish.y = Math.random() * (WORLD_HEIGHT - 200) + 100;
        }
      });

      // 4. Check Collision with Collectible Pearls (+10 bonus points)
      if (!activeQuestion && !showExitConfirm) {
        pearlsRef.current.forEach(pearl => {
          if (pearl.active && checkCollision(p1, pearl)) {
            pearl.active = false;
            p1.score += 10;
            p1.pearls++;
            seaAudio.pearlDing();
            setHudScores({ p1: p1.score, p2: p2Ref.current.score });
            setPearls([...pearlsRef.current]);

            if (gameMode === 'multi' && broadcastEvent) {
              broadcastEvent({
                type: 'pearl-collected',
                pearlId: pearl.id,
                score: p1.score,
                pearls: p1.pearls
              });
            }
          }
        });
      }

      // 5. Check Collision with Stationary Question Bubbles (Only if grace period passed and not currently in modal)
      if (canInteractWithBubbles && !activeQuestion && !showExitConfirm) {
        bubblesRef.current.forEach(bubble => {
          if (bubble.active && checkCollision(p1, bubble)) {
            bubble.active = false;
            setBubbles([...bubblesRef.current]);
            seaAudio.pop();

            const qIndex = bubble.index % levelQuestionsRef.current.length;
            const question = levelQuestionsRef.current[qIndex];
            if (question) {
              setActiveQuestion({ id: bubble.id, q: question });
            }
          }
        });
      }

      // 6. Camera Follow
      if (arenaRef.current) {
        const viewW = arenaRef.current.clientWidth;
        const viewH = arenaRef.current.clientHeight;

        let camX = (p1.x + p1.width / 2) - viewW / 2;
        let camY = (p1.y + p1.height / 2) - viewH / 2;

        camX = Math.max(0, Math.min(WORLD_WIDTH - viewW, camX));
        camY = Math.max(0, Math.min(WORLD_HEIGHT - viewH, camY));

        setCamera({ x: camX, y: camY });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameMode, broadcastEvent, triggerShock, canInteractWithBubbles, activeQuestion, showExitConfirm]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      delete keysDownRef.current[e.code];
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Direction handler for on-screen D-Pad (mobile)
  const handleDpadPress = (code: string, isPressed: boolean) => {
    if (isPressed) {
      keysDownRef.current[code] = true;
    } else {
      delete keysDownRef.current[code];
    }
  };

  const p1 = p1Ref.current;
  const p2 = p2Ref.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#001020]">
      {/* ═══════════════════════════════════════════════
          TOP HUD NAVIGATION & STATS
          ═══════════════════════════════════════════════ */}
      <div className="absolute top-3 left-3 right-3 z-40 flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 rounded-2xl bg-[#00142e]/92 border-[1.5px] border-[#39CCCC]/40 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Custom In-Game Exit Button (No window.confirm!) */}
          <button
            onClick={() => {
              seaAudio.klik();
              setShowExitConfirm(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/30 border border-white/25 hover:border-rose-400 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Keluar ke Menu Utama"
          >
            <span>✕</span>
            <span>Keluar</span>
          </button>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FFDC00]/20 text-[#FFDC00] border border-[#FFDC00]/50">
            ZONA {currentLevel}
          </span>
        </div>

        <div className="text-sm md:text-base font-extrabold text-[#FFDC00] drop-shadow-sm flex items-center gap-2">
          {zoneConfig.name}
        </div>

        <div className="flex items-center gap-4 text-xs md:text-sm font-bold">
          {/* Lives (3 Hearts) */}
          <div className="flex items-center gap-1 text-base" title="Nyawa Tersisa">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="transition-transform duration-300">
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>

          {/* Scores */}
          <div className="flex items-center gap-1.5 text-white">
            <span>🏆 Skor:</span>
            <span className="text-[#FFDC00] text-base font-black">{hudScores.p1}</span>
          </div>

          {gameMode === 'multi' && (
            <div className="flex items-center gap-1.5 text-[#39CCCC]">
              <span>Lawan:</span>
              <span className="text-base font-black">{hudScores.p2}</span>
            </div>
          )}

          {/* Counter */}
          <div className="text-[#b8d4f0] text-xs">
            Soal: {answeredCount}/{targetCount}
          </div>

          {/* Fullscreen & Rotate Button (Great for mobile & tablets) */}
          <button
            onClick={requestFullscreenAndLandscape}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-[#39CCCC]/30 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1"
            title="Layar Penuh & Mode Lanskap"
          >
            <span>⛶</span>
            <span className="hidden md:inline">{isFullscreen ? 'Kecilkan' : 'Layar Penuh'}</span>
          </button>

          {/* Virtual Controls Toggle Button */}
          <button
            onClick={() => setShowVirtualControls(!showVirtualControls)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showVirtualControls
                ? 'bg-[#39CCCC]/25 border-[#39CCCC] text-[#39CCCC]'
                : 'bg-white/10 border-white/20 text-white/70'
            }`}
            title="Tampilkan / Sembunyikan Tombol Kontrol Layar"
          >
            <span>🎮</span>
            <span className="hidden md:inline">D-Pad</span>
          </button>

          {/* Sound & BGM Toggle */}
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              seaAudio.enabled = next;
              if (next) {
                seaAudio.startBGM();
              } else {
                seaAudio.stopBGM();
              }
            }}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm border border-white/20 cursor-pointer"
            title={soundOn ? 'Matikan Suara & Musik' : 'Nyalakan Suara & Musik'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          EXPLORATION BANNER TOAST (At start of game)
          ═══════════════════════════════════════════════ */}
      {showIntroToast && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[90%] px-4 py-2.5 rounded-2xl bg-[#00244d]/95 border-2 border-[#FFDC00] text-center shadow-2xl backdrop-blur-md animate-fadeIn pointer-events-none">
          <p className="text-xs md:text-sm font-bold text-white flex items-center justify-center gap-2">
            <span>🗺️</span>
            <span>Jelajahi samudra luas! Berenang cari Gelembung Soal (❓) dan kumpulkan Mutiara (🦪)!</span>
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MINI-MAP RADAR OVERLAY (Top Right)
          ═══════════════════════════════════════════════ */}
      <div className="absolute top-20 right-4 z-35 w-36 h-24 bg-[#001024]/85 border-[1.5px] border-[#39CCCC] rounded-xl shadow-xl overflow-hidden backdrop-blur-sm pointer-events-none hidden sm:block">
        <div className="text-[9px] font-bold text-center bg-[#0074D9]/40 text-[#FFDC00] py-0.5 border-b border-[#39CCCC]/30">
          RADAR SAMUDRA
        </div>
        <div className="relative w-full h-[calc(100%-16px)]">
          {/* Viewport boundary */}
          {arenaRef.current && (
            <div
              className="absolute border border-white/40 bg-[#39CCCC]/10"
              style={{
                left: `${(camera.x / WORLD_WIDTH) * 144}px`,
                top: `${(camera.y / WORLD_HEIGHT) * 80}px`,
                width: `${(arenaRef.current.clientWidth / WORLD_WIDTH) * 144}px`,
                height: `${(arenaRef.current.clientHeight / WORLD_HEIGHT) * 80}px`
              }}
            />
          )}

          {/* Stationary Bubbles on Radar */}
          {bubbles.map(b => b.active && (
            <div
              key={b.id}
              className="absolute w-1.5 h-1.5 rounded-full bg-[#FFDC00] shadow-[0_0_3px_#FFDC00]"
              style={{
                left: `${(b.x / WORLD_WIDTH) * 144}px`,
                top: `${(b.y / WORLD_HEIGHT) * 80}px`
              }}
            />
          ))}

          {/* Pearls on Radar */}
          {pearls.map(p => p.active && (
            <div
              key={p.id}
              className="absolute w-1 h-1 rounded-full bg-white"
              style={{
                left: `${(p.x / WORLD_WIDTH) * 144}px`,
                top: `${(p.y / WORLD_HEIGHT) * 80}px`
              }}
            />
          ))}

          {/* Player 1 (Green dot) */}
          <div
            className="absolute w-2 h-2 rounded-full bg-[#2ECC40] border border-white -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(p1.x / WORLD_WIDTH) * 144}px`,
              top: `${(p1.y / WORLD_HEIGHT) * 80}px`
            }}
          />

          {/* Player 2 (Cyan dot in multiplayer) */}
          {gameMode === 'multi' && (
            <div
              className="absolute w-2 h-2 rounded-full bg-[#39CCCC] border border-white -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(p2.x / WORLD_WIDTH) * 144}px`,
                top: `${(p2.y / WORLD_HEIGHT) * 80}px`
              }}
            />
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          EXPANSIVE OCEAN WORLD VIEWPORT (3000px x 2000px)
          ═══════════════════════════════════════════════ */}
      <div ref={arenaRef} className="w-full h-full relative overflow-hidden">
        <div
          className="absolute top-0 left-0 will-change-transform"
          style={{
            width: `${WORLD_WIDTH}px`,
            height: `${WORLD_HEIGHT}px`,
            background: zoneConfig.bgGradient,
            transform: `translate3d(${-camera.x}px, ${-camera.y}px, 0)`
          }}
        >
          {/* ═══════════════════════════════════════════════
              LIVING OCEAN ENVIRONMENT (Caustics, Floating Bubbles, Swaying Kelp)
              ═══════════════════════════════════════════════ */}

          {/* Shimmering Sunlight Caustics Rays from Ocean Surface */}
          <div className="absolute top-0 left-0 w-full h-[650px] bg-gradient-to-b from-white/18 via-sky-300/10 to-transparent blur-2xl animate-caustics pointer-events-none" />

          {/* Animated Rising & Floating World Bubbles (Organic non-diagonal layout) */}
          {ORGANIC_WORLD_BUBBLES.map((b, i) => (
            <div
              key={`world-bubble-${i}`}
              className="absolute rounded-full border border-white/35 bg-radial from-white/60 to-transparent animate-world-bubble pointer-events-none"
              style={{
                width: `${b.size}px`,
                height: `${b.size}px`,
                left: `${b.x}px`,
                top: `${b.y}px`,
                animationDelay: `-${b.delay}s`,
                animationDuration: `${b.duration}s`
              }}
            />
          ))}

          {/* Swaying Kelp and Sea Plants Forest along the seabed */}
          {Array.from({ length: 32 }).map((_, i) => {
            const posX = (i * 94) % (WORLD_WIDTH - 120) + 50;
            const isTall = i % 2 === 0;
            const swayClass = i % 3 === 0
              ? 'animate-seaweed-sway'
              : i % 3 === 1
              ? 'animate-seaweed-sway-delayed'
              : 'animate-seaweed-fast';

            return (
              <div
                key={`kelp-${i}`}
                className={`absolute bottom-0 select-none pointer-events-none ${swayClass}`}
                style={{
                  left: `${posX}px`,
                  height: isTall ? '280px' : '190px',
                  width: '42px',
                  opacity: 0.85
                }}
              >
                <svg viewBox="0 0 40 240" className="w-full h-full fill-none">
                  <path
                    d={
                      isTall
                        ? "M20 240 Q10 180 25 130 T15 60 Q10 20 20 0 Q30 20 25 60 T35 130 Q40 180 20 240 Z"
                        : "M20 240 Q8 170 24 110 T16 40 Q22 10 20 0 Q28 15 24 50 T32 110 Q34 170 20 240 Z"
                    }
                    fill={currentLevel === 3 ? "#9333ea" : currentLevel === 2 ? "#0d9488" : "#16a34a"}
                    opacity="0.8"
                  />
                  <circle cx="20" cy="40" r="4" fill="#86efac" opacity="0.6" />
                  <circle cx="24" cy="90" r="5" fill="#86efac" opacity="0.6" />
                  <circle cx="18" cy="150" r="4" fill="#86efac" opacity="0.6" />
                </svg>
              </div>
            );
          })}

          {/* 🌊 ZONA 1: TERUMBU KARANG DANGKAL (Organic non-diagonal layout) */}
          {currentLevel === 1 && (
            <div className="absolute inset-0 pointer-events-none">
              {ZONA_1_DECOR.map((item, i) => (
                <div
                  key={`coral-${i}`}
                  className="absolute text-5xl md:text-6xl drop-shadow-md opacity-85 select-none"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`
                  }}
                >
                  {item.emoji}
                </div>
              ))}
            </div>
          )}

          {/* ⚓ ZONA 2: KAPAL KARAM MISTERIUS (Organic non-diagonal wreck sites) */}
          {currentLevel === 2 && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-[650px] top-[1150px] text-8xl md:text-9xl opacity-75">
                ⛵
              </div>
              <div className="absolute left-[2200px] top-[1350px] text-8xl md:text-9xl opacity-75">
                ⚓
              </div>
              {ZONA_2_DECOR.map((item, i) => (
                <div
                  key={`ship-${i}`}
                  className="absolute text-5xl md:text-6xl drop-shadow-md opacity-80 select-none"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`
                  }}
                >
                  {item.emoji}
                </div>
              ))}
            </div>
          )}

          {/* 💎 ZONA 3: PALUNG MARIANA & GUA HARTA KARUN (Organic non-diagonal glowing abyss) */}
          {currentLevel === 3 && (
            <div className="absolute inset-0 pointer-events-none">
              {ZONA_3_DECOR.map((item, i) => (
                <div
                  key={`crystal-${i}`}
                  className="absolute text-5xl md:text-6xl drop-shadow-[0_0_16px_rgba(177,13,201,0.85)] animate-biolum select-none"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`
                  }}
                >
                  {item.emoji}
                </div>
              ))}
            </div>
          )}

          {/* MOVING AMBIENT SCHOOLS OF FISH (Corrected orientation: no backward swimming) */}
          {ambientFishesRef.current.map(fish => (
            <div
              key={fish.id}
              className="absolute pointer-events-none select-none transition-transform"
              style={{
                left: `${fish.x}px`,
                top: `${fish.y}px`,
                fontSize: `${fish.size}px`,
                // Unicode fish face left natively. When moving right (vx > 0), scaleX(-1) turns them right.
                transform: fish.vx > 0 ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            >
              {fish.emoji}
            </div>
          ))}

          {/* MOVING JELLYFISH OBSTACLES (Drifting & Patrolling) */}
          {jellyfishesRef.current.map(jelly => (
            <div
              key={jelly.id}
              className="absolute flex items-center justify-center text-4xl md:text-5xl drop-shadow-[0_0_14px_rgba(244,63,94,0.85)] pointer-events-none select-none animate-pulse"
              style={{
                left: `${jelly.x}px`,
                top: `${jelly.y}px`,
                width: `${jelly.width}px`,
                height: `${jelly.height}px`
              }}
            >
              🪼
            </div>
          ))}

          {/* COLLECTIBLE PEARLS (+10 points) */}
          {pearls.map(pearl => pearl.active && (
            <div
              key={pearl.id}
              className="absolute rounded-full flex items-center justify-center text-2xl shadow-[0_0_24px_rgba(255,255,255,0.9)] bg-gradient-to-br from-white via-sky-100 to-sky-300 border-2 border-white cursor-pointer select-none transition-transform hover:scale-115"
              style={{
                left: `${pearl.x}px`,
                top: `${pearl.y}px`,
                width: `${pearl.width}px`,
                height: `${pearl.height}px`
              }}
            >
              🦪
            </div>
          ))}

          {/* STATIONARY QUESTION BUBBLES (52px x 52px) */}
          {bubbles.map(bubble => bubble.active && (
            <div
              key={bubble.id}
              id={bubble.id}
              className="absolute rounded-full flex flex-col items-center justify-center bg-radial from-white via-[#39CCCC]/70 to-[#0074D9]/95 border-2 border-white shadow-[0_0_20px_rgba(127,219,255,0.85)] cursor-pointer select-none hover:shadow-[0_0_28px_rgba(255,220,0,0.9)] transition-all animate-pulse"
              style={{
                left: `${bubble.x}px`,
                top: `${bubble.y}px`,
                width: `${bubble.width}px`,
                height: `${bubble.height}px`
              }}
              onClick={() => {
                if (!canInteractWithBubbles || activeQuestion) return;
                bubble.active = false;
                setBubbles([...bubblesRef.current]);
                seaAudio.pop();
                const q = levelQuestionsRef.current[bubble.index % levelQuestionsRef.current.length];
                if (q) setActiveQuestion({ id: bubble.id, q });
              }}
            >
              <span className="text-base">❓</span>
              <span className="text-[9px] font-black bg-[#FFDC00] text-[#00172e] px-1.5 py-0.2 rounded-md -mt-0.5 whitespace-nowrap">
                #{bubble.index + 1}
              </span>
            </div>
          ))}

          {/* ═══════════════════════════════════════════════
              PLAYER 1 SWIMMER AVATAR
              Fix: Parent container is UNMIRRORED so name stays upright!
              Only the avatar emoji span receives scaleX!
              ═══════════════════════════════════════════════ */}
          {/* ═══════════════════════════════════════════════
              PLAYER 1 SWIMMER AVATAR
              Fix: Parent container is UNMIRRORED so name stays upright!
              Shock: Grayscale filter (100%) and violent shake for 5 seconds when hitting jellyfish!
              ═══════════════════════════════════════════════ */}
          <div
            className={`absolute flex flex-col items-center justify-center pointer-events-none drop-shadow-xl z-20 ${
              p1.isShocked ? 'shocked-avatar-filter animate-shock-shake' : ''
            }`}
            style={{
              left: `${p1.x}px`,
              top: `${p1.y}px`,
              width: `${p1.width}px`,
              height: `${p1.height}px`
            }}
          >
            {/* Shock indicator badge */}
            {p1.isShocked && (
              <span className="absolute -top-11 left-1/2 -translate-x-1/2 text-[10px] font-black bg-[#FFDC00] text-black px-2 py-0.5 rounded-full border border-yellow-200 animate-sparks shadow-xl whitespace-nowrap z-30 flex items-center gap-1">
                <span>⚡</span>
                <span>KESETRUM!</span>
                <span>⚡</span>
              </span>
            )}

            {/* Player 1 Name Label (ALWAYS UPRIGHT, NEVER MIRRORED) */}
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold bg-[#00142e]/92 text-white border border-[#FFDC00] px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
              {p1.name}
            </span>

            {/* Avatar Emoji (Only this mirrors when turning left/right) */}
            <span
              className="text-4xl md:text-5xl inline-block transition-transform duration-100"
              style={{
                // Emojis face left natively in Unicode. When moving right, scaleX(-1) turns them right.
                transform: p1.facingRight ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            >
              {p1.avatar}
            </span>
          </div>

          {/* ═══════════════════════════════════════════════
              PLAYER 2 SWIMMER (Multiplayer)
              ═══════════════════════════════════════════════ */}
          {gameMode === 'multi' && (
            <div
              className={`absolute flex flex-col items-center justify-center pointer-events-none drop-shadow-xl z-20 ${
                p2.isShocked ? 'shocked-avatar-filter animate-shock-shake' : ''
              }`}
              style={{
                left: `${p2.x}px`,
                top: `${p2.y}px`,
                width: `${p2.width}px`,
                height: `${p2.height}px`
              }}
            >
              {p2.isShocked && (
                <span className="absolute -top-11 left-1/2 -translate-x-1/2 text-[10px] font-black bg-[#FFDC00] text-black px-2 py-0.5 rounded-full border border-yellow-200 animate-sparks shadow-xl whitespace-nowrap z-30 flex items-center gap-1">
                  <span>⚡</span>
                  <span>KESETRUM!</span>
                  <span>⚡</span>
                </span>
              )}

              {/* Player 2 Name Label (ALWAYS UPRIGHT) */}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold bg-[#00142e]/92 text-[#39CCCC] border border-[#39CCCC] px-2 py-0.5 rounded-md whitespace-nowrap shadow-md">
                {p2.name}
              </span>

              {/* Avatar Emoji */}
              <span
                className="text-4xl md:text-5xl inline-block transition-transform duration-100"
                style={{
                  transform: p2.facingRight ? 'scaleX(-1)' : 'scaleX(1)'
                }}
              >
                {p2.avatar}
              </span>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          TOUCH & MOBILE FLOATING CONTROLS (D-PAD + TURBO)
          No md:hidden! Visible on mobile phones, tablets, or when enabled!
          ═══════════════════════════════════════════════ */}
      {(isTouchDevice || showVirtualControls) && (
        <>
          {/* Left: 4-Way D-Pad with touch-action: none to prevent page scrolling */}
          <div
            className="fixed bottom-5 left-5 z-40 flex flex-col items-center gap-1.5 select-none"
            style={{ touchAction: 'none' }}
          >
            <button
              type="button"
              onTouchStart={(e) => { e.preventDefault(); handleDpadPress('ArrowUp', true); }}
              onTouchEnd={(e) => { e.preventDefault(); handleDpadPress('ArrowUp', false); }}
              onMouseDown={() => handleDpadPress('ArrowUp', true)}
              onMouseUp={() => handleDpadPress('ArrowUp', false)}
              className="w-14 h-14 rounded-2xl bg-[#001f3f]/95 border-2 border-[#39CCCC] text-white text-2xl font-black active:bg-[#39CCCC] active:text-[#001f3f] flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
              aria-label="Naik"
            >
              ▲
            </button>
            <div className="flex gap-4">
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); handleDpadPress('ArrowLeft', true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleDpadPress('ArrowLeft', false); }}
                onMouseDown={() => handleDpadPress('ArrowLeft', true)}
                onMouseUp={() => handleDpadPress('ArrowLeft', false)}
                className="w-14 h-14 rounded-2xl bg-[#001f3f]/95 border-2 border-[#39CCCC] text-white text-2xl font-black active:bg-[#39CCCC] active:text-[#001f3f] flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
                aria-label="Kiri"
              >
                ◀
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); handleDpadPress('ArrowDown', true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleDpadPress('ArrowDown', false); }}
                onMouseDown={() => handleDpadPress('ArrowDown', true)}
                onMouseUp={() => handleDpadPress('ArrowDown', false)}
                className="w-14 h-14 rounded-2xl bg-[#001f3f]/95 border-2 border-[#39CCCC] text-white text-2xl font-black active:bg-[#39CCCC] active:text-[#001f3f] flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
                aria-label="Turun"
              >
                ▼
              </button>
              <button
                type="button"
                onTouchStart={(e) => { e.preventDefault(); handleDpadPress('ArrowRight', true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleDpadPress('ArrowRight', false); }}
                onMouseDown={() => handleDpadPress('ArrowRight', true)}
                onMouseUp={() => handleDpadPress('ArrowRight', false)}
                className="w-14 h-14 rounded-2xl bg-[#001f3f]/95 border-2 border-[#39CCCC] text-white text-2xl font-black active:bg-[#39CCCC] active:text-[#001f3f] flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-95 transition-transform"
                aria-label="Kanan"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Right: Quick Turbo / Speed-Up Swim Button */}
          <div
            className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-1.5 select-none"
            style={{ touchAction: 'none' }}
          >
            <button
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                p1Ref.current.speed = p1Ref.current.baseSpeed * (p1Ref.current.isShocked ? 0.8 : 1.45);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                p1Ref.current.speed = p1Ref.current.baseSpeed * (p1Ref.current.isShocked ? 0.4 : 1.0);
              }}
              onMouseDown={() => {
                p1Ref.current.speed = p1Ref.current.baseSpeed * (p1Ref.current.isShocked ? 0.8 : 1.45);
              }}
              onMouseUp={() => {
                p1Ref.current.speed = p1Ref.current.baseSpeed * (p1Ref.current.isShocked ? 0.4 : 1.0);
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#0074D9] to-[#39CCCC] border-2 border-white text-white text-xs font-black shadow-2xl flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
              aria-label="Renang Cepat Turbo"
            >
              <span className="text-xl">⚡</span>
              <span className="text-[9px] uppercase tracking-wider font-black">Turbo</span>
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════
          MOBILE ROTATE TO LANDSCAPE & FULLSCREEN MODAL
          ═══════════════════════════════════════════════ */}
      {showRotatePrompt && isPortrait && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-[#041d3e] border-2 border-[#39CCCC] shadow-2xl text-center flex flex-col items-center gap-3.5 sm:gap-4 text-white my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#00244d] border-2 border-[#FFDC00] flex items-center justify-center text-2xl sm:text-3xl animate-bounce">
              🔄
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#FFDC00]">
              Putar Ponsel ke Mode Lanskap
            </h3>
            <p className="text-xs text-[#b8d4f0] leading-relaxed">
              Petualangan bawah laut dirancang dalam orientasi mendatar (Lanskap) agar pemandangan laut lebih luas dan tombol navigasi avatar pas di kedua ibu jari!
            </p>
            <div className="flex flex-col w-full gap-2 mt-1">
              <button
                type="button"
                onClick={requestFullscreenAndLandscape}
                className="w-full py-3 px-4 rounded-xl font-black text-xs md:text-sm bg-gradient-to-r from-[#39CCCC] to-[#0074D9] text-white shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>⛶</span>
                <span>Masuk Mode Lanskap & Layar Penuh</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRotatePrompt(false)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 active:scale-95 transition-all cursor-pointer"
              >
                Tetap Main di Mode Tegak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          CUSTOM IN-GAME EXIT CONFIRMATION MODAL
          ═══════════════════════════════════════════════ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl bg-[#041d3e] border-2 border-[#FFDC00] shadow-2xl text-center flex flex-col gap-3.5 sm:gap-4 my-auto">
            <span className="text-3xl sm:text-4xl">⚓</span>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Yakin Ingin Kembali ke Menu?
            </h3>
            <p className="text-xs md:text-sm text-[#b8d4f0]">
              Progres petualangan pada sesi ini belum selesai. Kamu bisa melanjutkan petualangan kapan saja!
            </p>
            <div className="flex gap-3 justify-center mt-2">
              <button
                onClick={() => {
                  seaAudio.klik();
                  seaAudio.stopBGM();
                  setShowExitConfirm(false);
                  onExitGame();
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Ya, Keluar ke Menu
              </button>
              <button
                onClick={() => {
                  seaAudio.klik();
                  setShowExitConfirm(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs md:text-sm bg-white/10 hover:bg-white/20 border border-white/25 text-white active:scale-95 transition-all cursor-pointer"
              >
                Lanjut Bermain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          ACTIVE QUESTION MODAL (Overlay)
          ═══════════════════════════════════════════════ */}
      {activeQuestion && (
        <QuestionModal
          question={activeQuestion.q}
          bubbleId={activeQuestion.id}
          playerName={p1.name}
          currentLives={lives}
          onAnswerSubmitted={handleAnswerSubmitted}
          onClose={() => setActiveQuestion(null)}
        />
      )}

    </div>
  );
};
