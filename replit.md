# Last Word

A fast-paced browser word-guessing game where players stop a typing word mid-reveal and guess the remaining letters to score points.

## Run & Operate

- `pnpm --filter @workspace/last-word run dev` — run the game frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, framer-motion, wouter
- State: localStorage only (no database required for core game)
- Fonts: Orbitron + Rajdhani (Google Fonts)
- API: Express 5 (unused by game, available for future features)

## Where things live

- `artifacts/last-word/src/` — all game source code
- `artifacts/last-word/src/lib/store.ts` — localStorage data hook (useGameData)
- `artifacts/last-word/src/pages/` — Home, Game, Friends, Lobby, Leaderboard
- `artifacts/last-word/src/index.css` — full dark neon theme

## Architecture decisions

- All game data stored in localStorage — no database provisioned; avoids any backend dependency for the game itself.
- Friends system is local-only: cross-user friend requests and real-time multiplayer require Supabase Realtime (see Supabase notes below).
- Multiplayer mode is simulated with AI bot opponents. Real multiplayer needs WebSocket/Supabase channels.
- Ad banner is a styled placeholder div — replace with real ad SDK (e.g. Google AdSense, AdMob Web) when ready.
- Rewarded ad (revive) is a simulated 5-second countdown — replace with a real rewarded ad SDK call.

## Product

- Solo game: words type out letter-by-letter, player clicks STOP to freeze and guess remaining letters
- Difficulty curve: Easy → Medium → Hard → Insane (adjusts word length and typing speed)
- Lives system (3 lives), exponential points (early stop = massive bonus), praise messages
- Interstitial ad after solo game ends (5s countdown, styled creative)
- Rewarded ad revive: watch a (simulated) 5s ad to regain 1 life — usable once per session
- **Pause/resume**: Page Visibility API — tab/app switch pauses the game; 3-2-1 countdown resumes
- Username + unique UUID per player (localStorage), circular profile photo upload
- Friends page: add by username/ID, accept/decline requests (cross-user needs Supabase)
- Multiplayer: 10-round matches, Sudden Death from round 8 (+30% speed, instant elimination); match-over standings; post-match interstitial ad
- Leaderboard: personal history + seeded global entries
- Visual: dot-grid texture background, vignette overlay, styled ad banner, neon glow effects

## Supabase Integration Notes (for real multiplayer + friends)

To enable real cross-user features, you'll need Supabase:

1. **Friends system**: Store friend requests in a `friend_requests` table. Use Supabase Realtime to push incoming requests to the recipient's browser in real time.
2. **Multiplayer rooms**: Create a `game_rooms` table and use Supabase Realtime channels for syncing game state (current word, player scores, ready states) across all players in a room.
3. **Global leaderboard**: Store scores in a `leaderboard` table — query top scores on load.
4. **Schema needed**:
   - `users(id uuid, username text unique, created_at)`
   - `friend_requests(id, from_user_id, to_user_id, status, created_at)`
   - `game_rooms(id, mode, status, created_at)`
   - `room_players(room_id, user_id, score, ready)`
   - `leaderboard(user_id, username, high_score, updated_at)`

## User preferences

- No database provisioned — user will handle persistence on Supabase if needed
- Project files should be exportable directly

## Gotchas

- Google Fonts @import must be the very first line of index.css (before @import "tailwindcss")
- All game state resets on page refresh (by design for solo mode)
- The ad banner is fixed at bottom — all pages use bottom padding to avoid content overlap

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
