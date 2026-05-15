import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Trophy, Flame, Share2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useGameData, getRank } from "@/lib/store";
import { getDailyWord, getDailyState, saveDailyResult, isTodayCompleted, getDailyLeaderboard } from "@/lib/daily";
import { tryUnlock } from "@/lib/achievements";
import { SFX } from "@/lib/sounds";
import { Vibrate } from "@/lib/haptics";

type Phase = "INTRO" | "COUNTDOWN" | "TYPING" | "GUESSING" | "FEEDBACK" | "DONE";

export default function DailyChallenge() {
  const [, setLocation] = useLocation();
  const { user, scores } = useGameData();
  const daily           = getDailyWord();
  const already         = isTodayCompleted();
  const prevState       = getDailyState();

  const [phase, setPhase]       = useState<Phase>(already ? "DONE" : "INTRO");
  const [countdown, setCountdown] = useState(3);
  const [revealed, setRevealed] = useState(0);
  const [guess, setGuess]       = useState("");
  const [score, setScore]       = useState(already ? (prevState?.score ?? 0) : 0);
  const [revealedCount, setRevealedCount] = useState(already ? (prevState?.revealed ?? 0) : 0);
  const [feedback, setFeedback] = useState<{ kind: "correct" | "wrong"; points?: number } | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const scoreRef   = useRef(0);
  const revealRef  = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SPEED = 320; // ms per letter — fixed for daily

  const word = daily.word;
  const hint = daily.hint;

  // Countdown
  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    if (countdown <= 0) { setPhase("TYPING"); return; }
    const t = setTimeout(() => {
      SFX.countdown();
      setCountdown((c) => c - 1);
    }, 850);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Typing
  useEffect(() => {
    if (phase !== "TYPING") return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (revealed >= word.length) {
      // Too slow — auto wrong
      SFX.wrong();
      Vibrate.error();
      setFeedback({ kind: "wrong" });
      setPhase("FEEDBACK");
      setTimeout(() => {
        const s = saveDailyResult(scoreRef.current, revealRef.current, word.length);
        setScore(s.score);
        setRevealedCount(s.revealed);
        setPhase("DONE");
      }, 1400);
      return;
    }
    SFX.tick();
    typingTimer.current = setTimeout(() => {
      revealRef.current = revealed + 1;
      setRevealed((r) => r + 1);
    }, SPEED);
    return () => { if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [phase, revealed, word.length]);

  // Keyboard for guessing
  useEffect(() => {
    if (phase !== "GUESSING") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setGuess((g) => g.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        SFX.key();
        setGuess((g) => {
          const next      = g + e.key.toUpperCase();
          const remaining = word.length - revealed;
          if (next.length === remaining) {
            const target = word.slice(revealed);
            if (next === target) {
              const ratio  = revealed / word.length;
              const bonus  = Math.pow(1 - ratio, 2);
              const pts    = Math.max(10, Math.floor(word.length * 200 * bonus));
              scoreRef.current = pts;
              SFX.correct();
              Vibrate.success();
              setFeedback({ kind: "correct", points: pts });
              setPhase("FEEDBACK");
              setTimeout(() => {
                const s = saveDailyResult(pts, revealRef.current, word.length);
                tryUnlock("daily_1");
                const prev2 = getDailyState();
                if ((prev2?.streak ?? 0) >= 7) tryUnlock("daily_7");
                setScore(s.score);
                setRevealedCount(revealRef.current);
                setPhase("DONE");
              }, 1600);
            } else {
              SFX.wrong();
              Vibrate.error();
              setFeedback({ kind: "wrong" });
              setPhase("FEEDBACK");
              setTimeout(() => {
                const s = saveDailyResult(0, revealRef.current, word.length);
                setScore(s.score);
                setRevealedCount(revealRef.current);
                setPhase("DONE");
              }, 1400);
            }
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, word, revealed]);

  const handleStop = useCallback(() => {
    if (phase !== "TYPING") return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    SFX.stop();
    Vibrate.medium();
    setPhase("GUESSING");
  }, [phase]);

  const handleShare = () => {
    const state = getDailyState();
    const rank = getRank(scores.rankScore);
    const text  = `🎯 Last Letter Daily Challenge\n📅 ${new Date().toLocaleDateString()}\n🔥 Streak: ${state?.streak ?? 0} days\n🏆 Rank: ${rank.name}\nPlay: lastletter.app`;
    if (navigator.share) {
      navigator.share({ title: "Last Letter Daily", text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    tryUnlock("shared");
    SFX.achievement();
  };

  const lb = getDailyLeaderboard(user?.username ?? "You", score);
  const myEntry = lb.find((e) => e.name === (user?.username ?? "You"));
  const streak  = getDailyState()?.streak ?? 0;

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => setLocation("/")} className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>Daily Challenge</h1>
          {streak > 0 && (
            <div className="ml-auto flex items-center gap-1 text-orange-400 text-sm font-bold">
              <Flame className="h-4 w-4 fill-orange-400" />{streak}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <AnimatePresence mode="wait">

            {/* INTRO */}
            {phase === "INTRO" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 w-full">
                <div className="text-center">
                  <div className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest mb-2">Today's word</div>
                  <div className="flex gap-2 justify-center mb-4">
                    {word.split("").map((_, i) => (
                      <div key={i} className="w-10 h-12 rounded-xl border-2 border-white/15 bg-white/3 flex items-center justify-center">
                        <span className="text-white/20 text-lg font-mono">?</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{hint}"</p>
                  <p className="text-xs font-mono text-muted-foreground/40 mt-2">{word.length} letters</p>
                </div>
                <Button
                  onClick={() => { SFX.tap(); setPhase("COUNTDOWN"); }}
                  className="h-14 px-10 text-lg font-black text-black rounded-2xl"
                  style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)", boxShadow: "0 0 30px rgba(34,211,238,0.3)" }}>
                  Start Challenge
                </Button>
              </motion.div>
            )}

            {/* COUNTDOWN */}
            {phase === "COUNTDOWN" && (
              <motion.div key={`cd-${countdown}`} initial={{ scale: 0.35, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.7, opacity: 0 }}
                className="text-9xl font-black select-none" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {countdown > 0 ? countdown : "GO!"}
              </motion.div>
            )}

            {/* TYPING / GUESSING / FEEDBACK */}
            {(phase === "TYPING" || phase === "GUESSING" || phase === "FEEDBACK") && (
              <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full">
                {phase === "TYPING" && (
                  <div className="text-xs font-mono text-muted-foreground/60 bg-white/4 border border-white/8 px-3 py-1 rounded-full">{hint}</div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  {word.split("").map((char, idx) => {
                    const isRev    = idx < revealed;
                    const guessIdx = idx - revealed;
                    const isGuessed = !isRev && guessIdx >= 0 && guessIdx < guess.length;
                    let tile = "border-white/10 bg-white/3 text-transparent";
                    let display = "";
                    if (isRev) { tile = "border-cyan-400/50 bg-cyan-400/8 text-cyan-300"; display = char; }
                    else if (isGuessed) {
                      tile = phase === "FEEDBACK"
                        ? feedback?.kind === "correct" ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" : "border-red-400/60 bg-red-400/10 text-red-300"
                        : "border-violet-400/50 bg-violet-400/8 text-violet-200";
                      display = guess[guessIdx];
                    } else if (!isRev && guessIdx === guess.length && phase === "GUESSING") {
                      tile = "border-violet-400 border-2 bg-violet-400/5 animate-pulse text-transparent";
                    }
                    return (
                      <div key={idx} className={`flex items-center justify-center border-2 rounded-xl font-mono font-bold transition-colors duration-100 ${tile}`}
                        style={{ width: "2.8rem", height: "3.5rem", fontSize: "1.4rem" }}>
                        {display}
                      </div>
                    );
                  })}
                </div>

                {phase === "TYPING" && (
                  <motion.button whileTap={{ scale: 0.86 }} onClick={handleStop}
                    className="w-28 h-28 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xl border-4 border-red-400/50 shadow-[0_0_36px_rgba(220,38,38,0.45)] transition-colors select-none"
                    style={{ fontFamily: "Orbitron, sans-serif" }}>
                    STOP
                  </motion.button>
                )}

                {phase === "GUESSING" && (
                  <p className="text-sm text-muted-foreground font-mono">{word.length - revealed} letter{word.length - revealed !== 1 ? "s" : ""} left — type!</p>
                )}

                {phase === "FEEDBACK" && feedback && (
                  <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 20 }}
                    className="text-5xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color: feedback.kind === "correct" ? "#34d399" : "#f87171" }}>
                    {feedback.kind === "correct" ? `+${feedback.points}` : "WRONG"}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* DONE */}
            {phase === "DONE" && (
              <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 w-full">
                <div className="text-center">
                  <div className="text-3xl font-black mb-1" style={{ fontFamily: "Orbitron, sans-serif", color: score > 0 ? "#22d3ee" : "#f87171" }}>
                    {score > 0 ? "DONE!" : "BETTER LUCK"}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">The word was: <span className="text-white font-bold">{word}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-card border border-card-border rounded-2xl p-4 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1">Status</div>
                    <div className={`text-xl font-black ${score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {score > 0 ? 'SURVIVED' : 'FAILED'}
                    </div>
                  </div>
                  <div className="bg-card border border-card-border rounded-2xl p-4 text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-1 flex items-center justify-center gap-1">
                      <Flame className="h-3 w-3 fill-orange-400 text-orange-400" />Streak
                    </div>
                    <div className="text-2xl font-black text-orange-400 font-mono">{streak}</div>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="w-full">
                  <button onClick={() => setShowLeaderboard((v) => !v)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 w-full justify-between">
                    <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" />Global rankings today</span>
                    <span className="text-xs">{showLeaderboard ? "▲" : "▼"}</span>
                  </button>
                  <AnimatePresence>
                    {showLeaderboard && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex flex-col gap-1.5 mb-3">
                          {lb.map((e, i) => {
                            const isMe = e.name === (user?.username ?? "You");
                            return (
                              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-sm ${isMe ? "bg-cyan-400/8 border-cyan-400/30" : "bg-white/3 border-white/8"}`}>
                                <span className="w-5 font-mono text-muted-foreground text-xs">{e.rank}</span>
                                <span className={`flex-1 font-bold ${isMe ? "text-cyan-400" : ""}`}>{e.name}{isMe ? " (you)" : ""}</span>
                                <span className="font-mono text-sm tabular-nums">{e.score.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 w-full">
                  <Button onClick={handleShare} variant="outline" className="flex-1 h-11 border-white/15 rounded-2xl gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </Button>
                  <Button onClick={() => setLocation("/")} className="flex-1 h-11 bg-cyan-400 text-black font-bold hover:bg-cyan-300 rounded-2xl">
                    Home
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
