import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LAST_LETTERS = ["L", "A", "S", "T"];
const WORD_LETTERS = ["L", "E", "T", "T", "E", "R"];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [showWord, setShowWord]       = useState(false);
  const [showFlash, setShowFlash]     = useState(false);
  const [showRipple1, setShowRipple1] = useState(false);
  const [showRipple2, setShowRipple2] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [exiting, setExiting]         = useState(false);
  const [progress, setProgress]       = useState(0);

  useEffect(() => {
    // Tighter timeline — total visible ~1.8s
    const t1 = setTimeout(() => setShowWord(true),     360);  // WORD drops
    const t2 = setTimeout(() => setShowFlash(true),    530);  // impact flash
    const t3 = setTimeout(() => { setShowRipple1(true); setShowFlash(false); }, 550);
    const t4 = setTimeout(() => setShowRipple2(true),  680);  // second ring
    const t5 = setTimeout(() => { setShowRipple1(false); setShowRipple2(false); }, 950);
    const t6 = setTimeout(() => setShowTagline(true),  720);
    const t7 = setTimeout(() => { setExiting(true); setTimeout(onDone, 300); }, 1800);

    // SAFETY FALLBACK: Force close if stuck
    const safety = setTimeout(() => {
        if (!exiting) {
            setExiting(true);
            onDone();
        }
    }, 5000);

    return () => [t1, t2, t3, t4, t5, t6, t7, safety].forEach(clearTimeout);
  }, [onDone, exiting]);

  // Progress fills in 1.6s
  useEffect(() => {
    const start = performance.now();
    const duration = 1600;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setProgress(Math.floor(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.3, ease: "easeIn" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 48%, #0c1829 0%, #050610 65%, #020308 100%)",
          }}
        >
          {/* Ambient glow layers */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-40 rounded-full blur-3xl"
              style={{ background: "rgba(34,211,238,0.07)" }} />
            <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-24 rounded-full blur-3xl"
              style={{ background: "rgba(251,191,36,0.06)" }} />
          </div>

          {/* Impact flash — brief white pulse on WORD landing */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                key="flash"
                initial={{ opacity: 0.45 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(255,220,100,0.35) 0%, transparent 65%)" }}
              />
            )}
          </AnimatePresence>

          {/* Logo */}
          <div
            className="relative flex flex-col items-start"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            {/* LAST — staggered slide from left */}
            <div className="flex">
              {LAST_LETTERS.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ x: -160 - i * 25, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    delay: i * 0.06,
                    duration: 0.36,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-8xl sm:text-[7rem] font-black leading-none tracking-tighter"
                  style={{
                    color: "#22d3ee",
                    textShadow: "0 0 40px rgba(34,211,238,0.65), 0 0 100px rgba(34,211,238,0.25)",
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </div>

            {/* WORD — smashes down with spring bounce */}
            <div
              className="flex self-end"
              style={{ marginTop: "-0.12em", marginLeft: "0.18em" }}
            >
              <AnimatePresence>
                {showWord && (
                  <>
                    {WORD_LETTERS.map((ch, i) => (
                      <motion.span
                        key={i}
                        initial={{ y: -420, opacity: 0, scaleY: 1.4 }}
                        animate={{ y: 0, opacity: 1, scaleY: 1 }}
                        transition={{
                          delay: i * 0.035,
                          type: "spring",
                          stiffness: 700,
                          damping: 18,
                          mass: 0.9,
                        }}
                        className="text-8xl sm:text-[7rem] font-black leading-none tracking-tighter inline-block"
                        style={{
                          color: "#fbbf24",
                          textShadow: "0 0 35px rgba(251,191,36,0.75), 0 0 80px rgba(251,191,36,0.35)",
                          transform: "skewX(-5deg)",
                          display: "inline-block",
                        }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Shockwave ring 1 */}
            <AnimatePresence>
              {showRipple1 && (
                <motion.div
                  key="ripple1"
                  initial={{ scaleX: 0.05, scaleY: 0.05, opacity: 1 }}
                  animate={{ scaleX: 8, scaleY: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.1, 0.5, 0.3, 1] }}
                  className="absolute bottom-0 left-0 right-0 mx-auto w-full h-2 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0) 70%)",
                  }}
                />
              )}
            </AnimatePresence>

            {/* Shockwave ring 2 (larger, delayed) */}
            <AnimatePresence>
              {showRipple2 && (
                <motion.div
                  key="ripple2"
                  initial={{ scaleX: 0.05, scaleY: 0.05, opacity: 0.6 }}
                  animate={{ scaleX: 12, scaleY: 4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.1, 0.5, 0.3, 1] }}
                  className="absolute bottom-0 left-0 right-0 mx-auto w-full h-2 rounded-full pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse, rgba(34,211,238,0.5) 0%, rgba(34,211,238,0) 70%)",
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Tagline + progress */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <AnimatePresence>
              {showTagline && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-xs font-mono uppercase tracking-[0.4em]"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Stop · Guess · Win
                </motion.p>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div
              className="w-36 h-px rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #22d3ee 0%, #fbbf24 100%)",
                  boxShadow: "0 0 8px rgba(34,211,238,0.5)",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
