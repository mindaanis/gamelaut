import { ZoneThemeConfig } from '../types/game.ts';

export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 2000;

export const COLOR_GRADIENTS: Record<string, string> = {
  blue: 'linear-gradient(135deg, #0074D9, #39CCCC)',
  coral: 'linear-gradient(135deg, #FF851B, #FF4136)',
  gold: 'linear-gradient(135deg, #FFDC00, #ff9800)',
  green: 'linear-gradient(135deg, #2ECC40, #009944)',
  purple: 'linear-gradient(135deg, #B10DC9, #6a008a)'
};

export const AVATAR_EMOJIS = ['🐠', '🐡', '🦈', '🐙', '🐢', '🦀', '🐬', '🐳'];

export const ZONE_CONFIGS: Record<number, ZoneThemeConfig> = {
  1: {
    id: 1,
    name: '🌊 ZONA 1: Terumbu Karang Dangkal',
    subtitle: 'Taman Bawah Laut Tropis Ceria',
    tp: 'TP 1: Membandingkan & Mengurutkan Pecahan (Pembilang 1, Penyebut Sama)',
    bgGradient: 'radial-gradient(circle at 50% 15%, #006eb3 0%, #003e73 50%, #001f3f 100%)',
    ambientLight: 'rgba(127, 219, 255, 0.15)',
    creatures: ['🐠', '🐡', '🪸', '🌿', '🌱', '⭐', '🐚', '🦀', '🐢']
  },
  2: {
    id: 2,
    name: '⚓ ZONA 2: Kapal Karam Misterius',
    subtitle: 'Bangkai Kapal Bajak Laut Spanyol Kuno',
    tp: 'TP 2: Mengenali Pecahan Senilai Menggunakan Gambar & Simbol',
    bgGradient: 'radial-gradient(circle at 50% 25%, #003666 0%, #002244 55%, #000f24 100%)',
    ambientLight: 'rgba(0, 116, 217, 0.12)',
    creatures: ['⚓', '🪵', '🧭', '🪙', '💀', '🗡️', '⛓️', '🐙', '🦈']
  },
  3: {
    id: 3,
    name: '💎 ZONA 3: Palung Mariana / Gua Harta Karun',
    subtitle: 'Kedalaman Samudra Abisal & Kristal Bercahaya',
    tp: 'TP 3: Desimal Persepuluhan/Perseratusan & Persen',
    bgGradient: 'radial-gradient(circle at 50% 30%, #150036 0%, #08001d 65%, #01000a 100%)',
    ambientLight: 'rgba(177, 13, 201, 0.2)',
    creatures: ['💎', '✨', '🔮', '👑', '🏺', '🌟', '🪼', '🦑', '🏮']
  }
};

// 15 coordinates for stationary question bubbles across the full 3000x2000 ocean world
// ORDERED CAREFULLY: The first 5 coordinates (used in single player) immediately span
// shallow, mid-depth, and deep seabed across left, center, and right so bubbles are
// never clustered at the top or in narrow bands!
export const BUBBLE_COORDS = [
  { x: 2350, y: 380 },  // 1: Shallow Right
  { x: 520,  y: 1620 }, // 2: Deep Left Seabed
  { x: 1580, y: 920 },  // 3: Mid-Ocean Center
  { x: 1050, y: 440 },  // 4: Shallow Mid-Left
  { x: 2680, y: 1680 }, // 5: Deep Right Trench
  { x: 420,  y: 980 },  // 6: Mid Left
  { x: 2840, y: 460 },  // 7: Shallow Far-Right
  { x: 1720, y: 1640 }, // 8: Deep Center Seabed
  { x: 2180, y: 1040 }, // 9: Mid Right
  { x: 1680, y: 340 },  // 10: Shallow Center
  { x: 1120, y: 1690 }, // 11: Deep Mid-Left
  { x: 940,  y: 1120 }, // 12: Mid Mid-Left
  { x: 280,  y: 1480 }, // 13: Deep Far-Left
  { x: 2750, y: 940 },  // 14: Mid Far-Right
  { x: 680,  y: 360 }   // 15: Shallow Near-Left
];

// 16 Organically scattered Collectible Pearl locations (Shallow, Mid, Deep)
export const ORGANIC_PEARL_COORDS = [
  { x: 480,  y: 520 },
  { x: 1250, y: 390 },
  { x: 1980, y: 560 },
  { x: 2720, y: 360 },
  { x: 340,  y: 1180 },
  { x: 820,  y: 940 },
  { x: 1390, y: 1260 },
  { x: 1890, y: 820 },
  { x: 2460, y: 1150 },
  { x: 2920, y: 1020 },
  { x: 240,  y: 1780 },
  { x: 780,  y: 1840 },
  { x: 1420, y: 1720 },
  { x: 2050, y: 1850 },
  { x: 2520, y: 1790 },
  { x: 2880, y: 1820 }
];

