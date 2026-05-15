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

const USED_WORDS = new Set<string>();

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

const SLANG_WORDS: WordEntry[] = [
  { word: "NOOB",   hint: "Inexperienced player" },
  { word: "GOAT",   hint: "Greatest of all time" },
  { word: "CAP",    hint: "That's a lie" },
  { word: "BET",    hint: "I agree / challenge accepted" },
  { word: "SUS",    hint: "Very suspicious" },
  { word: "RIZZ",   hint: "Charisma / attraction" },
  { word: "SKIBIDI",hint: "Brain rot meme" },
  { word: "BRUH",   hint: "Disbelief expression" },
  { word: "YEET",   hint: "Throw with force" },
  { word: "VIBE",   hint: "Atmosphere or mood" },
];

const POOL: Record<string, WordEntry[]> = {
  easy: [...EASY_WORDS, ...SLANG_WORDS],
  medium: [...EASY_WORDS, ...SLANG_WORDS],
  hard: [...EASY_WORDS, ...SLANG_WORDS],
  insane: [...EASY_WORDS, ...SLANG_WORDS],
};

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

function calcPoints(revealed: number, wordLen: number, mult: number): number {
  const ratio = revealed / wordLen;
  const bonus  = Math.pow(1 - ratio, 2);
  return Math.max(10, Math.floor(wordLen * 150 * bonus * mult));
}

function getTier(round: number) {
  return TIERS.find((t) => round >= t.rounds[0] && round <= t.rounds[1]) ?? TIERS[3];
}

