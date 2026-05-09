import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Home, X, Zap, Share2, Calendar } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { toast } from "sonner";
import { AdMob, RewardAdPluginEvents, AdMobRewardItem, InterstitialAdPluginEvents } from "@capacitor-community/admob";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor-community/share";
import { tryUnlock } from "@/lib/achievements";
import { Share } from "@capacitor/share";

// ── Ad Unit IDs ───────────────────────────────────────────────────────────────
const REWARDED_AD_ID     = "ca-app-pub-1445407957198527/6949268913"; // revive life
const INTERSTITIAL_AD_ID = "ca-app-pub-1445407957198527/6095352248"; // between rounds

// ── SFX/Vibrate placeholders ──────────────────────────────────────────────────
const SFX = {
  wrong: () => {},
  correct: () => {},
};
const Vibrate = {
  error: () => Haptics.notification({ type: NotificationType.Error }).catch(() => {}),
  success: () => Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  medium: () => Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
};

// ── Word pool ─────────────────────────────────────────────────────────────────
type WordEntry = { word: string; hint: string };

const EASY_WORDS: WordEntry[] = [
  { word: "EAGLE",  hint: "Hunts from above" },
  { word: "TIGER",  hint: "Orange stripes" },
  { word: "JAPAN",  hint: "Rising sun flag" },
  { word: "PIZZA",  hint: "Sliced in triangles" },
  { word: "RIVER",  hint: "Always moving forward" },
  { word: "PIANO",  hint: "88 keys" },
  { word: "CLOUD",  hint: "Floats overhead" },
  { word: "STORM",  hint: "Thunder follows lightning" },
  { word: "GRAPE",  hint: "Grows in clusters" },
  { word: "SHARK",  hint: "Never stops swimming" },
];

const MEDIUM_WORDS: WordEntry[] = [
  { word: "CASTLE",  hint: "Drawbridge and moat" },
  { word: "BRAZIL",  hint: "Largest in South America" },
  { word: "SALMON",  hint: "Swims upstream to return" },
  { word: "GARDEN",  hint: "Needs regular watering" },
];

const HARD_WORDS: WordEntry[] = [
  { word: "ABANDON",  hint: "Leave without looking back" },
  { word: "BALCONY",  hint: "Open-air elevated platform" },
  { word: "CABINET",  hint: "Government or furniture" },
];

const INSANE_WORDS: WordEntry[] = [
  { word: "ABSOLUTE",  hint: "No exceptions whatsoever" },
  { word: "ALPHABET",  hint: "26 in English" },
  { word: "AMBITION",  hint: "Drives people to the top" },
];

// ── Tiers ─────────────────────────────────────────────────────────────────────
type Tier = "EASY" | "MEDIUM" | "HARD" | "INSANE";
type GameState =
  | "COUNTDOWN" | "TYPING" | "GUESSING" | "FEEDBACK"
  | "AD_REVIVE" | "INTERSTITIAL" | "MATCH_OVER" | "GAME_OVER";

const TIERS = [
  { tier: "EASY"   as Tier, rounds: [1, 5]    as [number, number], speed: 580, pool: "easy",   mult: 1.0 },
  { tier: "MEDIUM" as Tier, rounds: [6, 15]   as [number, number], speed: 360, pool: "medium", mult: 2.0 },
  { tier: "HARD"   as Tier, rounds: [16, 30]  as [number, number], speed: 210, pool: "hard",   mult: 3.5 },
  { tier: "INSANE" as Tier, rounds: [31, 999] as [number, number], speed: 115, pool: "insane", mult: 6.0 },
];

const TIER_COLORS: Record<Tier, string> = {
  EASY:   "text-emerald-400",
  MEDIUM: "text-yellow-400",
  HARD:   "text-orange-400",
  INSANE: "text-red-400",
};

const TIER_BG: Record<Tier, string> = {
  EASY:   "bg-emerald-500/10 border-emerald-500/30",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/30",
  HARD:   "bg-orange-500/10 border-orange-500/30",
  INSANE: "bg-red-500/10 border-red-500/30",
};

const POOL: Record<string, WordEntry[]> = {
  easy: EASY_WORDS, medium: MEDIUM_WORDS, hard: HARD_WORDS, insane: INSANE_WORDS,
};

const MP_TOTAL = 10;
const BOT_COLORS = ["bg-violet-500", "bg-orange-500", "bg-pink-500"];
const BOT_NAMES  = ["NeonNinja",     "SpeedDemon",    "GhostWord"  ];

