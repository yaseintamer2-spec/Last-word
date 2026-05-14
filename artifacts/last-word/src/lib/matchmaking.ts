// ── Real Matchmaking via Supabase ─────────────────────────────────────────────
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type LobbyPlayer = {
  user_id:   string;
  username:  string;
  badge:     string; // "Guest", etc.
  ping?:     number;
  isYou?:    boolean;
  isFriend?: boolean;
};

export type MatchmakingHandle = { cancel: () => void };

export async function estimatePing(): Promise<number> {
  const t = Date.now();
  await supabase.from('mm_pool').select('id').limit(1);
  return Math.min(999, Date.now() - t);
}

// ── Global matchmaking ────────────────────────────────────────────────────────
export function startMatchmaking(opts: {
  userId: string; username: string; badge: string;
  mode: string; roundCount: number; totalPlayers: number;
  onUpdate: (players: LobbyPlayer[]) => void;
  onReady:  (matchId: string, players: LobbyPlayer[]) => void;
  onError:  (msg: string) => void;
}): MatchmakingHandle {
  const { userId, username, badge, mode, roundCount, totalPlayers, onUpdate, onReady, onError } = opts;
  let cancelled = false;
  let poolChannel: RealtimeChannel | null = null;
  let waitChannel: RealtimeChannel | null = null;
  const me: LobbyPlayer = { user_id: userId, username, badge, isYou: true };

  async function checkPool() {
    if (cancelled) return;
    const { data } = await supabase
      .from('mm_pool').select('user_id,username,badge')
      .eq('mode', mode).eq('round_count', roundCount)
      .eq('status', 'searching').eq('is_private', false)
      .order('created_at', { ascending: true }).limit(totalPlayers);
    if (!data) return;

    const list: LobbyPlayer[] = data.map((p) => ({
      user_id: p.user_id, username: p.username,
      badge: p.badge || "Guest", isYou: p.user_id === userId,
    }));
    if (!list.find((p) => p.user_id === userId)) list.unshift(me);
    onUpdate(list);

    if (list.length >= totalPlayers && list[0].user_id === userId) {
      await createMatch(list);
    }
  }

  async function createMatch(players: LobbyPlayer[]) {
    if (cancelled) return;
    const ids = players.map((p) => p.user_id);

    // Attempt to lock players
    const { error: updateErr } = await supabase.from('mm_pool')
      .update({ status: 'matched' })
      .in('user_id', ids)
      .eq('status', 'searching');

    if (updateErr) return; // Someone else probably matched them first

    const { data: m, error: matchErr } = await supabase.from('matches')
      .insert({ mode, round_count: roundCount, status: 'active' })
      .select('id').single();

    if (matchErr || !m) { onError(matchErr?.message || 'Failed to create match.'); return; }

    await supabase.from('match_players').insert(
      players.map((p, slot) => ({
        match_id: m.id, user_id: p.user_id, username: p.username,
        badge: p.badge, score: 0, slot, is_ready: true,
      }))
    );

    await supabase.from('mm_pool').delete().in('user_id', ids);
    if (!cancelled) onReady(m.id, players);
  }

  async function run() {
    await supabase.from('mm_pool').delete().eq('user_id', userId);
    const { error } = await supabase.from('mm_pool').insert({
      user_id: userId, username, badge,
      mode, round_count: roundCount, status: 'searching', is_private: false,
    });
    if (error) { onError(error.message || 'Could not join matchmaking.'); return; }
    onUpdate([me]);

    poolChannel = supabase.channel(`mm_${mode}_${roundCount}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mm_pool',
        filter: `mode=eq.${mode}` }, () => checkPool())
      .subscribe();

    waitChannel = supabase.channel(`wait_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players',
        filter: `user_id=eq.${userId}` }, async (payload) => {
          if (cancelled) return;
          const matchId = payload.new.match_id as string;
          const { data } = await supabase.from('match_players')
            .select('user_id,username,badge,slot').eq('match_id', matchId).order('slot');
          if (!data) return;
          const list: LobbyPlayer[] = data.map((p) => ({
            user_id: p.user_id, username: p.username,
            badge: p.badge || "Guest", isYou: p.user_id === userId,
          }));
          onReady(matchId, list);
      }).subscribe();

    await checkPool();
  }

  run().catch((e) => onError(String(e)));

  return {
    cancel: async () => {
      cancelled = true;
      poolChannel?.unsubscribe();
      waitChannel?.unsubscribe();
      await supabase.from('mm_pool').delete().eq('user_id', userId);
    },
  };
}

