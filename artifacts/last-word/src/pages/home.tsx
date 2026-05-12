import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, Play, Swords, X, Check, Camera, Star, Calendar, Award, Flame, Settings } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { toast } from "sonner";
import { isTodayCompleted, getDailyState } from "@/lib/daily";
import { getUnlocked, ALL_ACHIEVEMENTS } from "@/lib/achievements";
import { SFX } from "@/lib/sounds";

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
  const word = ["W", "O", "R", "D"];
  return (
    <div className="select-none flex flex-col items-center leading-none">
      <div className="flex items-end gap-0.5">
        {last.map((ch, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-[4.2rem] md:text-[5.5rem] font-black leading-none tracking-tighter"
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
            className="text-[4.2rem] md:text-[5.5rem] font-black leading-none tracking-tighter inline-block"
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
function Avatar({ pfp, username, size = 9 }: { pfp?: string; username?: string; size?: number }) {
  const cls = `w-${size} h-${size}`;
  if (pfp) return <img src={pfp} alt="Profile" className={`${cls} rounded-full object-cover border-2 border-white/15`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-500/20 border border-white/15 flex items-center justify-center text-xs font-bold font-mono text-white/70`}>
      {username ? username.slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, setUser, scores, friends } = useGameData();
  const [, setLocation] = useLocation();

  const [showUserModal, setShowUserModal] = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [usernameInput, setUsernameInput] = useState(user?.username ?? "");
  const [pfpPreview, setPfpPreview]       = useState<string | undefined>(user?.pfp);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPfpPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (trimmed.length >= 2) {
      setUser({ id: user?.id ?? crypto.randomUUID(), username: trimmed.substring(0, 15), pfp: pfpPreview });
      setShowUserModal(false);
    }
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
            {scores.highScore > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5"
              >
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-muted-foreground">Best</span>
                <span className="text-cyan-400 font-bold">{scores.highScore.toLocaleString()}</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setUsernameInput(user?.username ?? ""); setPfpPreview(user?.pfp); setShowUserModal(true); }}
              className="p-1 rounded-full hover:bg-white/5 transition-colors"
              data-testid="button-user-profile"
            >
              <Avatar pfp={user?.pfp} username={user?.username} size={9} />
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

          <Logo />

          {/* Live game demo */}
          <GameDemo />

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col w-full max-w-xs gap-3"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/game")}
              className="w-full h-[4.5rem] text-xl font-black tracking-wider text-black rounded-2xl flex items-center justify-center gap-2 transition-all"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)",
                boxShadow: "0 0 40px rgba(34,211,238,0.28), 0 4px 24px rgba(34,211,238,0.12)",
              }}
              data-testid="button-play"
            >
              <Play className="h-5 w-5 fill-current" />
              PLAY
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { SFX.tap(); setLocation("/lobby"); }}
              className="w-full h-12 font-bold tracking-wider rounded-2xl border transition-all flex items-center justify-center gap-2"
              style={{ borderColor: "rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.07)", color: "#c4b5fd" }}
              data-testid="button-multiplayer"
            >
              <Swords className="h-4 w-4" />
              MULTIPLAYER
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { SFX.tap(); setLocation("/daily"); }}
              className="w-full h-12 font-bold tracking-wider rounded-2xl border transition-all flex items-center justify-center gap-2 relative"
              style={{
                borderColor: dailyDone ? "rgba(52,211,153,0.4)" : "rgba(251,191,36,0.4)",
                background:  dailyDone ? "rgba(52,211,153,0.07)" : "rgba(251,191,36,0.07)",
                color:       dailyDone ? "#34d399" : "#fbbf24",
              }}
              data-testid="button-daily"
            >
              <Calendar className="h-4 w-4" />
              DAILY CHALLENGE
              {dailyDone ? (
                <span className="text-[10px] font-mono ml-1">✓</span>
              ) : (
                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              )}
              {dailyStreak > 0 && (
                <span className="flex items-center gap-0.5 text-orange-400 text-xs font-bold ml-1">
                  <Flame className="h-3 w-3 fill-orange-400" />{dailyStreak}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { SFX.tap(); setLocation("/friends"); }}
              className="w-full h-12 font-bold tracking-wider rounded-2xl border transition-all flex items-center justify-center gap-2"
              style={{ borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.07)", color: "#22d3ee" }}
            >
              <Users className="h-4 w-4" />
              FRIENDS
              {(acceptedCount + incomingCount) > 0 && (
                <span className="ml-1 text-xs bg-cyan-400 text-black px-1.5 py-0.5 rounded-full font-black">
                  {acceptedCount + incomingCount}
                </span>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { SFX.tap(); setShowAchievements(true); }}
              className="w-full h-10 font-bold tracking-wider rounded-2xl border transition-all flex items-center justify-center gap-2"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)" }}
            >
              <Award className="h-4 w-4" />
              ACHIEVEMENTS
              <span className="text-xs font-mono ml-1">{unlockedCount}/{ALL_ACHIEVEMENTS.length}</span>
            </motion.button>
          </motion.div>

          {/* Stats */}
          {scores.gamesPlayed > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="grid grid-cols-3 gap-2 w-full max-w-xs"
            >
              {[
                { label: "Best",      value: scores.highScore.toLocaleString(), color: "#22d3ee" },
                { label: "Games",     value: scores.gamesPlayed.toString(),      color: "#ffffff" },
                { label: "Top Round", value: scores.roundRecord.toString(),      color: "#fbbf24" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <div className="text-xl font-bold font-mono tabular-nums" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-mono">{s.label}</div>
                </div>
              ))}
            </motion.div>
          )}
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
                    <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 group-hover:border-cyan-400/50 transition-all duration-300">
                      {pfpPreview ? (
                        <img src={pfpPreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-400/10 to-violet-500/10 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-white/20" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)" }}
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <div className="text-center">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Profile Identity</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Username</p>
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="Enter codename..."
                      className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-lg focus:border-cyan-400/50 transition-colors"
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
              <div className="flex flex-col gap-2.5">
                {ALL_ACHIEVEMENTS.map((a) => {
                  const unlocked = getUnlocked().find((u) => u.id === a.id);
                  return (
                    <div key={a.id} className={`relative overflow-hidden flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-500 ${
                      unlocked
                        ? "bg-gradient-to-r from-white/[0.08] to-transparent border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                        : "bg-black/20 border-white/5 opacity-40 grayscale"
                    }`}>
                      {unlocked && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400" />
                      )}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        unlocked ? "bg-white/[0.05]" : "bg-black/20"
                      }`}>
                        {a.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-black tracking-tight ${unlocked ? "text-white" : "text-muted-foreground"}`}>
                          {a.title.toUpperCase()}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mt-0.5 truncate">
                          {a.desc}
                        </div>
                      </div>
                      {unlocked && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <Check className="h-3 w-3 text-emerald-400" strokeWidth={4} />
                        </div>
                      )}
                    </div>
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
