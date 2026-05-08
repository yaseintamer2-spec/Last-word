// ── Daily Challenge System ────────────────────────────────────────────────────
// One unique word per day, seeded by date so everyone gets the same word.
// Streak tracking and simulated global leaderboard.

export type DailyState = {
  date: string;            // "YYYY-MM-DD"
  completed: boolean;
  score: number;
  revealed: number;        // how many letters were shown
  wordLength: number;
  streak: number;
  lastCompletedDate: string;
};

const KEY = "lastword_daily";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// Simple numeric hash of a string
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// The full word pool (copied from game.tsx hard + insane tier words, deduped)
const DAILY_POOL = [
  "ABANDON","ANCIENT","ANXIETY","ARSENAL","BALLOON","BENEATH","BLIZZARD","CAPTAIN","CHAPTER",
  "CIRCUIT","CLARITY","COMMAND","COURAGE","CRYSTAL","CURIOUS","DESTINY","DIAMOND","DOLPHIN",
  "DYNAMIC","ECLIPSE","ELEGANT","EMERALD","ETERNAL","EXPLORE","EXTREME","FASHION","FREEDOM",
  "GATEWAY","GLACIER","GORILLA","HARVEST","HISTORY","HORIZON","JUSTICE","KINGDOM","KITCHEN",
  "LANTERN","LIBRARY","MIRACLE","MORNING","MYSTERY","NARWHAL","OCTOPUS","PACKAGE","PENGUIN",
  "PHANTOM","PILGRIM","PIONEER","PRECISE","PYRAMID","QUANTUM","SCARLET","SCIENCE","SILENCE",
  "SOLDIER","SPECIES","SURVIVE","TACTICS","TEACHER","THUNDER","TORNADO","TRAGEDY","TRIUMPH",
  "UNICORN","VILLAIN","WARRIOR","WESTERN","ABSOLUTE","ALPHABET","AMBITION","ANCESTOR","BACTERIA",
  "CALENDAR","CHAMPION","CHEMICAL","DARKNESS","DOCUMENT","DOMINATE","DRAMATIC","ENORMOUS",
  "ERUPTION","GENERATE","GENEROUS","GRATEFUL","HARDWARE","HOSPITAL","HUMANITY","IDENTITY",
  "INNOCENT","INSTINCT","JEALOUSY","KEYBOARD","KINDNESS","LANGUAGE","LANDMARK","CATALYST",
  "EVALUATE","FREQUENT","DAYBREAK","OVERCOME","APPROACH","BLIZZARD","COLLAPSE","CRIMINAL",
  "DESCRIBE","DISASTER","ENTRANCE","GALACTIC","IGNITION","JUNCTION","LEVERAGE","MAGNETIC",
  "MANIFEST","OFFSHORE","OUTBREAK","PATIENCE","QUADRANT",
];

export type DailyWord = {
  word: string;
  hint: string;
};

