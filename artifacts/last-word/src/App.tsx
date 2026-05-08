import { useState, useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LoadingScreen } from '@/components/loading-screen';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import NotFound from '@/pages/not-found';

import Home from '@/pages/home';
import Friends from '@/pages/friends';
import Lobby from '@/pages/lobby';
import Leaderboard from '@/pages/leaderboard';
import Game from '@/pages/game';
import Daily from '@/pages/daily';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/friends" component={Friends} />
      <Route path="/lobby" component={Lobby} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/game" component={Game} />
      <Route path="/daily" component={Daily} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ── Android back-button handler ───────────────────────────────────────────────
// On Android, pressing the hardware back button would normally close the app.
// This lets the browser history handle it first (go back a page),
// and only exits if there's nowhere left to go.
function useAndroidBackButton() {
  useEffect(() => {
    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}

// ── Offline detection overlay ─────────────────────────────────────────────────
function OfflineScreen() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 p-8 text-center"
          style={{ background: 'rgba(3,5,14,0.97)', backdropFilter: 'blur(12px)' }}
        >
          <div className="relative flex items-center justify-center w-24 h-24">
            <motion.div
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute w-24 h-24 rounded-full border border-red-500/30"
            />
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: 0.3, ease: 'easeInOut' }}
              className="absolute w-16 h-16 rounded-full border border-red-500/40"
            />
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
          </div>

          <div>
            <h2
              className="text-3xl font-black mb-2"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#f87171' }}
            >
              No Connection
            </h2>
            <p className="text-white/50 text-sm max-w-xs font-mono leading-relaxed">
              Please connect to the internet to play Last Word.
            </p>
          </div>

          <div className="flex items-center gap-2 text-white/25 font-mono text-xs">
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              ●
            </motion.span>
            Waiting for connection...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  const [loaded, setLoaded] = useState(false);

  // Wire up Android hardware back button
  useAndroidBackButton();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AnimatePresence>
          {!loaded && <LoadingScreen onDone={() => setLoaded(true)} />}
        </AnimatePresence>
        <WouterRouter>
          <Router />
        </WouterRouter>
        <OfflineScreen />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
