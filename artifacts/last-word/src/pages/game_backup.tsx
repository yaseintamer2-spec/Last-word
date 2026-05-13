import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Home, X, Zap, Share2, Calendar } from "lucide-react";
import { useGameData, getRank } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { toast } from "sonner";
import { AdMob, RewardAdPluginEvents, AdMobRewardItem, InterstitialAdPluginEvents } from "@capacitor-community/admob";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { tryUnlock } from "@/lib/achievements";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  const matchId       = new URLSearchParams(search).get("matchId") ?? "";
  const isDaily = search.includes("mode=daily");
  const botCount = search.includes("type=1v1v1v1") ? 3 : search.includes("type=1v1v1") ? 2 : 1;
  const { scores, setScores } = useGameData();

  const [gameState, setGameState] = useState<GameState>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound]         = useState(1);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(3);
  const [canRevive, setCanRevive] = useState(true);

  // ── Multiplayer Elimination State ──────────────────────────────────────────
  type MpPlayer = { user_id: string; username: string; score: number; slot: number; isYou: boolean; isEliminated: boolean; pfp?: string };
  const [mpPlayers, setMpPlayers]   = useState<MpPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [turnPhase, setTurnPhase]   = useState<"focus" | "playing" | "result">("playing");
  const channelRef                  = useRef<RealtimeChannel | null>(null);

  const [paused, setPaused]       = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [combustion, setCombustion] = useState(0); // 0 = none, >0 = streak
  const guessStartTime            = useRef<number>(0);

  const [entry, setEntry]         = useState<WordEntry>({ word: "", hint: "" });
  const [revealed, setRevealed]   = useState(0);
  const [guess, setGuess]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback]   = useState<{ kind: "correct" | "wrong" | "slow"; points?: number; praise?: string } | null>(null);
  const [showHint, setShowHint]   = useState(true);

  // ── Multiplayer Real-Time Sync ───────────────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayer || !matchId || !user) return;

    // Load initial players
    supabase.from('match_players').select('*').eq('match_id', matchId).order('slot')
      .then(({ data }) => {
        if (data) setMpPlayers(data.map(p => ({ ...p, isYou: p.user_id === user.id, isEliminated: false })));
      });

    const channel = supabase.channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_state', filter: `match_id=eq.${matchId}` }, (payload) => {
        const s = payload.new;
        setActiveSlot(s.active_slot);
        setMpRound(s.current_round);
        setEntry({ word: s.word, hint: s.hint });
        setTurnPhase(s.phase);

        // If it's my turn, start playing
        if (s.phase === "playing" && s.active_slot === mpPlayers.find(p => p.isYou)?.slot) {
          beginRound(s.current_round);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` }, (payload) => {
        const p = payload.new;
        setMpPlayers(prev => prev.map(pl => pl.user_id === p.user_id ? { ...pl, score: p.score, isEliminated: p.is_eliminated } : pl));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [isMultiplayer, matchId, user]);

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

  const nextRound = useCallback(async () => {
    if (isDaily && round >= 1) { setGameState("GAME_OVER"); return; }

    if (isMultiplayer && matchId) {
      // Find next active player who isn't eliminated
      const survivors = mpPlayers.filter(p => !p.isEliminated);
      if (survivors.length <= 1) {
        setGameState("MATCH_OVER");
        return;
      }

      const currentIndex = survivors.findIndex(p => p.slot === activeSlot);
      const nextPlayer   = survivors[(currentIndex + 1) % survivors.length];
      const isNewRound   = nextPlayer.slot === survivors[0].slot;
      const nextRoundN   = isNewRound ? round + 1 : round;

      const tier = getTier(nextRoundN);
      const newEntry = pickWord(tier.pool);

      await supabase.from('match_state').update({
        active_slot: nextPlayer.slot,
        current_round: nextRoundN,
        word: newEntry.word,
        hint: newEntry.hint,
        phase: "focus",
        updated_at: new Date().toISOString()
      }).eq('match_id', matchId);

      // Brief cinematic pause before next turn
      setTimeout(async () => {
        await supabase.from('match_state').update({ phase: "playing" }).eq('match_id', matchId);
      }, 2000);

    } else {
      setRound((r) => { const nr = r + 1; roundRef.current = nr; beginRound(nr); return nr; });
    }
  }, [isDaily, round, beginRound, isMultiplayer, matchId, mpPlayers, activeSlot]);

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

  const handleLifeLoss = useCallback(async (kind: "wrong" | "slow") => {
    Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (kind === "wrong") { setFeedback({ kind: "wrong" }); setGameState("FEEDBACK"); }

    if (isMultiplayer && matchId) {
      // Instant elimination in multiplayer survival
      await supabase.from('match_players').update({ is_eliminated: true }).eq('user_id', user?.id).eq('match_id', matchId);

      const survivors = mpPlayers.filter(p => !p.isEliminated && p.user_id !== user?.id);
      if (survivors.length === 0) {
        setGameState("MATCH_OVER");
      } else {
        nextRound();
      }
      return;
    }

    const newLives = lives - 1;
    setLives(newLives);

    setTimeout(() => {
      if (newLives <= 0) {
        if (canRevive) setGameState("AD_REVIVE");
        else doEndGame();
      } else { nextRound(); }
    }, 1400);
  }, [lives, canRevive, doEndGame, nextRound, isMultiplayer, matchId, user, mpPlayers]);

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
    guessStartTime.current = Date.now();
    // Small delay to ensure input is mounted
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [gameState, revealed, entry.word]);

  const handleGuess = useCallback(async (char: string) => {
    setGuess((g) => {
      const next = g + char.toUpperCase();
      const targetSuffix = entry.word.slice(revealed).toUpperCase();

      if (next === targetSuffix.slice(0, next.length)) {
        if (next.length === targetSuffix.length) {
          const timeTaken = Date.now() - guessStartTime.current;
          const isFire = timeTaken < 1200;

          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
          let pts = calcPoints(revealed, entry.word.length, tierRef.current.mult);

          // Combustion multiplier
          if (combustion > 0) {
            pts *= 2; // Double points for being on fire
          }

          setFeedback({
            kind: "correct",
            points: pts,
            praise: isFire ? "COMBUSTION!" : getPraise(revealed / entry.word.length)
          });

          const newScore = score + pts;
          setScore(newScore);
          scoreRef.current = newScore;

          // Update combustion state for next round
          if (isFire) {
            setCombustion(prev => prev + 1);
            Vibrate.medium();
          } else {
            setCombustion(0);
          }

          if (isMultiplayer && matchId) {
             supabase.from('match_players').update({ score: newScore }).eq('user_id', user?.id).eq('match_id', matchId).then();
          }

          setGameState("FEEDBACK");
          setTimeout(() => nextRound(), 1400);
        }
        return next;
      } else {
        SFX.wrong();
        Vibrate.error();
        setCombustion(0);
        handleLifeLoss("wrong");
        return "";
      }
    });
  }, [entry.word, revealed, nextRound, handleLifeLoss, isMultiplayer, matchId, user, score, combustion]);

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
    const text = isMultiplayer
      ? `I just finished a Ranked Match in Last Word! 🔥 Current Rank: ${getRank(scores.rankScore).name}`
      : `I just scored ${score.toLocaleString()} points in Last Word! 🔥 Can you beat me?`;
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
    setScore(0); scoreRef.current = 0; setLives(3); setCanRevive(true); setRound(1); roundRef.current = 1;
    setMpPlayers([]); setActiveSlot(0); setTurnPhase("playing");
    beginRound(1);
  };

  const tier = getTier(round);
  const remaining = entry.word.length - revealed;

// ── Match Over Screen ─────────────────────────────────────────────────────────
function MatchOverScreen({
  playerScore, mpPlayers, onHome,
}: {
  playerScore: number; mpPlayers: any[];
  onHome: () => void;
}) {
  const { scores, setScores } = useGameData();
  const sorted = [...mpPlayers].sort((a, b) => b.score - a.score);
  const myRankPos = sorted.findIndex(p => p.isYou) + 1;
  const oldRP = scores.rankScore;
  const oldRank = getRank(oldRP);

  // Dynamic RP Scaling based on Rank and Placement
  const calculateRP = () => {
    const isNightmare = oldRank.name === "Nightmare";
    const isEmerald   = oldRank.name.includes("Emerald");
    const isDiamond   = oldRank.name.includes("Diamond");

    let base = [50, 20, -10, -30]; // Default (Bronze - Gold)

    if (isDiamond || isEmerald) {
        base = [60, 15, -25, -50]; // Mid-High Ranks
    } else if (isNightmare) {
        base = [70, 10, -40, -80]; // Nightmare
    }

    let change = base[myRankPos - 1] || -10;

    // Performance Bonus (MMR Simulation)
    if (myRankPos < sorted.length) {
        const nextPlayer = sorted[myRankPos];
        if (playerScore > nextPlayer.score * 1.25) change += 8;
    }

    return change;
  };

  const myRPChange = calculateRP();
  const newRP = Math.max(0, oldRP + myRPChange);
  const newRank = getRank(newRP);
  const isRankUp = newRank.min > oldRank.min;

  useEffect(() => {
    const bonusCoins = Math.floor(playerScore / 50) + (myRankPos === 1 ? 100 : myRankPos === 2 ? 50 : 0);
    setScores(prev => ({
        ...prev,
        rankScore: newRP,
        coins: prev.coins + bonusCoins
    }));
  }, []);

  // Progress Bar Logic (100 RP per tier)
  const currentTierRP = newRP % 100;
  const progressPercent = oldRank.name === "Nightmare" ? 100 : currentTierRP;

  const medals = ["🏆", "🥈", "🥉", "💀"];

  return (
    <motion.div
      key="matchover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl p-6 overflow-y-auto"
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8 py-10">

        {/* Rank Header Section */}
        <div className="text-center relative w-full">
          <AnimatePresence>
            {isRankUp && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-16 left-0 right-0 text-cyan-400 font-black text-xl tracking-[0.3em] uppercase italic"
              >
                RANK UP!
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-4xl font-black text-white/40 tracking-tighter uppercase mb-2">Match Results</h2>

          <div className="flex flex-col items-center gap-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 w-full shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent" />

             {/* Rank Icon and Name with Aura */}
             <motion.div
                animate={isRankUp ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                className="w-24 h-24 rounded-3xl bg-black/60 flex items-center justify-center border-2 border-white/10 z-10 p-4 relative"
                style={{ boxShadow: `0 0 40px ${newRank.aura || 'rgba(255,255,255,0.1)'}` }}
             >
                <div className="absolute inset-0 rounded-3xl blur-xl opacity-30 animate-pulse" style={{ backgroundColor: newRank.aura }} />
                <img src={newRank.icon} alt="" className="w-full h-full object-contain relative z-10" />
             </motion.div>

             <div className="z-10 text-center">
                <h3 className={`text-2xl font-black uppercase tracking-tighter ${newRank.color}`}>{newRank.name}</h3>
                <p className="text-sm font-mono text-white/40 mt-1">{newRP} TOTAL RP</p>
             </div>

             {/* Progression Bar */}
             <div className="w-full space-y-2 z-10 pt-2">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Progress</span>
                    <span className="text-xs font-mono font-bold text-violet-400">+{myRPChange} RP</span>
                </div>
                <div className="w-full h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5">
                    <motion.div
                        initial={{ width: `${(oldRP % 100)}%` }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-violet-700 to-violet-400 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                    />
                </div>
             </div>
          </div>
        </div>

      <div className="w-full max-w-sm flex flex-col gap-2.5">
        {sorted.map((p, i) => (
          <motion.div
            key={p.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + (i * 0.1) }}
            className={`flex items-center gap-4 px-5 py-4 rounded-[2rem] border transition-all ${
              p.isYou ? "bg-white/10 border-white/30 shadow-xl" : "bg-white/5 border-white/5 opacity-80"
            }`}
          >
            <span className="text-3xl w-10 text-center filter drop-shadow-md">{medals[i] || (i + 1)}</span>
            <div className="flex-1 min-w-0">
                <div className={`font-black text-base uppercase truncate tracking-tight ${p.isYou ? "text-cyan-400" : "text-white"}`}>
                    {p.username}
                </div>
                <div className="text-[11px] font-mono text-white/30 tracking-[0.2em] font-bold">
                    {p.score.toLocaleString()} SCORE
                </div>
            </div>
            {p.isYou && (
                <div className="flex flex-col items-end gap-1">
                    <div className="text-[8px] font-black bg-cyan-400 text-black px-2.5 py-1 rounded-full tracking-widest uppercase">YOU</div>
                </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="w-full max-w-sm">
        <Button onClick={onHome} className="w-full h-16 bg-white text-black font-black text-xl rounded-[2.5rem] hover:bg-cyan-400 active:scale-95 transition-all shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)]">
            CONTINUE
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── Render ────────────────────────────────────────────────────────────────────
  const activePlayer = mpPlayers.find(p => p.slot === activeSlot);
  const isMyTurn      = activePlayer?.isYou;

  return (
    <Layout>
      <motion.div
        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col w-full relative"
      >
        {/* Dynamic tier glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${TIER_COLORS[tier.tier].replace('text-', '')}15 0%, transparent 70%)`,
            opacity: ["TYPING", "GUESSING"].includes(gameState) ? 1 : 0
          }}
        />

        {/* Combustion Overlay */}
        <AnimatePresence>
          {combustion > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 80%)' }}
            >
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 border-[4px] border-orange-500/20"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/30 backdrop-blur-md z-20">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={`h-5 w-5 transition-all duration-300 ${i < lives ? "fill-red-500 text-red-500" : "text-white/10 fill-white/5"}`} />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xl font-mono font-bold tabular-nums">{score.toLocaleString()}</div>
            {combustion > 0 && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-1 text-orange-500"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span className="text-sm font-black italic">x{combustion + 1}</span>
              </motion.div>
            )}
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
             {isDaily && <div className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded">DAILY</div>}
             <div className="text-xs text-muted-foreground font-mono">Round {round}</div>
             <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BG[tier.tier]} ${TIER_COLORS[tier.tier]}`}>{tier.tier}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative">

          {/* ── Multiplayer Focus Overlay ────────────────────────────────────── */}
          <AnimatePresence>
            {isMultiplayer && (turnPhase === "focus" || !isMyTurn) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1.2, y: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-24 h-24 rounded-3xl border-2 border-cyan-400/50 bg-cyan-400/10 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                    {activePlayer?.pfp ? (
                      <img src={activePlayer.pfp} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-cyan-400">{(activePlayer?.username?.[0] ?? "?").toUpperCase()}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-mono text-cyan-400/60 uppercase tracking-widest">
                      {isMyTurn ? "Your Turn" : "Opponent Turn"}
                    </p>
                    <h2 className="text-3xl font-black text-white" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {activePlayer?.username}
                    </h2>
                  </div>
                </motion.div>

                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cyan-400"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Multiplayer End Screen ─────────────────────────────────────────── */}
          {gameState === "MATCH_OVER" && (
            <MatchOverScreen
              playerScore={score}
              mpPlayers={mpPlayers}
              onHome={() => setLocation("/")}
            />
          )}

          <AnimatePresence mode="wait">
            {gameState === "COUNTDOWN" && (
              <motion.div key="countdown" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black">{countdown > 0 ? countdown : "GO!"}</motion.div>
            )}

            {(gameState === "TYPING" || gameState === "GUESSING" || gameState === "FEEDBACK") && (
              <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full">
                <div className="text-xs font-mono text-muted-foreground/60">{entry.hint}</div>
                <div className="flex gap-2">
                  {entry.word.split("").map((char, idx) => {
                    const isRevealed = idx < revealed;
                    const guessIdx   = idx - revealed;
                    // letters currently in the 'guess' string
                    const isGuessed  = !isRevealed && guessIdx >= 0 && guessIdx < guess.length;

                    let cls = "w-12 h-16 flex items-center justify-center border-2 rounded-xl font-mono font-bold text-2xl transition-all duration-150 ";
                    if (isRevealed) {
                      cls += "border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]";
                    } else if (isGuessed) {
                      if (combustion > 0) {
                        cls += "border-orange-500 bg-orange-500/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.5)]";
                      } else {
                        cls += "border-violet-400 bg-violet-400/10 text-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.2)]";
                      }
                    } else {
                      cls += "border-white/10 text-transparent";
                    }

                    return (
                      <motion.div
                        key={idx}
                        initial={false}
                        animate={isGuessed ? { scale: [1, 1.1, 1], y: [0, -4, 0] } : {}}
                        className={cls}
                      >
                        {isRevealed ? char : (isGuessed ? guess[guessIdx] : "")}
                      </motion.div>
                    );
                  })}
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
                      spellCheck="false"
                      className="absolute opacity-0 w-1 h-1 pointer-events-none"
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const val = e.currentTarget.value;
                        if (!val) return;
                        // Handle multiple chars (like if they paste or swipe)
                        const char = val[val.length - 1].toUpperCase();
                        if (/^[A-Z]$/.test(char)) {
                          handleGuess(char);
                        }
                        e.currentTarget.value = ""; // Always reset
                      }}
                    />
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={() => inputRef.current?.focus()}
                      className="w-full max-w-[220px] h-14 rounded-2xl bg-cyan-500 text-black font-black flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95 transition-transform"
                    >
                      <Zap className="h-5 w-5 fill-current" /> TAP TO TYPE
                    </motion.button>
                    <div className="flex gap-4">
                      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">
                        {remaining} chars left
                      </div>
                      {guess.length > 0 && (
                        <button
                          onClick={() => setGuess("")}
                          className="text-[10px] font-mono text-red-400 uppercase underline tracking-widest"
                        >
                          Clear
                        </button>
                      )}
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