const DAILY_HINTS: Record<string, string> = {
  ABANDON: "Leave without looking back",
  ANCIENT: "Thousands of years old",
  ANXIETY: "Worry that won't switch off",
  ARSENAL: "Stockpile of weapons",
  BALLOON: "Rises with hot air or helium",
  BENEATH: "Directly below",
  BLIZZARD: "White-out conditions",
  CAPTAIN: "Wears a badge of command",
  CHAPTER: "Numbers mark divisions",
  CIRCUIT: "Goes in a complete loop",
  CLARITY: "Crystal clear understanding",
  COMMAND: "An order that must be obeyed",
  COURAGE: "Bravery when fear is real",
  CRYSTAL: "Perfectly formed structure",
  CURIOUS: "Always asking why",
  DESTINY: "Written in the stars",
  DIAMOND: "Forever",
  DOLPHIN: "Smarter than most humans suspect",
  DYNAMIC: "Always changing and energetic",
  ECLIPSE: "Sun blocked by the moon",
  ELEGANT: "Graceful and refined",
  EMERALD: "Deep green precious stone",
  ETERNAL: "Never begins, never ends",
  EXPLORE: "Go where few have gone",
  EXTREME: "Way beyond the normal limit",
  FASHION: "Trends that keep changing",
  FREEDOM: "Can't be bought or sold",
  GATEWAY: "The first step through",
  GLACIER: "Moves an inch per year",
  GORILLA: "Knuckle-walker of the rainforest",
  HARVEST: "End of the growing season",
  HISTORY: "Written by the winners",
  HORIZON: "Always the same distance away",
  JUSTICE: "Blindfolded with scales",
  KINGDOM: "Has a throne room",
  KITCHEN: "Smells of spice",
  LANTERN: "Before electricity existed",
  LIBRARY: "Shhh...",
  MIRACLE: "Against impossible odds",
  MORNING: "Coffee and silence",
  MYSTERY: "Clues lead you there",
  NARWHAL: "Unicorn of the sea",
  OCTOPUS: "Eight arms, three hearts",
  PACKAGE: "Knock knock, it arrived",
  PENGUIN: "Wears a tuxedo by default",
  PHANTOM: "Seen by few",
  PILGRIM: "Makes a sacred journey",
  PIONEER: "First to venture somewhere new",
  PRECISE: "Exactly right, no error",
  PYRAMID: "Ancient triangular tomb",
  QUANTUM: "Subatomic physics level",
  SCARLET: "Vivid bright red",
  SCIENCE: "Experiments, data, conclusions",
  SILENCE: "Absence of all sound",
  SOLDIER: "Trained for combat",
  SPECIES: "A distinct type of living thing",
  SURVIVE: "Make it through against the odds",
  TACTICS: "Planned moves to win",
  TEACHER: "Shapes the next generation",
  THUNDER: "Follows the lightning",
  TORNADO: "Spinning column of destruction",
  TRAGEDY: "A story ending in loss",
  TRIUMPH: "Total and complete victory",
  UNICORN: "Single-horned mythical horse",
  VILLAIN: "The one you root against",
  WARRIOR: "Trained and ready for battle",
  WESTERN: "Cowboys, deserts, saloons",
  ABSOLUTE: "Zero doubt, zero exceptions",
  ALPHABET: "26 in English",
  AMBITION: "Drives people to the top",
  ANCESTOR: "Your roots, centuries back",
  BACTERIA: "Single-celled and everywhere",
  CALENDAR: "12 months, 365 days",
  CHAMPION: "The last one standing",
  CHEMICAL: "Bonds and reactions",
  DARKNESS: "Fear's birthplace",
  DOCUMENT: "Sign here please",
  DOMINATE: "Take full control",
  DRAMATIC: "Everything becomes a scene",
  ENORMOUS: "Impossible to miss",
  ERUPTION: "Earth releasing pressure",
  GENERATE: "Create from nothing",
  GENEROUS: "Always the first to give",
  GRATEFUL: "Counts every blessing",
  HARDWARE: "You can physically touch it",
  HOSPITAL: "Nurses and doctors",
  HUMANITY: "Eight billion and counting",
  IDENTITY: "Who are you, really",
  INNOCENT: "No fingerprints, no case",
  INSTINCT: "No thinking required",
  JEALOUSY: "The green-eyed monster",
  KEYBOARD: "Click clack under your fingers",
  KINDNESS: "Always free to give",
  LANGUAGE: "Millions of words and counting",
  LANDMARK: "Hard to miss, easy to find",
  CATALYST: "Sparks a reaction",
  EVALUATE: "Give it a score",
  FREQUENT: "Happens again and again",
  DAYBREAK: "First hint of light",
  OVERCOME: "Conquer the obstacle",
  APPROACH: "Getting closer now",
  COLLAPSE: "Crumbles under pressure",
  CRIMINAL: "Broke the law",
  DESCRIBE: "Paint a picture with words",
  DISASTER: "Nothing went right",
  ENTRANCE: "Where you walk in",
  GALACTIC: "On a cosmic scale",
  IGNITION: "Sparks the engine",
  JUNCTION: "Where two roads meet",
  LEVERAGE: "Use a fulcrum",
  MAGNETIC: "North always points here",
  MANIFEST: "Make it a reality",
  OFFSHORE: "Beyond the coastline",
  OUTBREAK: "Sudden spread of disease",
  PATIENCE: "Worth waiting for",
  QUADRANT: "One of four equal sections",
};

export function getDailyWord(): DailyWord {
  const today = todayStr();
  const idx   = hashStr(today) % DAILY_POOL.length;
  const word  = DAILY_POOL[idx];
  return { word, hint: DAILY_HINTS[word] ?? "Today's challenge" };
}

export function getDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveDailyResult(score: number, revealed: number, wordLength: number): DailyState {
  const today = todayStr();
  const prev  = getDailyState();

  let streak = 1;
  if (prev?.lastCompletedDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (prev.lastCompletedDate === yesterday.toISOString().split("T")[0]) {
      streak = (prev.streak ?? 0) + 1;
    }
  }

  const state: DailyState = {
    date: today,
    completed: true,
    score,
    revealed,
    wordLength,
    streak,
    lastCompletedDate: today,
  };

  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  return state;
}

export function isTodayCompleted(): boolean {
  const state = getDailyState();
  return state?.date === todayStr() && state.completed;
}

// Simulated global leaderboard seeded by today's date
export function getDailyLeaderboard(myName: string, myScore: number) {
  const seed  = hashStr(todayStr());
  const names = ["TypeGod","NeonNinja","SpeedDemon","CyberPunk","GhostWord","ZeroDay","Kryptic","Phantom","Eclipse","Nova"];
  const entries = names.map((name, i) => ({
    rank: 0,
    name,
    score: Math.max(100, 9800 - (seed % 400) - i * 720 + ((seed >> i) % 300)),
  }));

  // Insert player
  entries.push({ rank: 0, name: myName, score: myScore });
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries.slice(0, 10);
}