// 🌊 ZONA 1 DECOR: Organic, non-diagonal placement across seabed, coral shelves, and reef walls
export const ZONA_1_DECOR: Array<{ x: number; y: number; emoji: string; size?: string }> = [
  // Starfish (⭐) resting naturally on seabed and rocks
  { x: 380,  y: 1850, emoji: '⭐' },
  { x: 920,  y: 1780, emoji: '⭐' },
  { x: 1480, y: 1890, emoji: '⭐' },
  { x: 2120, y: 1740, emoji: '⭐' },
  { x: 2780, y: 1870, emoji: '⭐' },
  { x: 1260, y: 840,  emoji: '⭐' },
  { x: 2540, y: 960,  emoji: '⭐' },

  // Shells / Keong (🐚) nestled in sand and coral crevices
  { x: 190,  y: 1890, emoji: '🐚' },
  { x: 640,  y: 1750, emoji: '🐚' },
  { x: 1120, y: 1880, emoji: '🐚' },
  { x: 1740, y: 1810, emoji: '🐚' },
  { x: 2360, y: 1880, emoji: '🐚' },
  { x: 2910, y: 1790, emoji: '🐚' },
  { x: 780,  y: 1180, emoji: '🐚' },
  { x: 1860, y: 1120, emoji: '🐚' },

  // Crabs / Kepiting (🦀) crawling along the seabed floor
  { x: 490,  y: 1910, emoji: '🦀' },
  { x: 1040, y: 1820, emoji: '🦀' },
  { x: 1580, y: 1930, emoji: '🦀' },
  { x: 2240, y: 1920, emoji: '🦀' },
  { x: 2680, y: 1840, emoji: '🦀' },
  { x: 1340, y: 1480, emoji: '🦀' },

  // Corals (🪸) in organic reefs and shelves
  { x: 280,  y: 1520, emoji: '🪸' },
  { x: 560,  y: 890,  emoji: '🪸' },
  { x: 860,  y: 1620, emoji: '🪸' },
  { x: 1310, y: 1240, emoji: '🪸' },
  { x: 1810, y: 1460, emoji: '🪸' },
  { x: 2020, y: 880,  emoji: '🪸' },
  { x: 2450, y: 1410, emoji: '🪸' },
  { x: 2830, y: 1540, emoji: '🪸' },
  { x: 1650, y: 640,  emoji: '🪸' },

  // Sea plants (🌿, 🌱) and gentle turtles (🐢)
  { x: 420,  y: 720,  emoji: '🌿' },
  { x: 1180, y: 680,  emoji: '🌱' },
  { x: 2260, y: 760,  emoji: '🌿' },
  { x: 2690, y: 690,  emoji: '🌱' },
  { x: 740,  y: 1420, emoji: '🌿' },
  { x: 1940, y: 1520, emoji: '🌱' },
  { x: 1420, y: 460,  emoji: '🐢' },
  { x: 2380, y: 1280, emoji: '🐢' }
];

// ⚓ ZONA 2 DECOR: Sunken pirate galleon wreckage, treasure coins, anchors, chains
export const ZONA_2_DECOR: Array<{ x: number; y: number; emoji: string }> = [
  // Anchor points and chains
  { x: 380,  y: 1720, emoji: '⚓' },
  { x: 1150, y: 1840, emoji: '⚓' },
  { x: 1980, y: 1680, emoji: '⚓' },
  { x: 2740, y: 1790, emoji: '⚓' },
  { x: 720,  y: 920,  emoji: '⛓️' },
  { x: 1620, y: 1140, emoji: '⛓️' },
  { x: 2480, y: 1020, emoji: '⛓️' },

  // Shipwreck drift wood and hulls
  { x: 460,  y: 1450, emoji: '🪵' },
  { x: 890,  y: 1620, emoji: '🪵' },
  { x: 1380, y: 1510, emoji: '🪵' },
  { x: 1860, y: 1790, emoji: '🪵' },
  { x: 2320, y: 1560, emoji: '🪵' },
  { x: 2880, y: 1640, emoji: '🪵' },

  // Gold coins and lost navigation compasses
  { x: 280,  y: 1860, emoji: '🪙' },
  { x: 620,  y: 1880, emoji: '🪙' },
  { x: 1080, y: 1910, emoji: '🪙' },
  { x: 1520, y: 1860, emoji: '🪙' },
  { x: 2150, y: 1890, emoji: '🪙' },
  { x: 2620, y: 1880, emoji: '🪙' },
  { x: 840,  y: 1240, emoji: '🧭' },
  { x: 2260, y: 1180, emoji: '🧭' },

  // Pirate skull & relics
  { x: 540,  y: 1680, emoji: '💀' },
  { x: 1760, y: 1820, emoji: '💀' },
  { x: 2440, y: 1730, emoji: '💀' },
  { x: 980,  y: 1390, emoji: '🗡️' },
  { x: 1880, y: 1340, emoji: '🗡️' },

  // Denizen of the depths: Octopus and stealth shark
  { x: 1450, y: 920,  emoji: '🐙' },
  { x: 2690, y: 840,  emoji: '🦈' }
];

