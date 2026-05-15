import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ShoppingCart, Sparkles, Check, Lock } from "lucide-react";
import { Layout } from "@/components/layout";
import { SFX } from "@/lib/sounds";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Vibrate } from "@/lib/haptics";

type PFPItem = {
  id: string;
  name: string;
  url: string;
  price: number;
  theme: string;
};

const SHOP_ITEMS: PFPItem[] = [
  { id: "neon_wolf",   name: "Neon Wolf",     url: "https://api.dicebear.com/7.x/avataaars/svg?seed=wolf&backgroundColor=00ffff", price: 500,  theme: "text-cyan-400" },
  { id: "cyber_sam",   name: "Cyber Samurai", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=samurai&backgroundColor=ff0000", price: 1200, theme: "text-red-500" },
  { id: "void_walk",   name: "Void Walker",   url: "https://api.dicebear.com/7.x/avataaars/svg?seed=void&backgroundColor=a855f7", price: 2500, theme: "text-violet-500" },
  { id: "gold_eagle",  name: "Golden Eagle",  url: "https://api.dicebear.com/7.x/avataaars/svg?seed=eagle&backgroundColor=eab308", price: 5000, theme: "text-yellow-500" },
  { id: "em_dragon",   name: "Emerald Drake", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=dragon&backgroundColor=10b981", price: 8000, theme: "text-emerald-500" },
  { id: "glitch_sk",   name: "Glitch Skull",  url: "https://api.dicebear.com/7.x/avataaars/svg?seed=skull&backgroundColor=ffffff", price: 15000, theme: "text-white" },
];

export default function Shop() {
  const [, setLocation] = useLocation();
  const { scores, setScores, user, setUser } = useGameData();

  const handleBuy = (item: PFPItem) => {
    if (scores.coins < item.price) {
      toast.error("Not enough coins!");
      Vibrate.error();
      return;
    }

    if (scores.ownedPfps.includes(item.url)) {
      // Already owned, just equip
      if (user) setUser({ ...user, pfp: item.url });
      toast.success("Avatar equipped!");
      return;
    }

    // Purchase
    SFX.levelUp();
    Vibrate.success();
    setScores(prev => ({
      ...prev,
      coins: prev.coins - item.price,
      ownedPfps: [...prev.ownedPfps, item.url]
    }));

    if (user) setUser({ ...user, pfp: item.url });
    toast.success(`Purchased ${item.name}!`);
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">

        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => { SFX.tap(); setLocation("/"); }}
              className="p-1.5 -ml-1.5 text-muted-foreground hover:text-white transition-colors">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "Orbitron, sans-serif" }}>SHOP</h1>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 shadow-lg backdrop-blur-md">
            <span className="text-lg">💰</span>
            <span className="font-mono font-bold text-yellow-500">{scores.coins.toLocaleString()}</span>
          </div>
        </div>

        <p className="text-xs font-mono text-white/30 uppercase tracking-[0.2em] mb-6 px-1">Exclusive Avatars</p>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 pb-12">
          {SHOP_ITEMS.map((item, i) => {
            const isOwned = scores.ownedPfps.includes(item.url);
            const isEquipped = user?.pfp === item.url;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`relative p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${
                  isEquipped ? 'bg-cyan-400/10 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.15)]' :
                  isOwned ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-black/40 shadow-inner relative group">
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    {!isOwned && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Lock className="h-6 w-6 text-white/40" />
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <h3 className={`text-sm font-black uppercase tracking-tight ${item.theme}`}>{item.name}</h3>
                    {!isOwned && (
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className="text-[10px] text-yellow-500/60 font-bold">{item.price.toLocaleString()}</span>
                            <span className="text-[10px]">💰</span>
                        </div>
                    )}
                </div>

                <Button
                  onClick={() => handleBuy(item)}
                  className={`w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    isEquipped ? 'bg-cyan-400 text-black' :
                    isOwned ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {isEquipped ? <Check className="h-3 w-3" /> : isOwned ? "EQUIP" : "BUY"}
                </Button>
              </motion.div>
            );
          })}
        </div>

      </div>
    </Layout>
  );
}
