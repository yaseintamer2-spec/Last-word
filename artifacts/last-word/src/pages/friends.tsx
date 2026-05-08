import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, UserPlus, Check, X, Swords, Users, Copy, CheckCheck, Clock } from "lucide-react";
import { useGameData, Friend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/lib/sounds";
import { Vibrate } from "@/lib/haptics";
import { tryUnlock } from "@/lib/achievements";

// Simulated online statuses — randomly assigned per session so it feels alive
function useOnlineStatus(friends: Friend[]) {
  const [online, setOnline] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const map: Record<string, boolean> = {};
    friends.forEach((f) => { if (f.status === "accepted") map[f.id] = Math.random() > 0.35; });
    setOnline(map);
  }, [friends.length]);
  return online;
}

export default function Friends() {
  const { user, friends, setFriends } = useGameData();
  const [searchQuery, setSearchQuery]   = useState("");
  const [copied, setCopied]             = useState(false);
  const [addedFeedback, setAddedFeedback] = useState("");
  const [, setLocation]                 = useLocation();
  const onlineMap                       = useOnlineStatus(friends);

  const myId = user ? `${user.username}#${user.id.split("-")[0].toUpperCase()}` : "";

  const handleCopyId = () => {
    navigator.clipboard.writeText(myId).catch(() => {});
    SFX.tap();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const already = friends.some((f) => f.username.toLowerCase() === trimmed.toLowerCase());
    if (already) { setAddedFeedback("Already in list"); setTimeout(() => setAddedFeedback(""), 2000); return; }
    SFX.tap();
    Vibrate.light();
    const newFriend: Friend = { id: crypto.randomUUID(), username: trimmed, status: "pending_sent" };
    setFriends((prev) => [...prev, newFriend]);
    setSearchQuery("");
    setAddedFeedback("Request sent!");
    setTimeout(() => setAddedFeedback(""), 2000);
  };

  const handleAccept = (id: string) => {
    SFX.correct();
    Vibrate.success();
    setFriends((prev) => prev.map((f) => (f.id === id ? { ...f, status: "accepted" } : f)));
    tryUnlock("first_blood");
  };

  const handleDecline = (id: string) => {
    SFX.tap();
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRemove = (id: string) => {
    SFX.tap();
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending_received");
  const outgoing = friends.filter((f) => f.status === "pending_sent");
  const onlineCount = accepted.filter((f) => onlineMap[f.id]).length;

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">

        {/* Header */}
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => { SFX.tap(); setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>Friends</h1>
          {onlineCount > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {onlineCount} online
            </div>
          )}
        </div>

        {/* Your shareable ID card */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "rgba(34,211,238,0.05)", borderColor: "rgba(34,211,238,0.2)" }}>
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1">Your Friend ID</p>
              <p className="font-mono font-bold text-cyan-400 text-sm tracking-wider">{myId}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Share this so people can add you</p>
            </div>
            <button onClick={handleCopyId}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
              style={{ background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)", borderColor: copied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)" }}>
              {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </motion.div>
        )}

        {/* Add friend input */}
        <form onSubmit={handleAddFriend} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter username or Friend ID..."
              className="h-11 bg-card border-card-border font-mono pr-4"
              data-testid="input-add-friend"
            />
            <AnimatePresence>
              {addedFeedback && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute -bottom-6 left-0 text-xs font-mono text-emerald-400">
                  {addedFeedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button type="submit" disabled={!searchQuery.trim()}
            className="h-11 px-4 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-bold" data-testid="button-send-request">
            <UserPlus className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex flex-col gap-6 pb-6 mt-2">

          {/* Incoming requests */}
          <AnimatePresence>
            {incoming.length > 0 && (
              <Section label={`Requests · ${incoming.length}`} accent="#fbbf24">
                {incoming.map((f) => (
                  <FriendRow key={f.id} friend={f}>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors border border-emerald-500/25"
                        data-testid={`button-accept-${f.id}`}>
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDecline(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors border border-red-500/25"
                        data-testid={`button-decline-${f.id}`}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </FriendRow>
                ))}
              </Section>
            )}
          </AnimatePresence>

          {/* Friends list */}
          <Section label={`Friends · ${accepted.length}`}>
            {accepted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
                  <Users className="h-7 w-7 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-muted-foreground">No friends yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add someone above to challenge them</p>
                </div>
              </div>
            ) : (
              accepted.map((f) => (
                <FriendRow key={f.id} friend={f} online={onlineMap[f.id] ?? false}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { SFX.tap(); setLocation("/lobby"); }}
                      className="text-xs font-mono font-bold border px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      style={{ color: "#22d3ee", borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.07)" }}
                      data-testid={`button-challenge-${f.id}`}>
                      <Swords className="h-3 w-3" /> Challenge
                    </button>
                    <button onClick={() => handleRemove(f.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      data-testid={`button-remove-${f.id}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </FriendRow>
              ))
            )}
          </Section>

          {/* Outgoing pending */}
          <AnimatePresence>
            {outgoing.length > 0 && (
              <Section label="Pending" accent="#a78bfa">
                {outgoing.map((f) => (
                  <FriendRow key={f.id} friend={f}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Clock className="h-3 w-3" /> Sent
                      </div>
                      <button onClick={() => handleRemove(f.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        data-testid={`button-cancel-${f.id}`}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </FriendRow>
                ))}
              </Section>
            )}
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  );
}

function Section({ label, accent = "#ffffff", children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: `${accent}80` }}>{label}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </motion.div>
  );
}

function FriendRow({ friend, online, children }: { friend: Friend; online?: boolean; children?: React.ReactNode }) {
  return (
    <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between px-3 py-3 rounded-2xl border transition-all"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center font-bold text-sm">
            {friend.username[0].toUpperCase()}
          </div>
          {online !== undefined && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-emerald-400" : "bg-white/20"}`} />
          )}
        </div>
        <div>
          <span className="font-semibold text-sm">{friend.username}</span>
          {online !== undefined && (
            <p className="text-[10px] font-mono text-muted-foreground">{online ? "Online" : "Offline"}</p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}