const PRAISE: { maxRatio: number; lines: string[] }[] = [
  { maxRatio: 0.00, lines: ["PSYCHIC!",   "MINDREAD!",   "IMPOSSIBLE!"] },
  { maxRatio: 0.18, lines: ["FLAWLESS!",  "GENIUS!",     "INCREDIBLE!"] },
  { maxRatio: 0.38, lines: ["SHARP!",     "EXCELLENT!",  "BRILLIANT!"]  },
  { maxRatio: 0.55, lines: ["GREAT!",     "NICE ONE!",   "SOLID!"]      },
  { maxRatio: 0.72, lines: ["GOOD!",      "KEEP IT UP!", "WELL DONE!"]  },
  { maxRatio: 1.00, lines: ["CLOSE ONE!", "JUST IN TIME!", "MADE IT!"]  },
];

function getPraise(ratio: number): string {
  const t = PRAISE.find((p) => ratio <= p.maxRatio) ?? PRAISE[PRAISE.length - 1];
  return t.lines[Math.floor(Math.random() * t.lines.length)];
}

function calcPoints(revealed: number, wordLen: number, mult: number): number {
  const ratio = revealed / wordLen;
  const bonus  = Math.pow(1 - ratio, 2);
  return Math.max(10, Math.floor(wordLen * 150 * bonus * mult));
}

function getTier(round: number) {
  return TIERS.find((t) => round >= t.rounds[0] && round <= t.rounds[1]) ?? TIERS[3];
}

function pickWord(pool: string, isDaily: boolean = false): WordEntry {
  const words = POOL[pool];
  if (isDaily) {
    const day = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < day.length; i++) hash = ((hash << 5) - hash) + day.charCodeAt(i);
    return words[Math.abs(hash) % words.length];
  }
  return words[Math.floor(Math.random() * words.length)];
}

