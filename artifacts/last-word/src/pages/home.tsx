import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Play, X, Check, Camera, Star, Calendar, Award, Flame, Settings, ShoppingCart } from "lucide-react";
import { useGameData, getRank } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { toast } from "sonner";
import { isTodayCompleted, getDailyState } from "@/lib/daily";
import { getUnlocked, ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { SFX } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

// ── Floating letter particles ─────────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PARTICLE_COLORS = ["#22d3ee", "#fbbf24", "#a78bfa", "#34d399"];

function FloatingLetters() {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({ // Reduced from 22 to 8 for performance
      id: i,
      letter: LETTERS[Math.floor(Math.random() * 26)],
      left: Math.random() * 96 + 2,
      delay: Math.random() * 12,
      duration: 14 + Math.random() * 14,
      size: 18 + Math.random() * 28,
      opacity: 0.035 + Math.random() * 0.055,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      rotate: Math.random() * 40 - 20,
    }))
  , []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute font-black select-none"
          style={{
            left: `${p.left}%`,
            bottom: "-8%",
            fontSize: `${p.size}px`,
            color: p.color,
            opacity: p.opacity,
            fontFamily: "Orbitron, sans-serif",
          }}
          animate={{
            y: [0, -(typeof window !== "undefined" ? window.innerHeight + 120 : 900)],
            rotate: [0, p.rotate],
          }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {p.letter}
        </motion.div>
      ))}
    </div>
  );
}

// ── Animated game demo ────────────────────────────────────────────────────────
const DEMO_WORD   = "STORM";
const DEMO_HINT   = "Thunder follows lightning";
const DEMO_STOP   = 2;   // reveal 2 letters, then STOP
const DEMO_POINTS = 750;

type DemoPhase = "typing" | "stop" | "guessing" | "correct" | "reset";

