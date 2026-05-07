import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Loader2, Lock, Globe, UserPlus, Check } from "lucide-react";
import { useGameData, Friend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";

type Mode = "1v1" | "1v1v1" | "1v1v1v1";
type LobbyView = "select" | "party";

const MODES: {
  id: Mode;
  name: string;
  tag: string;
  desc: string;
  players: number;
  image: string;
  gradient: string;
  glow: string;
  accent: string;
}[] = [
  {
    id: "1v1",
    name: "DUEL",
    tag: "1 vs 1",
    desc: "Head-to-head — winner takes all",
    players: 2,
    image: "/mode-duel.png",
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.18) 0%, rgba(6,182,212,0.06) 100%)",
    glow: "rgba(34,211,238,0.25)",
    accent: "#22d3ee",
  },
  {
    id: "1v1v1",
    name: "TRIO",
    tag: "3 players",
    desc: "Three-way battle royale",
    players: 3,
    image: "/mode-trio.png",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.06) 100%)",
    glow: "rgba(139,92,246,0.25)",
    accent: "#a78bfa",
  },
  {
    id: "1v1v1v1",
    name: "CHAOS",
    tag: "4 players",
    desc: "Four-way free for all — pure mayhem",
    players: 4,
    image: "/mode-chaos.png",
    gradient: "linear-gradient(135deg, rgba(251,146,60,0.18) 0%, rgba(234,88,12,0.06) 100%)",
    glow: "rgba(251,146,60,0.25)",
    accent: "#fb923c",
  },
];

const BOT_NAMES = ["NeonNinja", "SpeedDemon", "GhostWord", "ZeroDay", "TypeGod", "CyberPunk", "Blinkfire", "Axiom"];

function generatePartyCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Lobby() {
  const { user, friends } = useGameData();
  const [, setLocation] = useLocation();

  const [view, setView]                 = useState<LobbyView>("select");
  const [mode, setMode]                 = useState<Mode | null>(null);
  const [isPrivate, setIsPrivate]       = useState(false);
  const [partyCode]                     = useState(generatePartyCode);
  const [searching, setSearching]       = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [slots, setSlots]               = useState<({ name: string; isYou?: boolean; isFriend?: boolean } | null)[]>([]);

  const acceptedFriends = friends.filter((f) => f.status === "accepted");
  const totalPlayers    = MODES.find((m) => m.id === mode)?.players ?? 2;
  const currentMode     = MODES.find((m) => m.id === mode);

  const handleSelectMode = (m: Mode) => {
    setMode(m);
    setView("party");
    setSlots([
      { name: user?.username ?? "You", isYou: true },
      ...Array(MODES.find((x) => x.id === m)!.players - 1).fill(null),
    ]);
  };

  // Fill remaining slots with bots
  useEffect(() => {
    if (view !== "party" || !searching) return;
    const filled = slots.filter(Boolean).length;
    if (filled >= totalPlayers) { setSearching(false); return; }
    const t = setTimeout(() => {
      setSlots((prev) => {
        const next = [...prev];
        const emptyIdx = next.findIndex((s) => s === null);
        if (emptyIdx !== -1) {
          const usedNames = next.filter(Boolean).map((s) => s!.name);
          const available = BOT_NAMES.filter((n) => !usedNames.includes(n));
          next[emptyIdx] = { name: available[Math.floor(Math.random() * available.length)] };
        }
        return next;
      });
    }, 1100 + Math.random() * 900);
    return () => clearTimeout(t);
  }, [slots, searching, view, totalPlayers]);

  const handleInviteFriend = (f: Friend) => {
    if (invitedFriends.includes(f.id)) {
      setInvitedFriends((prev) => prev.filter((id) => id !== f.id));
      setSlots((prev) => prev.map((s) => (s?.name === f.username ? null : s)));
    } else {
      setInvitedFriends((prev) => [...prev, f.id]);
      setSlots((prev) => {
        const next = [...prev];
        const emptyIdx = next.findIndex((s) => s === null);
        if (emptyIdx !== -1) next[emptyIdx] = { name: f.username, isFriend: true };
        return next;
      });
    }
  };

  const allFilled = slots.every(Boolean);

  if (!user) return null;

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 z-10">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button
            onClick={() => (view === "party" ? setView("select") : setLocation("/"))}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {view === "select" ? "Multiplayer" : "Lobby"}
          </h1>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Mode select ─────────────────────────────────────────────── */}
          {view === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex flex-col gap-4 pb-4"
            >
              {MODES.map((m, idx) => (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  onClick={() => handleSelectMode(m.id)}
                  className="w-full rounded-3xl overflow-hidden text-left transition-all active:scale-[0.98] group"
                  style={{
                    border: `1px solid ${m.accent}30`,
                    background: m.gradient,
                    boxShadow: `0 0 0 0 ${m.glow}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 32px ${m.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 0 ${m.glow}`;
                  }}
                  data-testid={`mode-${m.id}`}
                >
                  {/* Artwork */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom, transparent 30%, rgba(5,7,18,0.9) 100%)`,
                      }}
                    />
                    {/* Mode name over image */}
                    <div className="absolute bottom-3 left-4 flex items-end gap-3">
                      <span
                        className="text-4xl font-black leading-none"
                        style={{
                          fontFamily: "Orbitron, sans-serif",
                          color: m.accent,
                          textShadow: `0 0 20px ${m.glow}`,
                        }}
                      >
                        {m.name}
                      </span>
                      <span
                        className="mb-0.5 text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{
                          background: `${m.accent}20`,
                          border: `1px solid ${m.accent}40`,
                          color: m.accent,
                        }}
                      >
                        {m.tag}
                      </span>
                    </div>
                  </div>

                  {/* Info bar */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-muted-foreground">{m.desc}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ── Party view ──────────────────────────────────────────────── */}
          {view === "party" && mode && currentMode && (
            <motion.div
              key="party"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              className="flex flex-col gap-5"
            >
              {/* Mode badge */}
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: currentMode.gradient, border: `1px solid ${currentMode.accent}25` }}
              >
                <span
                  className="text-xl font-black"
                  style={{ fontFamily: "Orbitron, sans-serif", color: currentMode.accent }}
                >
                  {currentMode.name}
                </span>
                <span className="text-sm text-muted-foreground">{currentMode.desc}</span>
              </div>

              {/* Party code + privacy */}
              <div className="flex items-center justify-between bg-card border border-card-border rounded-2xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-0.5">Party Code</p>
                  <p
                    className="text-lg font-black font-mono tracking-widest"
                    style={{ color: currentMode.accent }}
                  >
                    {partyCode}
                  </p>
                </div>
                <button
                  onClick={() => setIsPrivate((v) => !v)}
                  className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-xl border transition-colors ${isPrivate ? "bg-violet-500/15 border-violet-500/40 text-violet-300" : "bg-white/5 border-white/10 text-muted-foreground"}`}
                  data-testid="button-privacy-toggle"
                >
                  {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {isPrivate ? "Private" : "Public"}
                </button>
              </div>

              {/* Player slots */}
              <div className={`grid gap-3 ${totalPlayers === 2 ? "grid-cols-2" : totalPlayers === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 flex flex-col items-center gap-2 min-h-[96px] justify-center transition-all ${
                      slot?.isYou   ? "bg-cyan-400/8 border-cyan-400/35" :
                      slot?.isFriend ? "bg-violet-500/8 border-violet-500/35" :
                      slot           ? "bg-white/4 border-white/12" :
                      "bg-white/2 border-dashed border-white/8"
                    }`}
                  >
                    {slot ? (
                      <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${
                          slot.isYou   ? "bg-cyan-400/20 border-cyan-400/40 text-cyan-300" :
                          slot.isFriend ? "bg-violet-500/20 border-violet-500/40 text-violet-300" :
                          "bg-white/8 border-white/15 text-white/60"
                        }`}>
                          {slot.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-center leading-tight">{slot.name}</span>
                        {slot.isYou   && <span className="text-[10px] font-mono text-cyan-400/70 uppercase tracking-wide">You</span>}
                        {slot.isFriend && <span className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wide">Friend</span>}
                        {!slot.isYou && !slot.isFriend && <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-wide">Online</span>}
                      </>
                    ) : searching ? (
                      <>
                        <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
                        <span className="text-xs font-mono text-muted-foreground/40">Searching...</span>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground/25">Empty slot</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite friends */}
              {acceptedFriends.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowInvitePanel((v) => !v)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                    data-testid="button-invite-friends"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite friends
                  </button>
                  <AnimatePresence>
                    {showInvitePanel && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 pb-3">
                          {acceptedFriends.map((f) => {
                            const invited   = invitedFriends.includes(f.id);
                            const slotsLeft = slots.filter((s) => !s).length;
                            return (
                              <button
                                key={f.id}
                                onClick={() => handleInviteFriend(f)}
                                disabled={!invited && slotsLeft === 0}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm ${invited ? "bg-violet-500/12 border-violet-500/40" : "bg-white/3 border-white/8 hover:bg-white/6 disabled:opacity-40"}`}
                                data-testid={`button-invite-${f.id}`}
                              >
                                <span className="font-semibold">{f.username}</span>
                                {invited ? (
                                  <span className="text-xs text-violet-400 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Invited
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Invite</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 mt-2 pb-2">
                {!searching && !allFilled && (
                  <Button
                    onClick={() => setSearching(true)}
                    variant="outline"
                    className="w-full h-12 border-white/15 rounded-2xl font-bold"
                    data-testid="button-find-players"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    {isPrivate ? "Wait for friends" : "Find online players"}
                  </Button>
                )}
                <Button
                  onClick={() => setLocation(`/game?mode=multiplayer&type=${mode}`)}
                  disabled={!allFilled}
                  className="w-full h-14 text-lg font-black text-black rounded-2xl disabled:opacity-40"
                  style={{
                    background: allFilled ? `linear-gradient(135deg, ${currentMode.accent}, ${currentMode.accent}cc)` : undefined,
                    boxShadow: allFilled ? `0 0 24px ${currentMode.glow}` : undefined,
                  }}
                  data-testid="button-start-game"
                >
                  {allFilled ? "Start Game →" : `Waiting... ${slots.filter(Boolean).length}/${totalPlayers}`}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </Layout>
  );
}
