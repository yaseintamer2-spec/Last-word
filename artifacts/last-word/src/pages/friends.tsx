import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, UserPlus, Check, X, Swords, Users, Copy, CheckCheck, Loader2 } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { SFX } from "@/lib/sounds";
import { Vibrate } from "@/lib/haptics";
import { supabase } from "@/lib/supabase";

export default function Friends() {
  const { user, friends }                 = useGameData();
  const [searchQuery, setSearchQuery]     = useState("");
  const [copied, setCopied]               = useState(false);
  const [adding, setAdding]               = useState(false);
  const [feedback, setFeedback]           = useState({ text: "", type: "" as "error" | "success" | "" });
  const [, setLocation]                   = useLocation();

  const myId = user?.display_id ? `#${user.display_id}` : "Syncing...";

  const handleCopyId = () => {
    if (!user?.display_id) {
      setFeedback({ text: "Profile ID is still syncing", type: "error" });
      return;
    }
    navigator.clipboard.writeText(user.display_id.toString()).catch(() => {});
    SFX.tap(); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().replace("#", "");
    if (!trimmed || !user) return;

    setAdding(true);
    setFeedback({ text: "", type: "" });

    try {
      // Find user strictly by numeric display ID
      const { data: targetUser, error: findErr } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('display_id', parseInt(trimmed))
        .single();

      if (findErr || !targetUser) {
        setFeedback({ text: "User not found", type: "error" });
        return;
      }

      if (targetUser.id === user.id) {
        setFeedback({ text: "Cannot add yourself", type: "error" });
        return;
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
        .single();

      if (existing) {
        setFeedback({ text: "Already requested", type: "error" });
        return;
      }

      const { error: insErr } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: targetUser.id, status: 'pending' });

      if (insErr) throw insErr;

      setFeedback({ text: "Request sent!", type: "success" });
      setSearchQuery("");
      SFX.levelUp();
    } catch (err) {
      setFeedback({ text: "Failed to send request", type: "error" });
    } finally {
      setAdding(false);
      setTimeout(() => setFeedback({ text: "", type: "" }), 3000);
    }
  };

  const handleAccept = async (friendId: string) => {
    if (!user) return;
    SFX.correct(); Vibrate.success();
    await supabase.from('friendships').update({ status: 'accepted' })
      .eq('user_id', friendId).eq('friend_id', user.id);
  };

  const handleDecline = async (friendId: string) => {
    if (!user) return;
    SFX.tap();
    await supabase.from('friendships').delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
  };

  const handleRemove = (id: string) => handleDecline(id);

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending_received");
  const outgoing = friends.filter((f) => f.status === "pending_sent");
  const onlineCount = accepted.filter((f) => f.online).length;

  if (!user) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-6 text-center gap-6 z-10">
          <div className="w-20 h-20 rounded-3xl bg-cyan-400/10 border border-cyan-400/25 flex items-center justify-center">
            <Users className="h-9 w-9 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: "Orbitron, sans-serif" }}>Profile Required</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create a player name on the home screen before adding friends.
            </p>
          </div>
          <Button onClick={() => setLocation("/")} className="h-12 px-8 bg-cyan-400 text-black font-black rounded-2xl">
            Set Up Profile
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button onClick={() => { SFX.tap(); setLocation("/"); }}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
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

        {user && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 bg-white/5 border-white/10 shadow-xl">
            <div>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1">Your ID to share</p>
              <p className="font-mono font-bold text-cyan-400 text-sm tracking-wider">{myId}</p>
            </div>
            <button onClick={handleCopyId}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
              style={{ background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)", borderColor: copied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)" }}>
              {copied ? <CheckCheck className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </motion.div>
        )}

        <form onSubmit={handleAddFriend} className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Paste Friend ID (e.g. #7A2B)..."
              className="h-11 bg-white/5 border-white/10 font-mono text-sm"
            />
            <AnimatePresence>
              {feedback.text && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`absolute -bottom-6 left-0 text-xs font-mono ${feedback.type === "error" ? "text-red-400" : "text-emerald-400"}`}>
                  {feedback.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button type="submit" disabled={!searchQuery.trim() || adding}
            className="h-11 px-4 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl font-bold">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        </form>

        <div className="flex flex-col gap-8 pb-10">
          <AnimatePresence>
            {incoming.length > 0 && (
              <Section label="Incoming Requests" accent="#fbbf24">
                {incoming.map((f) => (
                  <FriendRow key={f.id} friend={f}>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(f.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDecline(f.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </FriendRow>
                ))}
              </Section>
            )}
          </AnimatePresence>

          <Section label={`Friends (${accepted.length})`}>
            {accepted.length === 0 ? (
              <div className="text-center py-8 opacity-40">
                <Users className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm font-mono tracking-widest uppercase">No friends found</p>
              </div>
            ) : (
              accepted.map((f) => (
                <FriendRow key={f.id} friend={f} online={f.online}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocation(`/lobby?challenge=${f.id}`)}
                      className="text-[10px] font-black uppercase tracking-widest border border-cyan-400/30 text-cyan-400 bg-cyan-400/5 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                      Challenge
                    </button>
                    <button onClick={() => handleRemove(f.id)}
                      className="p-2 text-white/20 hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </FriendRow>
              ))
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section label="Pending Sent" accent="#a78bfa">
              {outgoing.map((f) => (
                <FriendRow key={f.id} friend={f}>
                  <button onClick={() => handleRemove(f.id)}
                    className="text-[10px] font-mono text-white/20 hover:text-red-400 flex items-center gap-1 uppercase">
                    Cancel <X className="h-3 w-3" />
                  </button>
                </FriendRow>
              ))}
            </Section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Section({ label, accent = "#fff", children }: { label: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: `${accent}60` }}>{label}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FriendRow({ friend, online, children }: { friend: any; online?: boolean; children?: React.ReactNode }) {
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-center justify-between px-3 py-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
             <span className="font-bold">{friend.username[0]}</span>
          </div>
          {online !== undefined && (
            <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-white/10"}`} />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-none">{friend.username}</span>
          <span className="text-[9px] font-mono text-white/20 mt-1 uppercase">{online ? "Active Now" : "Offline"}</span>
        </div>
      </div>
      {children}
    </motion.div>
  );
}
