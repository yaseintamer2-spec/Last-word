import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Lock, Globe, UserPlus, Check, Wifi, Copy, CheckCheck, AlertCircle, User } from "lucide-react";
import { useGameData, Friend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { startMatchmaking, joinPrivateParty, LobbyPlayer, MatchmakingHandle, estimatePing } from "@/lib/matchmaking";
import { SFX } from "@/lib/sounds";

import { supabase } from "@/lib/supabase";

type Mode = "1v1" | "1v1v1" | "1v1v1v1";
type LobbyView = "select" | "party";

const MODES = [
  { id: "1v1"     as Mode, name: "DUEL",  tag: "1 vs 1",    desc: "Head-to-head — winner takes all",      players: 2, image: "/mode-duel.png",  gradient: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(6,182,212,0.06))",  glow: "rgba(34,211,238,0.25)", accent: "#22d3ee" },
  { id: "1v1v1"   as Mode, name: "TRIO",  tag: "3 players", desc: "Three-way battle royale",              players: 3, image: "/mode-trio.png",  gradient: "linear-gradient(135deg,rgba(139,92,246,0.18),rgba(109,40,217,0.06))", glow: "rgba(139,92,246,0.25)", accent: "#a78bfa" },
  { id: "1v1v1v1" as Mode, name: "CHAOS", tag: "4 players", desc: "Four-way free for all — pure mayhem", players: 4, image: "/mode-chaos.png", gradient: "linear-gradient(135deg,rgba(251,146,60,0.18),rgba(234,88,12,0.06))",  glow: "rgba(251,146,60,0.25)", accent: "#fb923c" },
];

function pingColor(p: number) { return p < 50 ? "#34d399" : p < 100 ? "#fbbf24" : "#f87171"; }

export default function Lobby() {
  const { user, friends }       = useGameData();
  const [, setLocation]         = useLocation();
  const [view, setView]         = useState<LobbyView>("select");
  const [mode, setMode]         = useState<Mode | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roundCount]            = useState(999); // Infinite rounds until elimination
  const [partyCode]             = useState(() => Math.random().toString(36).substring(2,8).toUpperCase());
  const [joinCode, setJoinCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [matchReady, setMatchReady] = useState(false);
  const [players, setPlayers]   = useState<LobbyPlayer[]>([]);
  const [ping, setPing]         = useState<number | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError]       = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const mmRef    = useRef<MatchmakingHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMode  = MODES.find((m) => m.id === mode);
  const totalPlayers = currentMode?.players ?? 2;
  const allFilled    = players.length >= totalPlayers;
  const acceptedFriends = friends.filter((f) => f.status === "accepted");

  useEffect(() => {
    estimatePing().then(setPing);
    return () => { mmRef.current?.cancel(); if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setSearchTime(0);
    timerRef.current = setInterval(() => setSearchTime((t) => t + 1), 1000);
  };
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  const myPlayer = (): LobbyPlayer[] => user ? [{ user_id: user.id, username: user.username, badge: user.badge, isYou: true, ping: ping ?? undefined }] : [];
  const startLocalMatch = () => {
    if (!mode) return;
    mmRef.current?.cancel();
    stopTimer();
    setSearching(false);
    setMatchReady(true);
    setTimeout(() => setLocation(`/game?mode=multiplayer&type=${mode}&rounds=${roundCount}&local=1`), 900);
  };

  const handleSelectMode = (m: Mode) => { SFX.tap(); setMode(m); setPlayers(myPlayer()); setView("party"); };

  const handleSearch = () => {
    if (!user || !mode) return;
    SFX.tap(); setError(""); setSearching(true); setMatchReady(false); startTimer();
    mmRef.current = startMatchmaking({
      userId: user.id, username: user.username, badge: user.badge,
      mode, roundCount, totalPlayers,
      onUpdate: (p) => setPlayers(p),
      onReady:  (matchId, p) => {
        setPlayers(p); setSearching(false); setMatchReady(true); stopTimer(); SFX.levelUp();

        // Initialize match state for the first player
        if (p[0].isYou) {
           supabase.from('match_state').insert({
             match_id: matchId,
             active_slot: 0,
             current_round: 1,
             word: "START",
             hint: "Ready?",
             phase: "focus",
             status: "active"
           }).then();
        }

        setTimeout(() => setLocation(`/game?mode=multiplayer&type=${mode}&rounds=${roundCount}&matchId=${matchId}`), 1500);
      },
      onError: (msg) => {
        setError(`${msg} Starting bot match...`);
        setPlayers(myPlayer());
        startLocalMatch();
      },
    });
  };

  const handleJoinPrivate = () => {
    if (!user || !mode) return;
    const code = (joinCode.trim() || partyCode).toUpperCase();
    SFX.tap(); setError(""); setSearching(true); setMatchReady(false); startTimer();
    mmRef.current = joinPrivateParty({
      userId: user.id, username: user.username, badge: user.badge,
      mode, roundCount, totalPlayers, partyCode: code,
      onUpdate: (p) => setPlayers(p),
      onReady:  (matchId, p) => {
        setPlayers(p); setSearching(false); setMatchReady(true); stopTimer(); SFX.levelUp();

        // Initialize match state for the first player
        if (p[0].isYou) {
           supabase.from('match_state').insert({
             match_id: matchId,
             active_slot: 0,
             current_round: 1,
             word: "START",
             hint: "Ready?",
             phase: "focus",
             status: "active"
           }).then();
        }

        setTimeout(() => setLocation(`/game?mode=multiplayer&type=${mode}&rounds=${roundCount}&matchId=${matchId}`), 1500);
      },
      onError: (msg) => { setError(msg); setSearching(false); stopTimer(); setPlayers(myPlayer()); },
    });
  };

  const handleCancel = () => {
    mmRef.current?.cancel(); mmRef.current = null;
    setSearching(false); setMatchReady(false); stopTimer();
    if (user) setPlayers([{ user_id: user.id, username: user.username, badge: user.badge, isYou: true }]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(partyCode).catch(() => {});
    SFX.tap(); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000);
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-6 text-center gap-6 z-10">
          <div className="w-20 h-20 rounded-3xl bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center">
            <User className="h-9 w-9 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>Profile Required</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create a player name on the home screen before joining ranked multiplayer.
            </p>
          </div>
          <Button onClick={() => setLocation("/")} className="h-12 px-8 bg-cyan-400 text-black font-black rounded-2xl">
            Set Up Profile
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 z-10 text-center py-8">

        {/* Header */}
        <div className="w-full flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => { SFX.tap(); handleCancel(); view === "party" ? setView("select") : setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {view === "select" ? "Multiplayer" : "Lobby"}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            {ping !== null && (
              <div className="flex items-center gap-1 text-xs font-mono" style={{ color: pingColor(ping) }}>
                <Wifi className="h-3 w-3" />{ping}ms
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {searching && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              className="mb-6 overflow-hidden w-full max-w-sm mx-auto"
            >
              <div
                className="rounded-3xl p-5 flex flex-col items-center gap-3 relative overflow-hidden"
                style={{
                  background: "linear-gradient(145deg, rgba(34,211,238,0.1), rgba(6,182,212,0.05))",
                  border: "1px solid rgba(34,211,238,0.2)",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
                }}
              >
                {/* Scanning animation bar */}
                <motion.div
                  className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400/50"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                />

                <div className="flex items-center gap-3 text-cyan-400">
                  <div className="relative">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <div className="absolute inset-0 bg-cyan-400 blur-md opacity-20 animate-pulse" />
                  </div>
                  <span className="font-black tracking-[0.2em] uppercase text-xs">Finding global match...</span>
                </div>

                <div className="text-4xl font-mono font-black text-white tabular-nums tracking-tighter">
                  {Math.floor(searchTime / 60).toString().padStart(2, '0')}:{(searchTime % 60).toString().padStart(2, '0')}
                </div>

                <div className="flex items-center gap-4 w-full px-4">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                      animate={{ width: ["0%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    />
                  </div>
                </div>

                <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest mt-1">Searching regional servers...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* Mode select */}
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-4 pb-4 w-full max-w-sm mx-auto">
              {MODES.map((m, idx) => (
                <motion.button key={m.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                  onClick={() => handleSelectMode(m.id)}
                  className="w-full rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-all group"
                  style={{ border: `1px solid ${m.accent}30`, background: m.gradient }}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(5,7,18,0.9) 100%)" }} />
                    <div className="absolute bottom-3 left-4 flex items-end gap-3">
                      <span className="text-4xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: m.accent, textShadow: `0 0 20px ${m.glow}` }}>{m.name}</span>
                      <span className="mb-0.5 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${m.accent}20`, border: `1px solid ${m.accent}40`, color: m.accent }}>{m.tag}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3"><p className="text-sm text-muted-foreground">{m.desc}</p></div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Party / Lobby view */}
          {view === "party" && mode && currentMode && (
            <motion.div key="party" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex flex-col gap-4 pb-6 w-full max-w-sm mx-auto">

              {/* Mode badge */}
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: currentMode.gradient, border: `1px solid ${currentMode.accent}25` }}>
                <span className="text-xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: currentMode.accent }}>{currentMode.name}</span>
                <span className="text-sm text-muted-foreground">{currentMode.desc}</span>
              </div>

              {/* Public / Private toggle */}
              <div className="flex gap-2">
                {[false, true].map((priv) => (
                  <button key={String(priv)} onClick={() => { SFX.tap(); setIsPrivate(priv); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-sm font-bold transition-all"
                    style={{
                      background:   isPrivate === priv ? `${currentMode.accent}15` : "rgba(255,255,255,0.03)",
                      borderColor:  isPrivate === priv ? `${currentMode.accent}50` : "rgba(255,255,255,0.1)",
                      color:        isPrivate === priv ? currentMode.accent : "rgba(255,255,255,0.4)",
                    }}>
                    {priv ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                    {priv ? "Private" : "Public"}
                  </button>
                ))}
              </div>

              {/* Party code (private only) */}
              {isPrivate && (
                <div className="flex flex-col gap-3 p-4 rounded-2xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">Your party code</p>
                      <p className="text-2xl font-black font-mono tracking-widest" style={{ color: currentMode.accent }}>{partyCode}</p>
                    </div>
                    <button onClick={copyCode} className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
                      style={{ background: codeCopied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)", borderColor: codeCopied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.15)" }}>
                      {codeCopied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Or enter a code to join..." maxLength={6}
                      className="h-9 bg-white/5 border-white/10 font-mono text-sm uppercase tracking-widest" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">Share your code so friends can join, or enter theirs above.</p>
                </div>
              )}

              {/* Elimination Mode Info */}
              <div className="px-4 py-2.5 rounded-2xl bg-white/3 border border-white/5 text-center">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Elimination Mode</p>
                  <p className="text-xs text-white/40 mt-0.5">Match ends when only one player remains.</p>
              </div>

              {/* Player slots */}
              <div className={`grid gap-3 ${totalPlayers === 2 ? "grid-cols-2" : totalPlayers === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {Array.from({ length: totalPlayers }).map((_, i) => {
                  const player = players[i] ?? null;
                  return (
                    <motion.div key={i} layout className={`rounded-2xl border p-4 flex flex-col items-center gap-2.5 min-h-[110px] justify-center transition-all ${
                      player?.isYou ? "border-cyan-400/35 bg-cyan-400/6" : player ? "border-white/12 bg-white/4" : "border-dashed border-white/8 bg-white/2"}`}>
                      {player ? (
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2 w-full">
                          {/* Badge */}
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-black/20"
                            style={{ borderColor: player.isYou ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.15)" }}>
                            <span className="text-[10px] font-black font-mono text-white/40">{player.badge.toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-bold text-center leading-tight truncate max-w-full">{player.username}</span>
                          {player.isYou ? (
                            <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wide">You</span>
                          ) : player.ping != null ? (
                            <div className="flex items-center gap-1">
                              <Wifi className="h-2.5 w-2.5" style={{ color: pingColor(player.ping) }} />
                              <span className="text-[10px] font-mono tabular-nums" style={{ color: pingColor(player.ping) }}>{player.ping}ms</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[10px] font-mono">Connected</span>
                            </div>
                          )}
                        </motion.div>
                      ) : searching ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                          <span className="text-xs font-mono text-muted-foreground/40">Searching...</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground/25">Empty</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Match found */}
              <AnimatePresence>
                {matchReady && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)" }}>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400 font-mono">Match found — launching...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-2xl text-sm text-red-400"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Friends invite (private party) */}
              {isPrivate && acceptedFriends.length > 0 && !searching && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <UserPlus className="h-3 w-3" /> Friends
                  </p>
                  {acceptedFriends.map((f) => (
                    <div key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border bg-white/3 border-white/8 text-sm">
                      <span className="font-semibold">{f.username}</span>
                      <span className="text-xs text-muted-foreground font-mono">Share code to invite</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-1">
                {searching ? (
                  <Button onClick={handleCancel} variant="outline" className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold">
                    Cancel Search
                  </Button>
                ) : (
                  <Button
                    onClick={isPrivate ? handleJoinPrivate : handleSearch}
                    disabled={allFilled || matchReady}
                    variant="outline"
                    className="w-full h-12 border-white/15 rounded-2xl font-bold disabled:opacity-40"
                  >
                    {isPrivate
                      ? <><Lock className="mr-2 h-4 w-4" /> {joinCode ? "Join Party" : "Create Party"}</>
                      : <><Globe className="mr-2 h-4 w-4" /> Find Online Players</>
                    }
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
