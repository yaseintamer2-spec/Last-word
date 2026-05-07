import { useState, useEffect } from 'react';

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
  const [user, setUser] = useStore<User | null>('lastword_user', null);
  const [scores, setScores] = useStore<Scores>('lastword_scores', DEFAULT_SCORES);

  const [friends, setFriends] = useStore<Friend[]>('lastword_friends', []);
  useEffect(() => {
    if (friends.length === 0) setFriends(SEED_FRIENDS);
  }, []);

  const [leaderboard, setLeaderboard] = useStore<LeaderboardEntry[]>('lastword_leaderboard', []);
  useEffect(() => {
    if (leaderboard.length === 0) setLeaderboard(SEED_LEADERBOARD);
  }, []);

  return { user, setUser, scores, setScores, friends, setFriends, leaderboard, setLeaderboard };
}
