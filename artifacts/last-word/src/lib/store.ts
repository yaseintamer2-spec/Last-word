import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export type User = {
  id: string;
  display_id?: number;
  username: string;
  pfp?: string;
};

export type Scores = {
  highScore: number;
  totalPoints: number;
  gamesPlayed: number;
  roundRecord: number;
  rankScore: number;
  coins: number;
  placementGamesPlayed?: number;
  placementComplete?: boolean;
};

export type Friend = {
  id: string;
  display_id: number;
  username: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
  online?: boolean;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export const RANKS = [
  { name: "Bronze III",  min: 0,     color: "text-orange-700",  icon: "/ranks/bronze_3.png", aura: "rgba(194,120,57,0.3)" },
  { name: "Bronze II",   min: 100,   color: "text-orange-600",  icon: "/ranks/bronze_2.png", aura: "rgba(194,120,57,0.4)" },
  { name: "Bronze I",    min: 200,   color: "text-orange-500",  icon: "/ranks/bronze_1.png", aura: "rgba(194,120,57,0.5)" },
  { name: "Silver III",  min: 300,   color: "text-slate-400",   icon: "/ranks/silver_3.png", aura: "rgba(148,163,184,0.3)" },
  { name: "Silver II",   min: 400,   color: "text-slate-300",   icon: "/ranks/silver_2.png", aura: "rgba(148,163,184,0.4)" },
  { name: "Silver I",    min: 500,   color: "text-slate-200",   icon: "/ranks/silver_1.png", aura: "rgba(148,163,184,0.5)" },
  { name: "Gold III",    min: 600,   color: "text-yellow-600",  icon: "/ranks/gold_3.png", aura: "rgba(234,179,8,0.3)" },
  { name: "Gold II",     min: 700,   color: "text-yellow-500",  icon: "/ranks/gold_2.png", aura: "rgba(234,179,8,0.4)" },
  { name: "Gold I",      min: 800,   color: "text-yellow-400",  icon: "/ranks/gold_1.png", aura: "rgba(234,179,8,0.5)" },
  { name: "Platinum III",min: 900,   color: "text-cyan-600",    icon: "/ranks/platinum_3.png", aura: "rgba(8,145,178,0.4)" },
  { name: "Platinum II", min: 1000,  color: "text-cyan-500",    icon: "/ranks/platinum_2.png", aura: "rgba(6,182,212,0.5)" },
  { name: "Platinum I",  min: 1100,  color: "text-cyan-400",    icon: "/ranks/platinum_1.png", aura: "rgba(34,211,238,0.6)" },
  { name: "Emerald II",  min: 1200,  color: "text-emerald-500", icon: "/ranks/emerald_2.png", aura: "rgba(16,185,129,0.5)" },
  { name: "Emerald I",   min: 1300,  color: "text-emerald-400", icon: "/ranks/emerald_1.png", aura: "rgba(52,211,153,0.7)" },
  { name: "Diamond III", min: 1400,  color: "text-violet-600",  icon: "/ranks/diamond_3.png", aura: "rgba(124,58,237,0.5)" },
  { name: "Diamond II",  min: 1500,  color: "text-violet-500",  icon: "/ranks/diamond_2.png", aura: "rgba(139,92,246,0.6)" },
  { name: "Diamond I",   min: 1600,  color: "text-violet-400",  icon: "/ranks/diamond_1.png", aura: "rgba(167,139,250,0.8)" },
  { name: "Nightmare",   min: 1700,  color: "text-red-500",     icon: "/ranks/nightmare.png", aura: "rgba(239,68,68,0.9)" },
];

export function getRank(score: number) {
  return [...RANKS].reverse().find(r => score >= r.min) || RANKS[0];
}

const DEFAULT_SCORES: Scores = { highScore: 0, totalPoints: 0, gamesPlayed: 0, roundRecord: 0, rankScore: 0, coins: 0 };

export function useStore<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage full — ignore
    }
  }, [key, state]);

  return [state, setState];
}

export function useGameData() {
  const [user, setUserState] = useStore<User | null>('lastword_user', null);
  const [scores, setScores] = useStore<Scores>('lastword_scores', DEFAULT_SCORES);
  const [friends, setFriends] = useStore<Friend[]>('lastword_friends', []);
  const [leaderboard, setLeaderboard] = useStore<LeaderboardEntry[]>('lastword_leaderboard', []);

  // ── Heartbeat: Mark user as online ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const pulse = async () => {
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id);
    };
    pulse();
    const interval = setInterval(pulse, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Real Friends Sync ──────────────────────────────────────────────────────
  const fetchFriends = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id, profiles!friendships_friend_id_fkey(username, display_id, pfp, last_seen), sender:profiles!friendships_user_id_fkey(username, display_id, pfp, last_seen)')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (data && !error) {
      const mapped: Friend[] = data.map((f: any) => {
        const isSender = f.user_id === user.id;
        const other = isSender ? f.profiles : f.sender;
        const lastSeen = other.last_seen ? new Date(other.last_seen).getTime() : 0;
        const isOnline = Date.now() - lastSeen < 65000;
        return {
          id: isSender ? f.friend_id : f.user_id,
          display_id: other.display_id,
          username: other.username,
          status: f.status === 'accepted' ? 'accepted' : (isSender ? 'pending_sent' : 'pending_received'),
          online: isOnline
        };
      });
      setFriends(mapped);
    }
  };

  // ── Realtime Listener for Social Updates ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchFriends();
    const channel = supabase.channel('social-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchFriends())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => fetchFriends())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  const setScoresWithSync = async (val: Scores | ((prev: Scores) => Scores)) => {
    const newScores = typeof val === 'function' ? val(scores) : val;
    setScores(newScores);
    if (user) {
      // Sync to Leaderboard
      await supabase.from('leaderboard').upsert({
        user_id: user.id, username: user.username, high_score: newScores.highScore, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      // Sync to Profile (RP and Coins)
      await supabase.from('profiles').update({
        rank_score: newScores.rankScore,
        coins: newScores.coins,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('leaderboard').select('username, high_score').order('high_score', { ascending: false }).limit(50);
    if (data) setLeaderboard(data.map(e => ({ username: e.username, score: e.high_score })));
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const setUser = async (newUser: User | null) => {
    if (newUser) {
      const { data, error } = await supabase.from('profiles').upsert({
        id: newUser.id, username: newUser.username, pfp: newUser.pfp, updated_at: new Date().toISOString()
      }).select('display_id, rank_score, coins').single();

      if (data && !error) {
        newUser.display_id = data.display_id;
        // Sync cloud score back to local if higher or first run
        setScores(prev => ({
          ...prev,
          rankScore: Math.max(prev.rankScore, data.rank_score || 0),
          coins: Math.max(prev.coins, data.coins || 0)
        }));
      }
    }
    setUserState(newUser);
  };

  return { user, setUser, scores, setScores: setScoresWithSync, friends, setFriends, leaderboard, setLeaderboard, fetchLeaderboard };
}
