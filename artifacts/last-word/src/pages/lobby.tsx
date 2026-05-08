import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Lock, Globe, UserPlus, Check, Wifi } from "lucide-react";
import { useGameData, Friend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { startMatchmaking, MatchPlayer, MatchmakingHandle } from "@/lib/matchmaking";
import { SFX } from "@/lib/sounds";

type Mode = "1v1" | "1v1v1" | "1v1v1v1";
type LobbyView = "select" | "party";

const MODES = [
  { id: "1v1" as Mode,     name: "DUEL",  tag: "1 vs 1",    desc: "Head-to-head — winner takes all",      players: 2, image: "/mode-duel.png",  gradient: "linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(6,182,212,0.06) 100%)",   glow: "rgba(34,211,238,0.25)",  accent: "#22d3ee" },
  { id: "1v1v1" as Mode,   name: "TRIO",  tag: "3 players", desc: "Three-way battle royale",              players: 3, image: "/mode-trio.png",  gradient: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.06) 100%)",  glow: "rgba(139,92,246,0.25)",  accent: "#a78bfa" },
  { id: "1v1v1v1" as Mode, name: "CHAOS", tag: "4 players", desc: "Four-way free for all — pure mayhem", players: 4, image: "/mode-chaos.png", gradient: "linear-gradient(135deg, rgba(251,146,60,0.18) 0%, rgba(234,88,12,0.06) 100%)",   glow: "rgba(251,146,60,0.25)",  accent: "#fb923c" },
];

function pingColor(ping: number) {
  if (ping < 50)  return "#34d399";
  if (ping < 100) return "#fbbf24";
  return "#f87171";
}

