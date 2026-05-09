import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export type User = {
  id: string;
  username: string;
  pfp?: string; // base64 data URL
};

export type Scores = {
  highScore: number;
  totalPoints: number;
  gamesPlayed: number;
  roundRecord: number;
};

export type Friend = {
  id: string;
  username: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
  online?: boolean;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};

const DEFAULT_SCORES: Scores = { highScore: 0, totalPoints: 0, gamesPlayed: 0, roundRecord: 0 };

const SEED_FRIENDS: Friend[] = [
  { id: crypto.randomUUID(), username: 'NeonNinja', status: 'accepted' },
  { id: crypto.randomUUID(), username: 'CyberPunk99', status: 'accepted' },
  { id: crypto.randomUUID(), username: 'WordMaster', status: 'pending_received' },
];

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { username: 'TypeGod', score: 45000 },
  { username: 'NeonNinja', score: 38200 },
  { username: 'SpeedDemon', score: 31050 },
  { username: 'CyberPunk99', score: 28900 },
  { username: 'GhostWord', score: 24500 },
  { username: 'ZeroDay', score: 19800 },
  { username: 'Mute', score: 15400 },
];

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
      .select('id, status, user_id, friend_id, profiles!friendships_friend_id_fkey(username, pfp, last_seen), sender:profiles!friendships_user_id_fkey(username, pfp, last_seen)')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (data && !error) {
      const mapped: Friend[] = data.map((f: any) => {
        const isSender = f.user_id === user.id;
        const other = isSender ? f.profiles : f.sender;
        const lastSeen = other.last_seen ? new Date(other.last_seen).getTime() : 0;
        const isOnline = Date.now() - lastSeen < 65000;
        return {
          id: isSender ? f.friend_id : f.user_id,
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
      await supabase.from('leaderboard').upsert({
        user_id: user.id, username: user.username, high_score: newScores.highScore, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    }
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('leaderboard').select('username, high_score').order('high_score', { ascending: false }).limit(50);
    if (data) setLeaderboard(data.map(e => ({ username: e.username, score: e.high_score })));
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const setUser = async (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      await supabase.from('profiles').upsert({
        id: newUser.id, username: newUser.username, pfp: newUser.pfp, updated_at: new Date().toISOString()
      });
    }
  };

  return { user, setUser, scores, setScores: setScoresWithSync, friends, setFriends, leaderboard, setLeaderboard, fetchLeaderboard };
}
