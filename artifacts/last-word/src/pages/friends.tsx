import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, UserPlus, Check, X, Swords, Users } from "lucide-react";
import { useGameData, Friend } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";

export default function Friends() {
  const { user, friends, setFriends } = useGameData();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const already = friends.some(
      (f) => f.username.toLowerCase() === trimmed.toLowerCase()
    );
    if (already) return;
    const newFriend: Friend = {
      id: crypto.randomUUID(),
      username: trimmed,
      status: "pending_sent",
    };
    setFriends((prev) => [...prev, newFriend]);
    setSearchQuery("");
  };

  const handleAccept = (id: string) =>
    setFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "accepted" } : f))
    );

  const handleDecline = (id: string) =>
    setFriends((prev) => prev.filter((f) => f.id !== id));

  const handleRemove = (id: string) =>
    setFriends((prev) => prev.filter((f) => f.id !== id));

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.status === "pending_received");
  const outgoing = friends.filter((f) => f.status === "pending_sent");

  return (
    <Layout>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 z-10">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4 pb-5">
          <button
            onClick={() => setLocation("/")}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Friends</h1>
        </div>

        {/* Your ID — share to receive requests */}
        {user && (
          <div className="mb-5 p-3 bg-card border border-card-border rounded-xl text-sm">
            <p className="text-muted-foreground text-xs mb-1">Your ID (share to get friend requests)</p>
            <p className="font-mono font-bold text-primary tracking-wide">
              {user.username} · {user.id.split("-")[0].toUpperCase()}
            </p>
          </div>
        )}

        {/* Add friend */}
        <form onSubmit={handleAddFriend} className="flex gap-2 mb-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Username or ID..."
            className="h-11 bg-card border-card-border font-mono flex-1"
            data-testid="input-add-friend"
          />
          <Button
            type="submit"
            disabled={!searchQuery.trim()}
            className="h-11 px-4 bg-primary text-primary-foreground rounded-xl"
            data-testid="button-send-request"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex flex-col gap-6 pb-4">
          {/* Incoming requests */}
          {incoming.length > 0 && (
            <Section label="Requests">
              {incoming.map((f) => (
                <FriendRow key={f.id} friend={f}>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(f.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                      data-testid={`button-accept-${f.id}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDecline(f.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                      data-testid={`button-decline-${f.id}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </FriendRow>
              ))}
            </Section>
          )}

          {/* Friends list */}
          <Section label={`Friends · ${accepted.length}`}>
            {accepted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Users className="h-8 w-8 opacity-40" />
                <p className="text-sm">No friends yet. Add one above.</p>
              </div>
            ) : (
              accepted.map((f) => (
                <FriendRow key={f.id} friend={f} online>
                  <button
                    onClick={() => setLocation("/lobby")}
                    className="text-xs font-mono text-primary border border-primary/30 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    data-testid={`button-challenge-${f.id}`}
                  >
                    <Swords className="h-3 w-3" /> Challenge
                  </button>
                </FriendRow>
              ))
            )}
          </Section>

          {/* Outgoing pending */}
          {outgoing.length > 0 && (
            <Section label="Pending">
              {outgoing.map((f) => (
                <FriendRow key={f.id} friend={f}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">Sent</span>
                    <button
                      onClick={() => handleRemove(f.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      data-testid={`button-cancel-${f.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </FriendRow>
              ))}
            </Section>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
        {label}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </motion.div>
  );
}

function FriendRow({
  friend,
  online,
  children,
}: {
  friend: Friend;
  online?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-3 bg-card border border-card-border rounded-xl">
      <div className="flex items-center gap-3">
        {online !== undefined && (
          <span
            className={`w-2 h-2 rounded-full ${
              online ? "bg-emerald-400" : "bg-white/20"
            }`}
          />
        )}
        <span className="font-semibold text-sm">{friend.username}</span>
      </div>
      {children}
    </div>
  );
}