// ── Private party ─────────────────────────────────────────────────────────────
export function joinPrivateParty(opts: {
  userId: string; username: string; badge: string;
  mode: string; roundCount: number; totalPlayers: number; partyCode: string;
  onUpdate: (players: LobbyPlayer[]) => void;
  onReady:  (matchId: string, players: LobbyPlayer[]) => void;
  onError:  (msg: string) => void;
}): MatchmakingHandle {
  const { userId, username, badge, mode, roundCount, totalPlayers, partyCode, onUpdate, onReady, onError } = opts;
  let cancelled = false;
  let channel: RealtimeChannel | null = null;
  const me: LobbyPlayer = { user_id: userId, username, badge, isYou: true };

  async function checkPool() {
    if (cancelled) return;
    const { data } = await supabase.from('mm_pool').select('user_id,username,badge')
      .eq('party_code', partyCode).eq('status', 'searching')
      .order('created_at', { ascending: true });
    if (!data) return;
    const list: LobbyPlayer[] = data.map((p) => ({
      user_id: p.user_id, username: p.username,
      badge: p.badge || "Guest", isYou: p.user_id === userId,
    }));
    if (!list.find((p) => p.user_id === userId)) list.unshift(me);
    onUpdate(list);
    if (list.length >= totalPlayers && list[0].user_id === userId) {
      await createMatch(list);
    }
  }

  async function createMatch(players: LobbyPlayer[]) {
    if (cancelled) return;
    const ids = players.map((p) => p.user_id);
    await supabase.from('mm_pool').update({ status: 'matched' }).in('user_id', ids);
    const { data: m, error: matchErr } = await supabase.from('matches')
      .insert({ mode, round_count: roundCount, status: 'active', party_code: partyCode })
      .select('id').single();
    if (matchErr || !m) { onError(matchErr?.message || 'Failed to create match.'); return; }
    await supabase.from('match_players').insert(
      players.map((p, slot) => ({
        match_id: m.id, user_id: p.user_id, username: p.username,
        badge: p.badge, score: 0, slot, is_ready: true,
      }))
    );
    await supabase.from('mm_pool').delete().in('user_id', ids);
    if (!cancelled) onReady(m.id, players);
  }

  async function run() {
    await supabase.from('mm_pool').delete().eq('user_id', userId);
    const { error } = await supabase.from('mm_pool').insert({
      user_id: userId, username, badge,
      mode, round_count: roundCount, status: 'searching',
      is_private: true, party_code: partyCode,
    });
    if (error) { onError(error.message || 'Could not join private party.'); return; }
    onUpdate([me]);

    channel = supabase.channel(`party_${partyCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mm_pool',
        filter: `party_code=eq.${partyCode}` }, () => checkPool())
      .subscribe();

    const waitChannel = supabase.channel(`wait_party_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_players',
        filter: `user_id=eq.${userId}` }, async (payload) => {
          if (cancelled) return;
          const matchId = payload.new.match_id as string;
          const { data } = await supabase.from('match_players')
            .select('user_id,username,badge,slot').eq('match_id', matchId).order('slot');
          if (!data) return;
          const list: LobbyPlayer[] = data.map((p) => ({
            user_id: p.user_id, username: p.username,
            badge: p.badge || "Guest", isYou: p.user_id === userId,
          }));
          onReady(matchId, list);
      }).subscribe();

    await checkPool();
    return () => { waitChannel.unsubscribe(); };
  }

  run().catch((e) => onError(String(e)));
  return {
    cancel: async () => {
      cancelled = true;
      channel?.unsubscribe();
      await supabase.from('mm_pool').delete().eq('user_id', userId);
    },
  };
}
