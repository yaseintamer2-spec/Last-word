import { useEffect, useRef } from "react";

// Google AdMob Web / AdSense banner
// Ad unit: ca-app-pub-1445407957198527/3628586568 (bottom app banner)
const AD_CLIENT = "ca-pub-1445407957198527";
const AD_SLOT   = "3628586568";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdBanner() {
  const initialized = useRef(false);

  useEffect(() => {
    // Inject the AdSense script once
    if (!document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }

    // Push the ad unit after script is ready
    if (!initialized.current) {
      initialized.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // Silently ignore — ad blocker or not yet loaded
      }
    }
  }, []);

  return (
    <div
      className="w-full flex-shrink-0"
      style={{
        height: "50px",
        background: "linear-gradient(90deg, #05090f 0%, #0c1628 50%, #05090f 100%)",
        borderTop: "1px solid rgba(34,211,238,0.14)",
        overflow: "hidden",
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: "50px",
        }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={AD_SLOT}
        