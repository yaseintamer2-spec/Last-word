import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Trophy, Calendar, Gamepad2 } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { getDailyLeaderboard, isTodayCompleted, getDailyState } from "@/lib/daily";
import { SFX } from "@/lib/sounds";

const RANK_STYLES = [
  { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", icon: "🥇" },
  { text: "text-slate-300",  bg: "bg-slate-300/10",  border: "border-slate-300/30",  icon: "🥈" },
  { text: "text-amber-600",  bg: "bg-amber-600/10",  border: "border-amber-600/30",  icon: "🥉" },
];

type Tab = "alltime" | "daily";

export default function Leaderboard() {
  const { leaderboard, user, scores } = useGameData();
  const [, setLocation]               = useLocation();
  const [tab, setTab]                 = useState<Tab>("alltime");

  // All-time board — merge seeded data with player's own best
  const combined = [...leaderboard];
  if (user && scores.highScore > 0) {
    const idx = combined.findIndex((l) => l.username === user.username);
    if (idx >= 0) { if (scores.highScore > combined[idx].score) combined[idx] = { ...combined[idx], score: scores.highScore }; }
    else combined.push({ username: user.username, score: scores.highScore });
  }
  const allTime = combined.sort((a, b) => b.score - a.score).slice(0, 10);

  // Daily leaderboard
  const dailyScore = isTodayCompleted() ? (getDailyState()?.score ?? 0) : 0;
  const daily      = getDailyLeaderboard(user?.username ?? "You", dailyScore);

  const rows = tab === "alltime" ? allTime.map((e) => ({ name: e.username, score: e.score })) : daily.map((e) => ({ name: e.name, score: e.score }));

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">

        <div className="flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => { SFX.tap(); setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h1 className="text-xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>Leaderboard</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-white/4 border border-white/8">
          {([["alltime", "All Time", Gamepad2], ["daily", "Today's Daily", Calendar]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => { SFX.tap(); setTab(id as Tab); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: tab === id ? "rgba(34,211,238,0.12)" : "transparent",
                color:      tab === id ? "#22d3ee" : "rgba(255,255,255,0.4)",
                border:     tab === id ? "1px solid rgba(34,211,238,0.3)" : "1px solid transparent",
              }}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-2 pb-6">
          {rows.map((entry, idx) => {
            const isMe    = user && entry.name === user.username;
            const rankSt  = RANK_STYLES[idx];
            return (
              <motion.div key={`${entry.name}-${idx}`}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-colors"
                style={{
                  background:   isMe ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.03)",
                  borderColor:  isMe ? "rgba(34,211,238,0.3)"  : "rgba(255,255,255,0.07)",
                }}>
                {/* Rank badge */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold border ${rankSt ? `${rankSt.bg} ${rankSt.border}` : "bg-white/5 border-white/10"}`}>
                  {rankSt ? rankSt.icon : <span className="text-muted-foreground text-xs">{idx + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {entry.name[0].toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className={`font-bold text-sm truncate block ${isMe ? "text-cyan-400" : "text-foreground"}`}>
                    {entry.name}
                    {isMe && <span className="ml-2 text-[10px] font-mono bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded-full">YOU</span>}
                  </span>
                </div>

                {/* Score */}
                <span className={`font-mono font-bold text-sm tabular-nums ${isMe ? "text-cyan-400" : rankSt ? rankSt.text : "text-foreground"}`}>
                  {entry.score.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
