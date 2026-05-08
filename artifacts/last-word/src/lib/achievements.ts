// ── Achievements System ───────────────────────────────────────────────────────

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  unlockedAt?: number; // timestamp
};

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_blood",   title: "First Word",      desc: "Complete your first round",                icon: "🎯" },
  { id: "psychic",       title: "Psychic",          desc: "Stop at the very first letter",            icon: "🔮" },
  { id: "speed_5",       title: "Speed Demon",      desc: "Reach round 5",                            icon: "⚡" },
  { id: "speed_15",      title: "Veteran",          desc: "Reach round 15",                           icon: "🏅" },
  { id: "speed_30",      title: "Elite",            desc: "Reach round 30 (HARD tier)",               icon: "💎" },
  { id: "insane_entry",  title: "Into the INSANE",  desc: "Reach round 31",                           icon: "🔥" },
  { id: "score_5k",      title: "High Scorer",      desc: "Score over 5,000 in one game",             icon: "🌟" },
  { id: "score_20k",     title: "Legend",           desc: "Score over 20,000 in one game",            icon: "👑" },
  { id: "no_lives_lost", title: "Flawless",         desc: "Complete 10 rounds without losing a life", icon: "✨" },
  { id: "comeback",      title: "Comeback Kid",     desc: "Use the revive and win the next round",    icon: "💪" },
  { id: "shared",        title: "Show Off",         desc: "Share your score",                         icon: "📱" },
  { id: "daily_1",       title: "Daily Player",     desc: "Complete your first daily challenge",      icon: "📅" },
  { id: "daily_7",       title: "Week Warrior",     desc: "Complete 7 daily challenges",              icon: "🗓️" },
  { id: "multiplayer_w", title: "Champion",         desc: "Win a multiplayer match",                  icon: "🏆" },
  { id: "games_10",      title: "Dedicated",        desc: "Play 10 games",                            icon: "🎮" },
];

const KEY = "lastword_achievements";

export function getUnlocked(): Achievement[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const ids: Record<string, number> = JSON.parse(raw);
    return ALL_ACHIEVEMENTS
      .filter((a) => ids[a.id])
      .map((a) => ({ ...a, unlockedAt: ids[a.id] }));
  } catch { return []; }
}

export function isUnlocked(id: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return !!JSON.parse(raw)[id];
  } catch { return false; }
}

// Returns the achievement if newly unlocked, null if already had it
export function tryUnlock(id: string): Achievement | null {
  if (isUnlocked(id)) return null;
  try {
    const raw  = localStorage.getItem(KEY);
    const ids  = raw ? JSON.parse(raw) : {};
    ids[id]    = Date.now();
    localStorage.setItem(KEY, JSON.stringify(ids));
    return ALL_ACHIEVEMENTS.find((a) => a.id === id) ?? null;
  } catch { return null; }
}
