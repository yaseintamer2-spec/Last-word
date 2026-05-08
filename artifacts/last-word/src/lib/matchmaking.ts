// ── Matchmaking Service ───────────────────────────────────────────────────────
// Simulates real online matchmaking with:
//   - Progressive player discovery (not all at once)
//   - Regional ping values
//   - Realistic names pulled from a large pool
//   - Country flags for diversity
//   - Difficulty-based "skill rating" matching
//   - Cancellable search

export type MatchPlayer = {
  id: string;
  name: string;
  flag: string;
  ping: number;
  rating: number;
  isYou?: boolean;
  isFriend?: boolean;
};

const PLAYER_NAMES = [
  "NeonNinja",    "TypeGod",      "SpeedDemon",   "GhostWord",
  "ZeroDay",      "CyberPunk",    "Blinkfire",     "Axiom",
  "PixelProwl",   "SwiftStrike",  "DarkHex",       "VectorX",
  "Kryptic",      "Byte",         "Jinx",          "Ravel",
  "Quasar",       "Nitro",        "Phantom",       "Cascade",
  "Ember",        "Vortex",       "Fluxion",       "Nyx",
  "Strafe",       "Cipher",       "Eclipse",       "Rift",
  "Sable",        "Zenith",       "Surge",         "Pulse",
  "Wraith",       "Static",       "Blaze",         "Drift",
  "Nova",         "Fractal",      "Glitch",        "Nexus",
  "Rogue",        "Haze",         "Omega",         "Mirage",
  "Volt",         "Specter",      "Flux",          "Arc",
  "Radiant",      "Prism",        "Comet",         "Echo",
];

const FLAGS = ["🇺🇸","🇬🇧","🇩🇪","🇫🇷","🇯🇵","🇧🇷","🇰🇷","🇦🇺","🇨🇦","🇮🇳","🇳🇱","🇸🇦","🇦🇪","🇹🇷","🇮🇹","🇪🇸","🇷🇺","🇵🇱","🇸🇪","🇳🇴"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeFakePlayer(usedNames: Set<string>): MatchPlayer {
  let name = randomFrom(PLAYER_NAMES);
  let tries = 0;
  while (usedNames.has(name) && tries++ < 20) name = randomFrom(PLAYER_NAMES);
  usedNames.add(name);

  return {
    id:     crypto.randomUUID(),
    name,
    flag:   randomFrom(FLAGS),
    ping:   10 + Math.floor(Math.random() * 140),
    rating: 800 + Math.floor(Math.random() * 1200),
  };
}

export type MatchmakingStatus = "searching" | "found" | "cancelled";

export type MatchmakingHandle = {
  cancel: () => void;
};

// Simulates finding players one by one with realistic timing
export function startMatchmaking(
  totalPlayers: number,          // how many players needed (2, 3, or 4)
  youName: string,               // your username
  youId: string,
  onUpdate: (players: MatchPlayer[]) => void,
  onReady: (players: MatchPlayer[]) => void,
): MatchmakingHandle {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const you: MatchPlayer = {
    id: youId,
    name: youName,
    flag: "🏆",
    ping: 5,
    rating: 1000,
    isYou: true,
  };

  const usedNames = new Set<string>([youName]);
  const players: MatchPlayer[] = [you];
  onUpdate([...players]);

  const slotsNeeded = totalPlayers - 1;
  let filled = 0;

  function fillNextSlot() {
    if (cancelled) return;

    const delay = 600 + Math.random() * 2200;
    const t = setTimeout(() => {
      if (cancelled) return;

      const newPlayer = makeFakePlayer(usedNames);
      players.push(newPlayer);
      filled++;
      onUpdate([...players]);

      if (filled < slotsNeeded) {
        fillNextSlot();
      } else {
        // All filled — brief "match found" moment then ready
        setTimeout(() => {
          if (!cancelled) onReady([...players]);
        }, 600);
      }
    }, delay);

    timers.push(t);
  }

  fillNextSlot();

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    },
  };
}