function GameDemo() {
  const [phase,    setPhase]    = useState<DemoPhase>("typing");
  const [revealed, setRevNum]   = useState(0);
  const [guessed,  setGuessed]  = useState("");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(setTimeout(fn, ms)); };

    if (phase === "typing") {
      // Reveal letters 0→DEMO_STOP
      for (let i = 0; i < DEMO_STOP; i++) {
        later(() => setRevNum(i + 1), i * 520);
      }
      later(() => setPhase("stop"), DEMO_STOP * 520 + 350);

    } else if (phase === "stop") {
      later(() => setPhase("guessing"), 650);

    } else if (phase === "guessing") {
      const rem = DEMO_WORD.slice(DEMO_STOP);
      rem.split("").forEach((_, i) => {
        later(() => setGuessed(rem.slice(0, i + 1)), i * 380);
      });
      later(() => setPhase("correct"), rem.length * 380 + 400);

    } else if (phase === "correct") {
      later(() => setPhase("reset"), 1400);

    } else {
      // reset
      setRevNum(0);
      setGuessed("");
      later(() => setPhase("typing"), 700);
    }

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const dispRevealed = phase === "typing" ? revealed : DEMO_STOP;
  const dispGuessed  = (phase === "guessing" || phase === "correct") ? guessed : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.4 }}
      className="flex flex-col items-center gap-3 select-none"
    >
      {/* Hint */}
      <AnimatePresence mode="wait">
        <motion.div
          key="hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] font-mono uppercase tracking-[0.25em]"
          style={{ color: "rgba(255,255,255,0.28)" }}
        >
          {DEMO_HINT}
        </motion.div>
      </AnimatePresence>

      {/* Word tiles */}
      <div className="flex gap-2">
        {DEMO_WORD.split("").map((char, idx) => {
          const isRevealed = idx < dispRevealed;
          const guessIdx   = idx - DEMO_STOP;
          const isGuessed  = !isRevealed && guessIdx >= 0 && guessIdx < dispGuessed.length;
          const isNext     = !isRevealed && phase === "guessing" && guessIdx === dispGuessed.length;

          let border = "rgba(255,255,255,0.1)";
          let bg     = "rgba(255,255,255,0.02)";
          let color  = "transparent";

          if (isRevealed) {
            border = "rgba(34,211,238,0.7)";
            bg     = "rgba(34,211,238,0.1)";
            color  = "#22d3ee";
          } else if (isGuessed) {
            if (phase === "correct") {
              border = "rgba(52,211,153,0.7)";
              bg     = "rgba(52,211,153,0.1)";
              color  = "#34d399";
            } else {
              border = "rgba(167,139,250,0.7)";
              bg     = "rgba(167,139,250,0.08)";
              color  = "#c4b5fd";
            }
          } else if (isNext) {
            border = "rgba(167,139,250,0.9)";
            bg     = "rgba(167,139,250,0.06)";
          }

          return (
            <motion.div
              key={idx}
              animate={{
                borderColor: border,
                backgroundColor: bg,
                scale: isNext ? [1, 1.08, 1] : 1,
              }}
              transition={{ duration: 0.15, repeat: isNext ? Infinity : 0, repeatDelay: 0.9 }}
              className="flex items-center justify-center border-2 rounded-xl font-mono font-black"
              style={{
                width: "2.6rem",
                height: "3.2rem",
                fontSize: "1.3rem",
                color,
                border: `2px solid ${border}`,
                background: bg,
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}
            >
              {isRevealed ? char : isGuessed ? dispGuessed[guessIdx] : ""}
            </motion.div>
          );
        })}
      </div>

      {/* Status bar */}
      <div className="h-7 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === "typing" && (
            <motion.div
              key="tap"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.18, 1], boxShadow: ["0 0 8px rgba(220,38,38,0.3)", "0 0 20px rgba(220,38,38,0.7)", "0 0 8px rgba(220,38,38,0.3)"] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
                className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[8px] font-black text-white"
              >
                ■
              </motion.div>
              <span className="text-xs font-mono text-muted-foreground/50">Tap to STOP</span>
            </motion.div>
          )}
          {phase === "stop" && (
            <motion.div
              key="stopped"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              className="text-sm font-black text-red-400"
              style={{ fontFamily: "Orbitron, sans-serif", textShadow: "0 0 16px rgba(248,113,113,0.6)" }}
            >
              STOP!
            </motion.div>
          )}
          {phase === "guessing" && (
            <motion.div
              key="guess"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-mono text-violet-400/70"
            >
              Type the rest...
            </motion.div>
          )}
          {phase === "correct" && (
            <motion.div
              key="correct"
              initial={{ opacity: 0, y: 8, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm font-black text-emerald-400" style={{ fontFamily: "Orbitron, sans-serif" }}>
                CORRECT!
              </span>
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="text-sm font-bold text-yellow-400 font-mono"
              >
                +{DEMO_POINTS.toLocaleString()}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  const last = ["L", "A", "S", "T"];
  const word = ["L", "E", "T", "T", "E", "R"];
  return (
    <div className="select-none flex flex-col items-center leading-none">
      <div className="flex items-end gap-0.5">
        {last.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-[3.8rem] md:text-[5rem] font-black leading-none tracking-tighter"
            style={{
              fontFamily: "Orbitron, sans-serif",
              color: "#22d3ee",
              textShadow: "0 0 28px rgba(34,211,238,0.6), 0 0 60px rgba(34,211,238,0.2)",
            }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
      <div
        className="flex items-end gap-0.5"
        style={{ marginTop: "-0.08em", alignSelf: "flex-end", marginRight: "-0.04em" }}
      >
        {word.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 36, scaleY: 1.3 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 600, damping: 22 }}
            className="text-[3.8rem] md:text-[5rem] font-black leading-none tracking-tighter inline-block"
            style={{
              fontFamily: "Orbitron, sans-serif",
              color: "#fbbf24",
              textShadow: "0 0 26px rgba(251,191,36,0.65), 0 0 55px rgba(251,191,36,0.22)",
              transform: "skewX(-6deg)",
              display: "inline-block",
            }}
          >
            {ch}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ pfp, size = 9 }: { pfp?: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  const defaultPfp = "https://t4.ftcdn.net/jpg/00/64/67/63/360_F_64676383_LdbmhiNM6Ypzb3FM4PPuFP9rHe7ri8Ju.jpg";
  return (
    <div className={`${cls} rounded-full overflow-hidden border-2 border-white/15 bg-black/40`}>
        <img src={pfp || defaultPfp} alt="Profile" className="w-full h-full object-cover" />
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ type, size = 9 }: { type: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  const isGuest = type === "Guest";
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${isGuest ? 'from-slate-400/20 to-slate-600/20' : 'from-cyan-400/20 to-violet-500/20'} border-2 border-white/10 flex flex-col items-center justify-center overflow-hidden shadow-inner relative group`}>
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="text-[10px] font-black font-sans text-white/40 tracking-tighter leading-none mb-0.5">{type.toUpperCase()}</span>
      <div className="w-4 h-0.5 bg-white/20 rounded-full" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, setUser, scores, friends } = useGameData();
  const [, setLocation] = useLocation();

  const [showUserModal, setShowUserModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        if (user) setUser({ ...user, pfp: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, [user, setUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (trimmed.length < 2) return;

    // Check uniqueness
    const { data: existing, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .not('id', 'eq', user?.id)
        .maybeSingle();

    if (existing) {
        toast.error("Username already taken!");
        return;
    }

    setUser({
      id: user?.id ?? crypto.randomUUID(),
      username: trimmed.substring(0, 15),
      badge: user?.badge ?? "Guest"
    });
    setShowUserModal(false);
  };

  const acceptedCount = friends.filter((f) => f.status === "accepted").length;
  const incomingCount = friends.filter((f) => f.status === "pending_received").length;
  const dailyDone     = isTodayCompleted();
  const dailyStreak   = getDailyState()?.streak ?? 0;
  const unlockedCount = getUnlocked().length;
  const [showAchievements, setShowAchievements] = useState(false);

  const [showSettings, setShowSettings] = useState(false);

  return (
    <Layout>
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">

        {/* Background floating letters */}
        <FloatingLetters />

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
          <div className="text-sm font-mono">
            {scores.rankScore > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
                  <img src={getRank(scores.rankScore).icon} className="w-full h-full object-contain" />
                </div>
                <span className={`font-black uppercase text-[10px] ${getRank(scores.rankScore).color}`}>
                  {getRank(scores.rankScore).name}
                </span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setUsernameInput(user?.username ?? ""); setShowUserModal(true); }}
              className="p-1 rounded-full hover:bg-white/5 transition-colors"
              data-testid="button-user-profile"
            >
              <Avatar pfp={user?.pfp} size={9} />
            </button>

            <button
              onClick={() => { SFX.tap(); setShowSettings(true); }}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-7">

          <div className="absolute right-4 top-20 flex flex-col gap-2 items-end">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)] backdrop-blur-md"
            >
                <div className="text-xl">💰</div>
                <span className="font-mono font-bold text-lg text-yellow-500 tabular-nums">{scores.coins.toLocaleString()}</span>
            </motion.div>
          </div>

          <Logo />

          {/* Live game demo */}
          <GameDemo />

          {/* Distributed Buttons */}
          <div className="w-full max-w-lg flex items-center justify-between gap-4 mt-8 px-4">
              <div className="flex flex-col gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { SFX.tap(); setLocation("/friends"); }}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 shadow-lg"
                  >
                    <Users className="h-6 w-6" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { SFX.tap(); setShowAchievements(true); }}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-yellow-400 shadow-lg"
                  >
                    <Award className="h-6 w-6" />
                  </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setLocation("/modes")}
                className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-cyan-400 to-blue-600 flex flex-col items-center justify-center gap-2 shadow-[0_0_50px_rgba(34,211,238,0.3)] border-4 border-white/20"
              >
                <Play className="h-10 w-10 fill-black text-black" />
                <span className="text-black font-black text-xl tracking-tighter">PLAY</span>
              </motion.button>

              <div className="flex flex-col gap-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { SFX.tap(); setLocation("/shop"); }}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-yellow-500 shadow-lg relative group"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { SFX.tap(); setLocation("/daily"); }}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-orange-400 shadow-lg"
                  >
                    <Calendar className="h-6 w-6" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { SFX.tap(); setShowSettings(true); }}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shadow-lg"
                  >
                    <Settings className="h-6 w-6" />
                  </motion.button>
              </div>
          </div>

          {/* Currency Bar Removed from here, moved to corner */}

          {/* Stats replaced by global status removed, made simpler */}
        </div>

      </div>

      {/* ── Profile modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowUserModal(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
              style={{
                background: "linear-gradient(145deg, hsl(234,25%,11%), hsl(234,25%,8%))",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {user ? "Edit Profile" : "Set Up Profile"}
                </h2>
                <button onClick={() => setShowUserModal(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-cyan-400/50 transition-all duration-300 flex items-center justify-center bg-black/40 shadow-inner">
                      <Avatar pfp={user?.pfp} size={24} />
                    </div>
                  </div>

                  {/* Owned PFPs Selection */}
                  {scores.ownedPfps.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto py-2 w-full max-w-[280px] no-scrollbar">
                          {scores.ownedPfps.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => user && setUser({ ...user, pfp: url })}
                                className={`flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all ${user?.pfp === url ? 'border-cyan-400 scale-110 shadow-lg' : 'border-white/10 opacity-50 hover:opacity-100'}`}
                              >
                                  <img src={url} className="w-full h-full object-cover rounded-full" />
                              </button>
                          ))}
                      </div>
                  )}

                  <div className="text-center">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Owned Avatars</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Username (Must be unique)</p>
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter codename..."
                      className="h-12 bg-white/5 border-white/10 rounded-xl font-sans text-lg focus:border-cyan-400/50 transition-colors"
                      maxLength={15}
                      autoFocus
                    />
                  </div>

                  {user && (
                    <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-1">
                      <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest text-center">Global ID (Tap to Copy)</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.id);
                          toast.success("ID Copied to clipboard");
                        }}
                        className="w-full text-[10px] font-mono text-cyan-400/50 hover:text-cyan-400 transition-colors break-all leading-tight"
                      >
                        {user.id}
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={usernameInput.trim().length < 2}
                  className="h-11 text-black font-bold rounded-xl"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)" }}
                  data-testid="button-save-username"
                >
                  <Check className="mr-2 h-4 w-4" /> Save
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Achievements modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAchievements && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAchievements(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto"
              style={{ background: "linear-gradient(145deg, hsl(234,25%,11%), hsl(234,25%,8%))", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Award className="h-5 w-5 text-yellow-400" /> Achievements
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{unlockedCount}/{ALL_ACHIEVEMENTS.length}</span>
                  <button onClick={() => setShowAchievements(false)} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {ALL_ACHIEVEMENTS.map((a) => {
                  const unlocked = getUnlocked().find((u) => u.id === a.id);
                  return (
                    <motion.div
                      key={a.id}
                      whileHover={{ scale: 1.05 }}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                        unlocked
                          ? "bg-gradient-to-b from-white/10 to-white/[0.02] border-white/25 shadow-lg hover:shadow-xl hover:border-cyan-400/50"
                          : "bg-black/30 border-white/5 opacity-50"
                      }`}>
                      <div className={`text-4xl transition-all duration-300 ${unlocked ? "group-hover:scale-125" : "grayscale"}`}>
                        {a.icon}
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-black tracking-tight leading-tight ${unlocked ? "text-white" : "text-muted-foreground"}`}>
                          {a.title.split(' ')[0].toUpperCase()}
                        </div>
                      </div>
                      {unlocked && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                        background: unlocked ? "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)" : "none"
                      }} />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Settings modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
              style={{ background: "linear-gradient(145deg, hsl(234,25%,11%), hsl(234,25%,8%))", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <Settings className="h-5 w-5 text-cyan-400" /> Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowSettings(false); setLocation("/leaderboard"); }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-bold text-white uppercase tracking-wider text-sm">Global Leaderboard</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">See who is the best</div>
                  </div>
                </button>

                <div className="p-4 rounded-2xl border border-white/5 bg-black/20 space-y-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Preferences</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">Sound Effects</span>
                    <div className="w-10 h-6 bg-cyan-500/20 border border-cyan-500/40 rounded-full flex items-center px-1">
                      <div className="w-4 h-4 bg-cyan-400 rounded-full ml-auto shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">Haptic Feedback</span>
                    <div className="w-10 h-6 bg-cyan-500/20 border border-cyan-500/40 rounded-full flex items-center px-1">
                      <div className="w-4 h-4 bg-cyan-400 rounded-full ml-auto shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[9px] font-mono text-center text-white/10 uppercase tracking-[0.3em]">Last Word · v1.2</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