export default function Game() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isMultiplayer = search.includes("mode=multiplayer");
  const isDaily = search.includes("mode=daily");
  const botCount = search.includes("type=1v1v1v1") ? 3 : search.includes("type=1v1v1") ? 2 : 1;
  const { scores, setScores } = useGameData();

  const [gameState, setGameState] = useState<GameState>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound]         = useState(1);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(3);
  const [canRevive, setCanRevive] = useState(true);
  const [paused, setPaused]       = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [entry, setEntry]         = useState<WordEntry>({ word: "", hint: "" });
  const [revealed, setRevealed]   = useState(0);
  const [guess, setGuess]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback]   = useState<{ kind: "correct" | "wrong" | "slow"; points?: number; praise?: string } | null>(null);
  const [showHint, setShowHint]   = useState(true);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tierRef = useRef(getTier(1));
  const scoreRef = useRef(0);
  const roundRef = useRef(1);

  const clearTyping = () => { if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; } };

  const beginRound = useCallback((r: number) => {
    const tier = getTier(r);
    tierRef.current = tier;
    setEntry(pickWord(tier.pool, isDaily));
    setRevealed(0);
    setGuess("");
    setFeedback(null);
    setShowHint(true);
    setCountdown(3);
    setGameState("COUNTDOWN");
  }, [isDaily]);

  const nextRound = useCallback(() => {
    if (isDaily && round >= 1) { setGameState("GAME_OVER"); return; }
    setRound((r) => { const nr = r + 1; roundRef.current = nr; beginRound(nr); return nr; });
  }, [isDaily, round, beginRound]);

  const doEndGame = useCallback(() => {
    setGameState("GAME_OVER");

    // Check for achievements
    const checks = ["first_blood", "games_10"];
    if (scoreRef.current >= 5000) checks.push("score_5k");
    if (scoreRef.current >= 20000) checks.push("score_20k");
    if (roundRef.current >= 31) checks.push("insane_entry");

    checks.forEach(id => {
      const unlocked = tryUnlock(id);
      if (unlocked) {
        toast.success(`Achievement Unlocked: ${unlocked.title}`, {
          description: unlocked.desc,
          icon: unlocked.icon,
        });
      }
    });

    setScores((prev) => ({
      ...prev,
      highScore: scoreRef.current > prev.highScore ? scoreRef.current : prev.highScore,
      totalPoints: prev.totalPoints + scoreRef.current,
      gamesPlayed: prev.gamesPlayed + 1,
      roundRecord: Math.max(prev.roundRecord, roundRef.current),
    }));
  }, [setScores]);

  const handleLifeLoss = useCallback((kind: "wrong" | "slow") => {
    Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (kind === "wrong") { setFeedback({ kind: "wrong" }); setGameState("FEEDBACK"); }
    const newLives = lives - 1;
    setLives(newLives);

    setTimeout(() => {
      if (newLives <= 0) {
        if (canRevive) setGameState("AD_REVIVE");
        else doEndGame();
      } else { nextRound(); }
    }, 1400);
  }, [lives, canRevive, doEndGame, nextRound]);

  useEffect(() => {
    if (gameState !== "COUNTDOWN" || paused) return;
    if (countdown <= 0) { setGameState("TYPING"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [gameState, countdown, paused]);

  useEffect(() => {
    if (gameState !== "TYPING" || paused) return;
    clearTyping();
    if (revealed >= entry.word.length) {
      setFeedback({ kind: "slow" });
      setGameState("FEEDBACK");
      setTimeout(() => handleLifeLoss("slow"), 1500);
      return;
    }
    typingTimer.current = setTimeout(() => setRevealed((r) => r + 1), tierRef.current.speed);
    return clearTyping;
  }, [gameState, revealed, entry.word, paused, handleLifeLoss]);

  const handleStop = useCallback(() => {
    if (gameState !== "TYPING" || revealed >= entry.word.length) return;
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    clearTyping();
    setGameState("GUESSING");
    // Small delay to ensure input is mounted
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [gameState, revealed, entry.word]);

  const handleGuess = useCallback((char: string) => {
    setGuess((g) => {
      const next = g + char.toUpperCase();
      const targetSuffix = entry.word.slice(revealed).toUpperCase();

      if (next === targetSuffix.slice(0, next.length)) {
        if (next.length === targetSuffix.length) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          const pts = calcPoints(revealed, entry.word.length, tierRef.current.mult);
          setFeedback({ kind: "correct", points: pts, praise: getPraise(revealed / entry.word.length) });
          setScore((s) => { scoreRef.current = s + pts; return s + pts; });
          setGameState("FEEDBACK");
          setTimeout(() => nextRound(), 1400);
        }
        return next;
      } else {
        SFX.wrong();
        Vibrate.error();
        handleLifeLoss("wrong");
        return "";
      }
    });
  }, [entry.word, revealed, nextRound, handleLifeLoss]);

  useEffect(() => {
    if (gameState !== "GUESSING" || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") setGuess((g) => g.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key)) {
        handleGuess(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, paused, handleGuess]);

  const handleShare = async () => {
    const text = `I just scored ${score.toLocaleString()} points in Last Word! 🔥 Can you beat me?`;
    try {
      await Share.share({
        title: 'Last Word High Score',
        text: text,
        url: 'https://play.google.com/store/apps/details?id=com.lastword.app',
        dialogTitle: 'Share with friends',
      });
      tryUnlock("shared");
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  useEffect(() => { beginRound(1); }, []);

  const restartGame = () => {
    setScore(0); scoreRef.current = 0; setLives(3); setCanRevive(true); setRound(1); roundRef.current = 1; beginRound(1);
  };

  const tier = getTier(round);
  const remaining = entry.word.length - revealed;

  return (
    <Layout>
      <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="flex-1 flex flex-col w-full relative">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={`h-5 w-5 transition-all duration-300 ${i < lives ? "fill-red-500 text-red-500" : "text-white/10 fill-white/5"}`} />
            ))}
          </div>
          <div className="text-xl font-mono font-bold tabular-nums">{score.toLocaleString()}</div>
          <div className="text-right flex flex-col items-end gap-0.5">
             {isDaily && <div className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded">DAILY</div>}
             <div className="text-xs text-muted-foreground font-mono">Round {round}</div>
             <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BG[tier.tier]} ${TIER_COLORS[tier.tier]}`}>{tier.tier}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative">
          <AnimatePresence mode="wait">
            {gameState === "COUNTDOWN" && (
              <motion.div key="countdown" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black">{countdown > 0 ? countdown : "GO!"}</motion.div>
            )}

            {(gameState === "TYPING" || gameState === "GUESSING" || gameState === "FEEDBACK") && (
              <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full">
                <div className="text-xs font-mono text-muted-foreground/60">{entry.hint}</div>
                <div className="flex gap-2">
                  {entry.word.split("").map((char, idx) => (
                    <div key={idx} className={`w-12 h-16 flex items-center justify-center border-2 rounded-xl font-mono font-bold text-2xl ${idx < revealed ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" : "border-white/10 text-transparent"}`}>
                      {idx < revealed ? char : (idx - revealed < guess.length ? guess[idx-revealed] : "")}
                    </div>
                  ))}
                </div>
                {gameState === "TYPING" && <Button onClick={handleStop} className="w-32 h-32 rounded-full bg-red-600 text-white font-black text-2xl shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-90 transition-transform">STOP</Button>}
                {gameState === "GUESSING" && (
                  <div className="flex flex-col items-center gap-6 w-full">
                    {/* HIDDEN INPUT FOR MOBILE KEYBOARD */}
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      className="absolute opacity-0 w-1 h-1 pointer-events-none"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        handleGuess(val[val.length - 1]);
                        e.target.value = ""; // Reset to keep listening
                      }}
                    />
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={() => inputRef.current?.focus()}
                      className="w-full max-w-[200px] h-12 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse"
                    >
                      <Zap className="h-4 w-4 fill-current" /> TAP TO TYPE
                    </motion.button>
                    <div className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
                      {remaining} letters remaining
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {gameState === "GAME_OVER" && (
              <motion.div key="gameover" className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
                <h2 className="text-5xl font-black text-red-400">{isDaily ? "FINISHED" : "GAME OVER"}</h2>
                <div className="grid grid-cols-2 gap-3 w-full">
                   <div className="bg-white/5 p-4 rounded-2xl"><div className="text-xs text-muted-foreground">Score</div><div className="text-2xl font-bold">{score.toLocaleString()}</div></div>
                   <div className="bg-white/5 p-4 rounded-2xl"><div className="text-xs text-muted-foreground">Best</div><div className="text-2xl font-bold">{scores.highScore.toLocaleString()}</div></div>
                </div>
                <Button onClick={handleShare} className="w-full h-12 bg-emerald-500 font-bold"><Share2 className="mr-2" /> Share Result</Button>
                {!isDaily && <Button onClick={restartGame} className="w-full h-12 bg-cyan-400 text-black font-bold">Play Again</Button>}
                <Button variant="outline" onClick={() => setLocation("/")} className="w-full h-12 border-white/10">Home</Button>
              </motion.div>
            )}

            {/* Ad Revive */}
            {gameState === "AD_REVIVE" && (
              <AdReviveModal
                onDecline={doEndGame}
                onRevive={() => {
                  setLives(1);
                  setCanRevive(false);
                  nextRound();
                }}
              />
            )}

            {/* Interstitial ad */}
            {gameState === "INTERSTITIAL" && (
              <InterstitialAd onDone={doEndGame} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Layout>
  );
}

// ── Ad Components ─────────────────────────────────────────────────────────────

function InterstitialAd({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    async function show() {
      try {
        // SET TO FALSE FOR REAL ADS
        await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: false });
        const loadedH = await AdMob.addListener(InterstitialAdPluginEvents.Loaded, async () => {
          await AdMob.showInterstitial();
        });
        const dismissedH = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          loadedH.remove(); dismissedH.remove(); onDone();
        });
        const failedH = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
          loadedH.remove(); dismissedH.remove(); failedH.remove(); onDone();
        });
      } catch { onDone(); }
    }
    show();
  }, [onDone]);
  return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">Loading...</div>;
}

function AdReviveModal({ onDecline, onRevive }: { onDecline: () => void; onRevive: () => void }) {
  const [loading, setLoading] = useState(false);

  async function showRewarded() {
    setLoading(true);
    try {
      // SET TO FALSE FOR REAL ADS
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: false });
      const rewardH = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        onRevive();
      });
      const dismissedH = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        rewardH.remove(); dismissedH.remove();
      });
      const failedH = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        rewardH.remove(); dismissedH.remove(); failedH.remove(); setLoading(false);
      });
      await AdMob.showRewardVideoAd();
    } catch { setLoading(false); }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm flex flex-col gap-4 text-center">
        <h3 className="text-2xl font-black">Continue?</h3>
        <p className="text-sm text-muted-foreground">Watch an ad to get 1 life back.</p>
        <Button onClick={showRewarded} disabled={loading} className="h-12 bg-cyan-400 text-black font-bold">
          {loading ? "Loading..." : "Watch Ad to Revive"}
        </Button>
        <Button variant="outline" onClick={onDecline} className="h-10 border-white/10">No Thanks</Button>
      </div>
    </div>
  );
}