function pickWord(pool: string): WordEntry {
  const words = POOL[pool] || EASY_WORDS;
  const available = words.filter(w => !USED_WORDS.has(w.word));

  if (available.length === 0) {
      USED_WORDS.clear(); // Reset if all words used
      return words[Math.floor(Math.random() * words.length)];
  }

  const selected = available[Math.floor(Math.random() * available.length)];
  USED_WORDS.add(selected.word);
  return selected;
}

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

  const calculateRP = () => {
    const isNightmare = oldRank.name === "Nightmare";
    const isEmerald   = oldRank.name.includes("Emerald");
    const isDiamond   = oldRank.name.includes("Diamond");

    let base = [50, 20, -10, -30];
    if (isDiamond || isEmerald) base = [60, 15, -25, -50];
    else if (isNightmare) base = [70, 10, -40, -80];

    let change = base[myRankPos - 1] || -10;
    if (myRankPos < sorted.length && playerScore > sorted[myRankPos].score * 1.25) change += 8;
    return change;
  };

  const myRPChange = calculateRP();
  const newRP = Math.max(0, oldRP + myRPChange);
  const newRank = getRank(newRP);
  const isRankUp = newRank.min > oldRank.min;

  useEffect(() => {
    const bonusCoins = Math.floor(playerScore / 50) + (myRankPos === 1 ? 100 : myRankPos === 2 ? 50 : 0);
    setScores(prev => ({ ...prev, rankScore: newRP, coins: prev.coins + bonusCoins }));
  }, []);

  const progressPercent = newRP % 100;
  const medals = ["🏆", "🥈", "🥉", "💀"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl p-6 overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 py-10">
        <div className="text-center relative w-full">
          <AnimatePresence>{isRankUp && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-16 left-0 right-0 text-cyan-400 font-black text-xl tracking-[0.3em] uppercase italic">RANK UP!</motion.div>}</AnimatePresence>
          <h2 className="text-4xl font-black text-white/40 tracking-tighter uppercase mb-2">Match Results</h2>
          <div className="flex flex-col items-center gap-4 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 w-full shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent" />
             <motion.div animate={isRankUp ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}} className="w-28 h-28 rounded-full flex items-center justify-center z-10 p-2 relative" style={{ boxShadow: `0 0 40px ${newRank.aura || 'rgba(255,255,255,0.1)'}` }}>
                <div className="absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse" style={{ backgroundColor: newRank.aura }} />
                <img src={newRank.icon} alt="" className="w-full h-full object-contain relative z-10" />
             </motion.div>
             <div className="z-10 text-center">
                <h3 className={`text-2xl font-black uppercase tracking-tighter ${newRank.color}`}>{newRank.name}</h3>
                <p className="text-sm font-mono text-white/40 mt-1">{newRP} TOTAL RP</p>
             </div>
             <div className="w-full space-y-2 z-10 pt-2">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Progress</span>
                    <span className="text-xs font-mono font-bold text-violet-400">+{myRPChange} RP</span>
                </div>
                <div className="w-full h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden p-0.5">
                    <motion.div initial={{ width: `${(oldRP % 100)}%` }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }} className="h-full bg-gradient-to-r from-violet-700 to-violet-400 rounded-full" />
                </div>
             </div>
          </div>
        </div>
        <div className="w-full flex flex-col gap-2">
          {sorted.map((p, i) => (
            <div key={p.user_id} className={`flex items-center gap-4 px-5 py-3 rounded-2xl border ${p.isYou ? "bg-cyan-400/10 border-cyan-400/30" : "bg-white/5 border-white/5"}`}>
              <span className="text-xl w-8 text-center">{medals[i] || (i + 1)}</span>
              <div className="flex-1 min-w-0"><div className={`font-black text-sm uppercase truncate ${p.isYou ? "text-cyan-400" : "text-white/80"}`}>{p.username}</div><div className="text-[9px] font-mono text-white/20 tracking-widest font-bold">{p.score.toLocaleString()} PTS</div></div>
              {p.isYou && <div className="text-[8px] font-black bg-cyan-400 text-black px-2 py-0.5 rounded-full uppercase tracking-tighter">YOU</div>}
            </div>
          ))}
        </div>
        <Button onClick={onHome} className="w-full h-16 bg-white text-black font-black text-xl rounded-[2rem] shadow-xl">CONTINUE</Button>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Game() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isMultiplayer = search.includes("mode=multiplayer");
  const matchId       = new URLSearchParams(search).get("matchId") ?? "";
  const isDaily = search.includes("mode=daily");
  const { user, scores, setScores } = useGameData();

  const [gameState, setGameState] = useState<GameState>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound]         = useState(1);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(3);
  const [canRevive, setCanRevive] = useState(true);
  const [extraTime, setExtraTime] = useState(5); // 5 seconds available per match

  type MpPlayer = { user_id: string; username: string; score: number; slot: number; isYou: boolean; isEliminated: boolean; badge: string; pfp?: string };
  const [mpPlayers, setMpPlayers]   = useState<MpPlayer[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [turnPhase, setTurnPhase]   = useState<"focus" | "playing" | "result">("playing");
  const [mpRound, setMpRound]       = useState(1);
  const channelRef                  = useRef<RealtimeChannel | null>(null);

  const [paused, setPaused]       = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [combustion, setCombustion] = useState(0);
  const guessStartTime            = useRef<number>(0);

  const [entry, setEntry]         = useState<WordEntry>({ word: "", hint: "" });
  const [revealed, setRevealed]   = useState(0);
  const [guess, setGuess]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback]   = useState<{ kind: "correct" | "wrong" | "slow"; points?: number; praise?: string } | null>(null);

  useEffect(() => {
    if (!isMultiplayer || !matchId || !user) return;
    supabase.from('match_players').select('*').eq('match_id', matchId).order('slot').then(({ data }) => {
        if (data) setMpPlayers(data.map(p => ({ ...p, isYou: p.user_id === user.id, isEliminated: false })));
    });
    const channel = supabase.channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_state', filter: `match_id=eq.${matchId}` }, (payload) => {
        const s = payload.new;
        if (s.status === "finished") {
            setGameState("MATCH_OVER");
            return;
        }
        setActiveSlot(s.active_slot);
        setMpRound(s.current_round);
        setEntry({ word: s.word, hint: s.hint });
        setTurnPhase(s.phase);
        if (s.phase === "playing" && s.active_slot === mpPlayers.find(p => p.isYou)?.slot) beginRound(s.current_round);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_players', filter: `match_id=eq.${matchId}` }, (payload) => {
        const p = payload.new;
        setMpPlayers(prev => prev.map(pl => pl.user_id === p.user_id ? { ...pl, score: p.score, isEliminated: p.is_eliminated } : pl));
      }).subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [isMultiplayer, matchId, user, mpPlayers]);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tierRef = useRef(getTier(1));
  const scoreRef = useRef(0);

  const clearTyping = () => { if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; } };

  const beginRound = useCallback((r: number) => {
    const tier = getTier(r);
    tierRef.current = tier;
    if (!isMultiplayer) setEntry(pickWord(tier.pool));
    setRevealed(0); setGuess(""); setFeedback(null); setCountdown(3); setGameState("COUNTDOWN");
  }, [isMultiplayer]);

  const nextRound = useCallback(async () => {
    if (isDaily && round >= 1) { setGameState("GAME_OVER"); return; }
    if (isMultiplayer && matchId) {
      // Fetch fresh survivor list to avoid stale state
      const { data: players } = await supabase.from('match_players').select('*').eq('match_id', matchId);
      if (!players) return;

      const survivors = players.filter(p => !p.is_eliminated).sort((a, b) => a.slot - b.slot);

      if (survivors.length <= 1) {
        await supabase.from('match_state').update({ status: "finished" }).eq('match_id', matchId);
        return;
      }

      const currentIndex = survivors.findIndex(p => p.slot === activeSlot);
      const nextPlayer   = survivors[(currentIndex + 1) % survivors.length];
      const isNewRound   = nextPlayer.slot === survivors[0].slot;
      const nextRoundN   = isNewRound ? mpRound + 1 : mpRound;

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

      setTimeout(async () => {
        await supabase.from('match_state').update({ phase: "playing" }).eq('match_id', matchId);
      }, 2000);
    } else {
      setRound((r) => { const nr = r + 1; beginRound(nr); return nr; });
    }
  }, [isDaily, round, beginRound, isMultiplayer, matchId, activeSlot]);

  const handleLifeLoss = useCallback(async (kind: "wrong" | "slow") => {
    Vibrate.error(); setIsShaking(true); setTimeout(() => setIsShaking(false), 500);
    if (kind === "wrong") { setFeedback({ kind: "wrong" }); setGameState("FEEDBACK"); }

    if (isMultiplayer && matchId) {
      await supabase.from('match_players').update({ is_eliminated: true }).eq('user_id', user?.id).eq('match_id', matchId);

      // Short delay to allow DB update to propagate slightly if needed, but nextRound now fetches fresh
      setTimeout(() => nextRound(), 1000);
      return;
    }
    const newLives = lives - 1; setLives(newLives);
    setTimeout(() => { if (newLives <= 0) { if (canRevive) setGameState("AD_REVIVE"); else setGameState("GAME_OVER"); } else { nextRound(); } }, 1400);
  }, [lives, canRevive, nextRound, isMultiplayer, matchId, user]);

  useEffect(() => {
    if (gameState !== "COUNTDOWN" || paused) return;
    if (countdown <= 0) { setGameState("TYPING"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [gameState, countdown, paused]);

  useEffect(() => {
    if (gameState !== "TYPING" || paused) return;
    clearTyping();
    if (revealed >= entry.word.length) { setFeedback({ kind: "slow" }); setGameState("FEEDBACK"); setTimeout(() => handleLifeLoss("slow"), 1500); return; }
    typingTimer.current = setTimeout(() => setRevealed((r) => r + 1), tierRef.current.speed);
    return clearTyping;
  }, [gameState, revealed, entry.word, paused, handleLifeLoss]);

  const handleUseTime = () => {
    if (gameState !== "TYPING" || extraTime <= 0) return;
    Vibrate.medium();
    setExtraTime(prev => prev - 1);
    // Add 1 second to typing phase by delaying the reveal interval
    clearTyping();
    typingTimer.current = setTimeout(() => setRevealed((r) => r + 1), tierRef.current.speed + 1000);
  };

  const handleStop = useCallback(() => {
    if (gameState !== "TYPING" || revealed >= entry.word.length) return;
    Vibrate.medium(); clearTyping(); setGameState("GUESSING");
    guessStartTime.current = Date.now();
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
          Vibrate.success();
          let pts = calcPoints(revealed, entry.word.length, tierRef.current.mult);

          const earnedCoins = 10 + (isFire ? 5 : 0);
          if (combustion > 0) pts *= 2;

          setFeedback({ kind: "correct", points: pts, praise: isFire ? "COMBUSTION!" : "GOOD!" });
          setScore((s) => { scoreRef.current = s + pts; return s + pts; });
          setScores(prev => ({ ...prev, coins: prev.coins + earnedCoins }));

          if (isFire) setCombustion(prev => prev + 1); else setCombustion(0);
          if (isMultiplayer && matchId) supabase.from('match_players').update({ score: scoreRef.current }).eq('user_id', user?.id).eq('match_id', matchId).then();
          setGameState("FEEDBACK");
          setTimeout(() => nextRound(), 1400);
        }
        return next;
      } else {
        setCombustion(0); handleLifeLoss("wrong"); return "";
      }
    });
  }, [entry.word, revealed, nextRound, handleLifeLoss, isMultiplayer, matchId, user, combustion, setScores]);

  useEffect(() => {
    if (gameState !== "GUESSING" || paused) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Backspace") setGuess((g) => g.slice(0, -1)); else if (/^[a-zA-Z]$/.test(e.key)) handleGuess(e.key); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [gameState, paused, handleGuess]);

  const handleShare = async () => {
    const rank = getRank(scores.rankScore);
    const text = `I'm ranked ${rank.name} in Last Letter! 🔥 Can you beat my level?`;
    try {
      await Share.share({ title: 'Last Letter Global Rank', text, url: 'https://play.google.com/store/apps/details?id=com.lastword.app', dialogTitle: 'Share with friends' });
      tryUnlock("shared");
    } catch (err) { console.warn('Share error:', err); }
  };

  useEffect(() => { beginRound(1); }, [beginRound]);

  const restartGame = async () => {
    // Show interstitial after match ends
    try {
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: false });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn("Interstitial failed", e);
    }

    USED_WORDS.clear();
    setScore(0); setLives(3); setCanRevive(true); setRound(1); setExtraTime(5);
    setMpPlayers([]); setActiveSlot(0); setTurnPhase("playing");
    beginRound(1);
  };

  const handleBackToHome = async () => {
    try {
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: false });
      await AdMob.showInterstitial();
    } catch (e) {
      console.warn("Interstitial failed", e);
    }
    setLocation("/");
  };

  const activePlayer = mpPlayers.find(p => p.slot === activeSlot);
  const isMyTurn      = activePlayer?.isYou;

  return (
    <Layout>
      <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} className="flex-1 flex flex-col w-full relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.05) 0%, transparent 70%)`, opacity: ["TYPING", "GUESSING"].includes(gameState) ? 1 : 0 }} />
        {combustion > 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 pointer-events-none z-10" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 80%)' }} />}

        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/30 backdrop-blur-md z-20">
          <div className="flex items-center gap-1.5">{Array.from({ length: 3 }).map((_, i) => (<Heart key={i} className={`h-5 w-5 ${i < lives ? "fill-red-500 text-red-500" : "text-white/10 fill-white/5"}`} />))}</div>
          <div className="flex items-center gap-4">
            <div className="text-xl font-mono font-bold text-white">{score.toLocaleString()}</div>
            {combustion > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-orange-500"><Zap className="h-4 w-4 fill-current" /><span className="text-sm font-black">x{combustion + 1}</span></motion.div>}
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
             <div className="text-xs text-muted-foreground font-mono">Round {isMultiplayer ? mpRound : round}</div>
             <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border ${TIER_BG[getTier(isMultiplayer ? mpRound : round).tier]} ${TIER_COLORS[getTier(isMultiplayer ? mpRound : round).tier]}`}>{getTier(isMultiplayer ? mpRound : round).tier}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative">
          {isMultiplayer && (turnPhase === "focus" || !isMyTurn) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl">

              {/* Profile Focus with Ring */}
              <div className="relative mb-12">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-40 h-40 rounded-full border-4 border-cyan-400/50 bg-black/40 flex flex-col items-center justify-center overflow-hidden shadow-[0_0_60px_rgba(34,211,238,0.2)] relative"
                  >
                    <img src={activePlayer?.pfp || "https://t4.ftcdn.net/jpg/00/64/67/63/360_F_64676383_LdbmhiNM6Ypzb3FM4PPuFP9rHe7ri8Ju.jpg"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-6 text-[11px] font-black text-cyan-400 tracking-[0.2em] uppercase">{(activePlayer?.badge ?? "Guest")}</span>
                  </motion.div>

                  {/* Rotating Orbit effect around player */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 border border-dashed border-white/10 rounded-full"
                  />
              </div>

              {/* Table Visual in the middle */}
              <div className="w-64 h-3 rounded-full bg-white/5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-8 flex items-center justify-center">
                  <div className="w-32 h-full bg-cyan-400/20 blur-md rounded-full" />
              </div>

              <div className="text-center">
                <p className="text-sm font-sans text-cyan-400/60 uppercase tracking-[0.3em] mb-2">{isMyTurn ? "Your Turn" : "Opponent Turn"}</p>
                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{activePlayer?.username}</h2>
              </div>
              {mpPlayers.find(p => p.isYou)?.isEliminated && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-3">
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">You are spectating</p>
                    <Button onClick={() => setLocation("/")} variant="outline" className="border-white/10 text-white/50 rounded-xl h-10 px-6">Exit to Home</Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {gameState === "MATCH_OVER" && <MatchOverScreen playerScore={score} mpPlayers={mpPlayers} onHome={() => setLocation("/")} />}

          <AnimatePresence mode="wait">
            {gameState === "COUNTDOWN" && <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black">{countdown > 0 ? countdown : "GO!"}</motion.div>}
            {(gameState === "TYPING" || gameState === "GUESSING" || gameState === "FEEDBACK") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full">
                <div className="text-xs font-mono text-muted-foreground/60">{entry.hint}</div>
                <div className="flex gap-2">
                  {entry.word.split("").map((char, idx) => {
                    const isRevealed = idx < revealed;
                    const guessIdx = idx - revealed;
                    const isGuessed = !isRevealed && guessIdx >= 0 && guessIdx < guess.length;
                    let cls = "w-12 h-16 flex items-center justify-center border-2 rounded-xl font-mono font-bold text-2xl transition-all ";
                    if (isRevealed) cls += "border-cyan-400 bg-cyan-400/10 text-cyan-400";
                    else if (isGuessed) cls += combustion > 0 ? "border-orange-500 bg-orange-500/20 text-orange-400" : "border-violet-400 bg-violet-400/10 text-violet-400";
                    else cls += "border-white/10 text-transparent";
                    return <motion.div key={idx} animate={isGuessed ? { scale: [1, 1.1, 1] } : {}} className={cls}>{isRevealed ? char : (isGuessed ? guess[guessIdx] : "")}</motion.div>;
                  })}
                </div>
                <div className="flex flex-col items-center gap-4">
                  {gameState === "TYPING" && (
                    <div className="flex gap-4 items-center">
                      <Button onClick={handleStop} className="w-32 h-32 rounded-full bg-red-600 text-white font-black text-2xl shadow-2xl active:scale-90 transition-transform">STOP</Button>
                      {extraTime > 0 && (
                        <motion.button
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          onClick={handleUseTime}
                          className="w-16 h-16 rounded-2xl bg-cyan-500 text-black flex flex-col items-center justify-center shadow-lg active:scale-95"
                        >
                          <Zap className="h-6 w-6 fill-current" />
                          <span className="text-[10px] font-black">{extraTime}s</span>
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
                {gameState === "GUESSING" && (
                  <div className="flex flex-col items-center gap-6 w-full">
                    <input ref={inputRef} type="text" className="absolute opacity-0" onInput={(e) => { const v = e.currentTarget.value; if (v) handleGuess(v[v.length - 1]); e.currentTarget.value = ""; }} />
                    <Button onClick={() => inputRef.current?.focus()} className="w-full max-w-[220px] h-14 rounded-2xl bg-cyan-500 text-black font-black flex items-center justify-center gap-3 shadow-xl">SHOW KEYBOARD</Button>
                  </div>
                )}
              </motion.div>
            )}
            {gameState === "GAME_OVER" && (
              <motion.div key="gameover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 w-full max-w-xs text-center">
                <h2 className="text-5xl font-black text-red-400">MATCH ENDED</h2>
                <div className="flex flex-col gap-3 w-full">
                   <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Rank</div>
                      <div className={`text-2xl font-black ${getRank(scores.rankScore).color}`}>{getRank(scores.rankScore).name}</div>
                   </div>
                </div>
                <Button onClick={handleShare} className="w-full h-14 bg-emerald-500 text-black font-black text-lg rounded-2xl shadow-lg">SHARE RANK</Button>
                <Button onClick={restartGame} className="w-full h-12 bg-cyan-400 text-black font-bold rounded-xl">PLAY AGAIN</Button>
                <Button variant="outline" onClick={handleBackToHome} className="w-full h-10 border-white/10 text-white/40">HOME</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Layout>
  );
}

function InterstitialAd({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    async function show() { try { await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: true }); await AdMob.showInterstitial(); onDone(); } catch { onDone(); } }
    show();
  }, [onDone]);
  return <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">Loading...</div>;
}

function AdReviveModal({ onDecline, onRevive }: { onDecline: () => void; onRevive: () => void }) {
  const [loading, setLoading] = useState(false);
  async function showRewarded() { setLoading(true); try { await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: true }); await AdMob.showRewardVideoAd(); onRevive(); } catch { setLoading(false); } }
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-sm flex flex-col gap-4 text-center">
        <h3 className="text-2xl font-black">Continue?</h3>
        <Button onClick={showRewarded} disabled={loading} className="h-12 bg-cyan-400 text-black font-bold">Watch Ad to Revive</Button>
        <Button variant="outline" onClick={onDecline} className="h-10 border-white/10">No Thanks</Button>
      </div>
    </div>
  );
}