// 💎 ZONA 3 DECOR: Luminescent gems, ancient treasures, abyssal wonders
export const ZONA_3_DECOR: Array<{ x: number; y: number; emoji: string }> = [
  // Radiant glowing crystals
  { x: 320,  y: 1680, emoji: '💎' },
  { x: 740,  y: 1840, emoji: '💎' },
  { x: 1240, y: 1720, emoji: '💎' },
  { x: 1680, y: 1880, emoji: '💎' },
  { x: 2180, y: 1760, emoji: '💎' },
  { x: 2640, y: 1850, emoji: '💎' },
  { x: 2920, y: 1690, emoji: '💎' },
  { x: 580,  y: 1120, emoji: '💎' },
  { x: 1480, y: 1240, emoji: '💎' },
  { x: 2380, y: 1160, emoji: '💎' },

  // Luminescent stars & sparkles
  { x: 460,  y: 780,  emoji: '✨' },
  { x: 980,  y: 890,  emoji: '✨' },
  { x: 1820, y: 740,  emoji: '✨' },
  { x: 2720, y: 860,  emoji: '✨' },
  { x: 1380, y: 520,  emoji: '🌟' },
  { x: 2260, y: 620,  emoji: '🌟' },

  // Mystic orbs, crown treasures, and ancient urns
  { x: 420,  y: 1890, emoji: '👑' },
  { x: 1540, y: 1820, emoji: '👑' },
  { x: 2520, y: 1890, emoji: '👑' },
  { x: 860,  y: 1740, emoji: '🏺' },
  { x: 1940, y: 1810, emoji: '🏺' },
  { x: 1120, y: 1380, emoji: '🔮' },
  { x: 2060, y: 1420, emoji: '🔮' },

  // Abyssal deep-sea lantern angler & squids
  { x: 680,  y: 1460, emoji: '🏮' },
  { x: 2460, y: 1520, emoji: '🏮' },
  { x: 1620, y: 980,  emoji: '🦑' }
];

// Organic distribution for ambient floating ocean bubbles
export const ORGANIC_WORLD_BUBBLES: Array<{ x: number; y: number; size: number; delay: number; duration: number }> = [
  { x: 140,  y: 420,  size: 18, delay: 0.2, duration: 8.5 },
  { x: 380,  y: 920,  size: 24, delay: 1.5, duration: 7.2 },
  { x: 580,  y: 1560, size: 16, delay: 0.8, duration: 9.1 },
  { x: 820,  y: 640,  size: 22, delay: 2.1, duration: 8.0 },
  { x: 1040, y: 1280, size: 28, delay: 0.5, duration: 7.6 },
  { x: 1260, y: 1740, size: 14, delay: 1.9, duration: 9.4 },
  { x: 1480, y: 460,  size: 20, delay: 0.1, duration: 8.2 },
  { x: 1690, y: 1080, size: 26, delay: 2.4, duration: 7.8 },
  { x: 1910, y: 1620, size: 16, delay: 1.2, duration: 8.8 },
  { x: 2140, y: 720,  size: 24, delay: 0.7, duration: 8.1 },
  { x: 2360, y: 1340, size: 18, delay: 1.8, duration: 7.5 },
  { x: 2580, y: 540,  size: 22, delay: 2.6, duration: 8.9 },
  { x: 2790, y: 1180, size: 15, delay: 0.4, duration: 9.2 },
  { x: 2940, y: 1690, size: 25, delay: 1.6, duration: 7.4 },
  { x: 280,  y: 1820, size: 20, delay: 2.2, duration: 8.4 },
  { x: 740,  y: 1910, size: 26, delay: 0.9, duration: 7.9 },
  { x: 1180, y: 840,  size: 17, delay: 1.4, duration: 9.0 },
  { x: 1820, y: 1880, size: 22, delay: 2.0, duration: 8.3 },
  { x: 2480, y: 1850, size: 19, delay: 0.3, duration: 8.7 },
  { x: 1580, y: 1420, size: 23, delay: 1.7, duration: 7.7 }
];

export const AUTHOR_NAME = 'Minda Ristianisa, S. Pd. - SDN 2 Jatiroto - PGRI Cabang Jatiroto, Wonogiri';