export default function Lobby() {
  const { user, friends }             = useGameData();
  const [, setLocation]               = useLocation();
  const [view, setView]               = useState<LobbyView>("select");
  const [mode, setMode]               = useState<Mode | null>(null);
  const [isPrivate, setIsPrivate]     = useState(false);
  const [partyCode]                   = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [searching, setSearching]     = useState(false);
  const [matchReady, setMatchReady]   = useState(false);
  const [players, setPlayers]         = useState<MatchPlayer[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [searchTime, setSearchTime]   = useState(0);
  const mmHandle  = useRef<MatchmakingHandle | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const acceptedFriends = friends.filter((f) => f.status === "accepted");
  const totalPlayers    = MODES.find((m) => m.id === mode)?.players ?? 2;
  const currentMode     = MODES.find((m) => m.id === mode);
  const allFilled       = players.length >= totalPlayers && !searching;

  useEffect(() => () => {
    mmHandle.current?.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleSelectMode = (m: Mode) => {
    SFX.tap();
    setMode(m);
    setView("party");
    if (user) setPlayers([{ id: user.id, name: user.username, flag: "🏆", ping: 5, rating: 1000, isYou: true }]);
  };

  const handleStartSearch = () => {
    if (!user || !mode) return;
    SFX.tap();
    setSearching(true);
    setMatchReady(false);
    setSearchTime(0);
    timerRef.current = setInterval(() => setSearchTime((t) => t + 1), 1000);
    mmHandle.current = startMatchmaking(
      totalPlayers, user.username, user.id,
      (updated) => setPlayers(updated),
      (final) => {
        setPlayers(final);
        setSearching(false);
        setMatchReady(true);
        SFX.levelUp();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      },
    );
  };

  const handleCancelSearch = () => {
    mmHandle.current?.cancel();
    mmHandle.current = null;
    setSearching(false);
    setMatchReady(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (user) setPlayers([{ id: user.id, name: user.username, flag: "🏆", ping: 5, rating: 1000, isYou: true }]);
  };

  const handleInviteFriend = (f: Friend) => {
    const already = invitedFriends.includes(f.id);
    SFX.tap();
    if (already) {
      setInvitedFriends((prev) => prev.filter((id) => id !== f.id));
      setPlayers((prev) => prev.filter((p) => p.name !== f.username));
    } else if (players.length < totalPlayers) {
      setInvitedFriends((prev) => [...prev, f.id]);
      setPlayers((prev) => [...prev, { id: f.id, name: f.username, flag: "👤", ping: 20 + Math.floor(Math.random() * 60), rating: 900, isFriend: true }]);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 z-10">
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => { SFX.tap(); handleCancelSearch(); view === "party" ? setView("select") : setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>
            {view === "select" ? "Multiplayer" : "Lobby"}
          </h1>
          {searching && (
            <div className="ml-auto flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />{searchTime}s
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="flex flex-col gap-4 pb-4">
              {MODES.map((m, idx) => (
                <motion.button key={m.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                  onClick={() => handleSelectMode(m.id)}
                  className="w-full rounded-3xl overflow-hidden text-left transition-all active:scale-[0.98] group"
                  style={{ border: `1px solid ${m.accent}30`, background: m.gradient }}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={m.image} alt={m.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(5,7,18,0.9) 100%)" }} />
                    <div className="absolute bottom-3 left-4 flex items-end gap-3">
                      <span className="text-4xl font-black leading-none" style={{ fontFamily: "Orbitron, sans-serif", color: m.accent, textShadow: `0 0 20px ${m.glow}` }}>{m.name}</span>
                      <span className="mb-0.5 text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${m.accent}20`, border: `1px solid ${m.accent}40`, color: m.accent }}>{m.tag}</span>
                    </div>
                  </div>
                  <div className="px-4 py-3"><p className="text-sm text-muted-foreground">{m.desc}</p></div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {view === "party" && mode && currentMode && (
            <motion.div key="party" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="flex flex-col gap-5 pb-4">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: currentMode.gradient, border: `1px solid ${currentMode.accent}25` }}>
                <span className="text-xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: currentMode.accent }}>{currentMode.name}</span>
                <span className="text-sm text-muted-foreground">{currentMode.desc}</span>
              </div>

              <div className="flex items-center justify-between bg-card border border-card-border rounded-2xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-0.5">Party Code</p>
                  <p className="text-lg font-black font-mono tracking-widest" style={{ color: currentMode.accent }}>{partyCode}</p>
                </div>
                <button onClick={() => { SFX.tap(); setIsPrivate((v) => !v); }}
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-xl border transition-colors ${isPrivate ? "bg-violet-500/15 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground"}`}>
                  {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {isPrivate ? "Private" : "Public"}
                </button>
              </div>

              <div className={`grid gap-3 ${totalPlayers === 2 ? "grid-cols-2" : totalPlayers === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {Array.from({ length: totalPlayers }).map((_, i) => {
                  const player = players[i] ?? null;
                  return (
                    <motion.div key={i} layout className={`rounded-2xl border p-4 flex flex-col items-center gap-2 min-h-[96px] justify-center transition-all ${
                      player?.isYou ? "bg-cyan-400/8 border-cyan-400/35" : player?.isFriend ? "bg-violet-500/8 border-violet-500/35" : player ? "bg-white/4 border-white/12" : "bg-white/2 border-dashed border-white/8"}`}>
                      {player ? (
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-2 w-full">
                          <div className="text-2xl">{player.flag}</div>
                          <span className="text-sm font-bold text-center leading-tight">{player.name}</span>
                          <div className="flex items-center gap-1.5">
                            {player.isYou ? (
                              <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wide">You</span>
                            ) : player.isFriend ? (
                              <span className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wide">Friend</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Wifi className="h-2.5 w-2.5" style={{ color: pingColor(player.ping) }} />
                                <span className="text-[10px] font-mono tabular-nums" style={{ color: pingColor(player.ping) }}>{player.ping}ms</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : searching ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                          <span className="text-xs font-mono text-muted-foreground/40">Searching...</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground/25">Empty slot</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                {matchReady && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
                    <span className="text-sm font-bold text-emerald-400 font-mono">✓ Match found!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {acceptedFriends.length > 0 && !searching && (
                <div>
                  <button onClick={() => { SFX.tap(); setShowInvitePanel((v) => !v); }}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
                    <UserPlus className="h-4 w-4" /> Invite friends
                  </button>
                  <AnimatePresence>
                    {showInvitePanel && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex flex-col gap-2 pb-3">
                          {acceptedFriends.map((f) => {
                            const invited = invitedFriends.includes(f.id);
                            return (
                              <button key={f.id} onClick={() => handleInviteFriend(f)}
                                disabled={!invited && players.length >= totalPlayers}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm ${invited ? "bg-violet-500/12 border-violet-500/40" : "bg-white/3 border-white/8 hover:bg-white/6 disabled:opacity-40"}`}>
                                <span className="font-semibold">{f.username}</span>
                                {invited ? <span className="text-xs text-violet-400 flex items-center gap-1"><Check className="h-3 w-3" /> Invited</span> : <span className="text-xs text-muted-foreground">Invite</span>}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                {searching ? (
                  <Button onClick={handleCancelSearch} variant="outline" className="w-full h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-2xl font-bold">
                    Cancel Search
                  </Button>
                ) : !matchReady && players.length < totalPlayers && !isPrivate ? (
                  <Button onClick={handleStartSearch} variant="outline" className="w-full h-12 border-white/15 rounded-2xl font-bold">
                    <Globe className="mr-2 h-4 w-4" /> Find Online Players
                  </Button>
                ) : null}
                <Button
                  onClick={() => { SFX.levelUp(); setLocation(`/game?mode=multiplayer&type=${mode}`); }}
                  disabled={!allFilled}
                  className="w-full h-14 text-lg font-black text-black rounded-2xl disabled:opacity-40"
                  style={{ background: allFilled ? `linear-gradient(135deg, ${currentMode.accent}, ${currentMode.accent}cc)` : undefined, boxShadow: allFilled ? `0 0 24px ${currentMode.glow}` : undefined }}
                  data-testid="button-start-game">
                  {allFilled ? "Start Game →" : searching ? `Searching... ${players.length}/${totalPlayers}` : `Waiting ${players.length}/${totalPlayers}`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
