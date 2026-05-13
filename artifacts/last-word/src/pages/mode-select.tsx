import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Globe, User, Zap, Swords, Trophy } from "lucide-react";
import { Layout } from "@/components/layout";
import { SFX } from "@/lib/sounds";
import { useGameData, getRank } from "@/lib/store";

export default function ModeSelect() {
  const [, setLocation] = useLocation();
  const { scores } = useGameData();
  const currentRank = getRank(scores.rankScore);

  const MODES = [
    {
      id: "ranked",
      name: "RANKED BATTLE",
      desc: "Fight for RP. Elimination mode enabled.",
      icon: <Swords className="h-6 w-6" />,
      color: "from-red-500/20 to-orange-500/20",
      border: "border-orange-500/30",
      accent: "#f97316",
      path: "/lobby"
    },
    {
      id: "solo",
      name: "SOLO TRAINING",
      desc: "Offline practice. Break your personal best.",
      icon: <User className="h-6 w-6" />,
      color: "from-cyan-500/20 to-blue-500/20",
      border: "border-cyan-500/30",
      accent: "#22d3ee",
      path: "/game"
    },
    {
        id: "daily",
        name: "DAILY SEED",
        desc: "One word. One chance. Global sync.",
        icon: <Zap className="h-6 w-6" />,
        color: "from-yellow-500/20 to-amber-500/20",
        border: "border-yellow-500/30",
        accent: "#fbbf24",
        path: "/game?mode=daily"
      }
  ];

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">

        {/* Header */}
        <div className="flex items-center gap-3 pt-6 pb-8">
          <button onClick={() => { SFX.tap(); setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-white transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "Orbitron, sans-serif" }}>SELECT MODE</h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Prepare for entry</p>
          </div>
        </div>

        {/* Current Rank Mini Card */}
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-[2rem] border border-white/10 bg-white/5 flex items-center justify-between relative overflow-hidden"
        >
            <div className="absolute -left-4 top-0 bottom-0 w-24 bg-gradient-to-r from-white/10 to-transparent skew-x-12" />

            <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 shadow-2xl overflow-hidden p-2">
                    <img src={currentRank.icon} alt="" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                </div>
                <div>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Division</p>
                    <h3 className={`text-xl font-black uppercase tracking-tighter ${currentRank.color}`}>{currentRank.name}</h3>
                </div>
            </div>
            <div className="text-right relative z-10">
                <p className="text-[10px] font-mono text-white/30 uppercase">RP Points</p>
                <p className="text-2xl font-black font-mono text-white tabular-nums tracking-tighter">
                  {scores.rankScore.toLocaleString()}
                </p>
            </div>
        </motion.div>

        {/* Modes List */}
        <div className="flex flex-col gap-4">
          {MODES.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { SFX.tap(); setLocation(m.path); }}
              className={`relative overflow-hidden w-full p-5 rounded-[2rem] border ${m.border} bg-gradient-to-br ${m.color} text-left group transition-all`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center shadow-inner" style={{ color: m.accent }}>
                    {m.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white leading-tight uppercase tracking-tight">{m.name}</h2>
                    <p className="text-xs text-white/50 font-medium mt-0.5">{m.desc}</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                    →
                </div>
              </div>

              {/* Background detail */}
              <div className="absolute -right-4 -bottom-4 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform duration-700">
                {m.icon}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Bottom info */}
        <div className="mt-auto pb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-black/20">
                <Globe className="h-3 w-3 text-cyan-400" />
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Global Servers: Online</span>
            </div>
        </div>

      </div>
    </Layout>
  );
}
