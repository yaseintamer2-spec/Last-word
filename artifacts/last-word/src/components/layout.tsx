import { useEffect, useRef, ReactNode } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { useLocation } from 'wouter';
import { FallingGift } from './falling-gift';

// ── Your AdMob banner ad unit ────────────────────────────────────────────────
// Ad unit name : bottom app
// Ad unit ID   : ca-app-pub-1445407957198527/3628586568
const BANNER_AD_ID = 'ca-app-pub-1445407957198527/3628586568';

// ── AdMob banner hook ─────────────────────────────────────────────────────────
function useAdMobBanner() {
  const initialized = useRef(false);

  useEffect(() => {
    async function showBanner() {
      if (initialized.current) return;
      initialized.current = true;

      try {
        const options: BannerAdOptions = {
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,  // fills the screen width perfectly
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false, // ← set to true while developing, false before publishing
        };

        await AdMob.showBanner(options);
      } catch (err) {
        // AdMob not available in web browser preview — silently ignore
        console.warn('[AdMob] Banner not shown:', err);
      }
    }

    showBanner();

    // Hide banner when component unmounts (e.g. navigating away)
    return () => {
      AdMob.hideBanner().catch(() => {});
    };
  }, []);
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: ReactNode }) {
  useAdMobBanner();
  const [location] = useLocation();
  const isHome = location === "/";

  return (
    // h-[100dvh] locks the container to exactly the viewport height.
    <div className="h-[100dvh] flex flex-col text-foreground relative overflow-hidden dark">
      {/* Vignette overlay for depth */}
      <div className="vignette" />

      {/* Gift Drops - Only on home page */}
      {isHome && <FallingGift />}

      {/* Content area — scrollable, padded at bottom so nothing hides under the ad */}
      <div className="relative z-10 flex-1 flex flex-col pb-[50px] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
