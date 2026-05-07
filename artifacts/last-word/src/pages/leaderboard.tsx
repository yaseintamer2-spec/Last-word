import { useLocation } from "wouter";
import { ChevronLeft, Trophy } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";

const RANK_STYLES = [
  "text-yellow-400 bg-yellow-400/10 border border-yellow-400/30",
  "text-slate-300 bg-slate-300/10 border border-slate-300/30",
  "text-amber-600 bg-amber-600/10 border border-amber-600/30",
];

export default function Leaderboard() {
  const { leaderboard, user, scores } = useGameData();
  const [, setLocation] = useLocation();

  const combined = [...leaderboard];
  if (user && scores.highScore > 0) {
    const idx = combined.findIndex((l) => l.username === user.username);
    if (idx >= 0) {
      if (scores.highScore > combined[idx].score) combined[idx] = { ...combined[idx], score: scores.highScore };
    } else {
      combined.push({ username: user.username, score: scores.highScore });
    }
  }
  const sorted = combined.sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">
        <div className="flex items-center gap-3 pt-4 pb-6">
          <button onClick={() => setLocation("/")} className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h1 className="text-xl font-bold">Leaderboard</h1>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.map((entry, idx) => {
            const isMe = user && entry.username === user.username;
            return (
              <motion.div
                key={`${entry.username}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-colors ${
                  isMe
                    ? "bg-cyan-400/8 border-cyan-400/30"
                    : "bg-card border-card-border"
                }`}
              >
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${RANK_STYLES[idx] ?? "text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold text-sm ${isMe ? "text-cyan-400" : "text-foreground"}`}>
                    {entry.username}
                    {isMe && <span className="ml-2 text-[10px] font-mono bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded-full">YOU</span>}
                  </span>
                </div>
                <span className={`font-mono font-bold tabular-nums text-sm ${idx < 3 ? "text-white" : "text-muted-foreground"}`}>
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
