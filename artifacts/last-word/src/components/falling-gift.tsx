import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { useGameData } from "@/lib/store";
import { AdMob, RewardAdPluginEvents } from "@capacitor-community/admob";
import { toast } from "sonner";
import { SFX } from "@/lib/sounds";

export function FallingGift() {
  const { scores, setScores } = useGameData();
  const [visible, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(50);

  const REWARDED_AD_ID = "ca-app-pub-1445407957198527/6949268913";

  useEffect(() => {
    // Drop a gift every 45-90 seconds while on home page
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0];
      const count = scores.lastGiftDate === today ? scores.giftsClaimedToday : 0;

      if (count < 3 && !visible) {
        setLeft(15 + Math.random() * 70); // Random horizontal position
        setShow(true);
        // Auto hide after 15 seconds if not clicked
        setTimeout(() => setShow(false), 15000);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [scores, visible]);

  async function claimGift() {
    if (loading) return;
    setLoading(true);
    SFX.tap();

    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: false });

      const rewardH = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        const today = new Date().toISOString().split('T')[0];
        const newCount = (scores.lastGiftDate === today ? scores.giftsClaimedToday : 0) + 1;
        const rewardCoins = 50 + Math.floor(Math.random() * 51); // 50-100 coins

        setScores(prev => ({
          ...prev,
          coins: prev.coins + rewardCoins,
          giftsClaimedToday: newCount,
          lastGiftDate: today
        }));

        toast.success(`CLAIMED! +${rewardCoins} Coins`, {
          description: `Gifts today: ${newCount}/3`,
          icon: <Sparkles className="text-yellow-400" />
        });
        setShow(false);
      });

      const dismissedH = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        rewardH.remove(); dismissedH.remove();
        setLoading(false);
      });

      await AdMob.showRewardVideoAd();
    } catch (err) {
      console.warn("Gift Ad Error:", err);
      setLoading(false);
      toast.error("Ad not ready. Try again later.");
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: [0, 50, 200, 450, 700], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 15, ease: "linear" }}
          onClick={claimGift}
          disabled={loading}
          className="fixed z-[100] p-4 flex flex-col items-center gap-2 group pointer-events-auto"
          style={{ left: `${left}%` }}
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.5)] border-2 border-white/20"
            >
              <Gift className="h-8 w-8 text-black" />
            </motion.div>
            <div className="absolute -inset-2 bg-yellow-400/20 blur-xl rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full border border-yellow-400/20 shadow-lg">
            {loading ? '...' : 'TAP ME!'}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
