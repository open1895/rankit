import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gift, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface GiftRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  message: string;
  created_at: string;
  counterpart_name?: string;
}

const MyGiftHistory = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<GiftRecord[]>([]);
  const [sent, setSent] = useState<GiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase
          .from("rp_gifts")
          .select("id, sender_id, receiver_id, amount, message, created_at")
          .eq("receiver_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("rp_gifts")
          .select("id, sender_id, receiver_id, amount, message, created_at")
          .eq("sender_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const ids = new Set<string>();
      (r || []).forEach((g: any) => ids.add(g.sender_id));
      (s || []).forEach((g: any) => ids.add(g.receiver_id));

      let nameMap: Record<string, string> = {};
      if (ids.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", Array.from(ids));
        (profs || []).forEach((p: any) => {
          nameMap[p.user_id] = p.display_name || "익명";
        });
      }

      setReceived(
        (r || []).map((g: any) => ({ ...g, counterpart_name: nameMap[g.sender_id] || "익명" }))
      );
      setSent(
        (s || []).map((g: any) => ({ ...g, counterpart_name: nameMap[g.receiver_id] || "익명" }))
      );
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) return null;

  const list = tab === "received" ? received : sent;

  return (
    <div className="glass rounded-2xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-pink-400" />
        <h3 className="font-black">RP 선물 내역</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("received")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === "received"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-glass-bg text-muted-foreground border border-glass-border"
          }`}
        >
          받은 선물 ({received.length})
        </button>
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            tab === "sent"
              ? "bg-primary/20 text-primary border border-primary/40"
              : "bg-glass-bg text-muted-foreground border border-glass-border"
          }`}
        >
          보낸 선물 ({sent.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center text-xs text-muted-foreground py-6">불러오는 중...</div>
      ) : list.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-6">
          {tab === "received" ? "아직 받은 선물이 없어요" : "아직 보낸 선물이 없어요"}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((g) => (
            <div
              key={g.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-glass-bg border border-glass-border"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  tab === "received" ? "bg-emerald-500/20" : "bg-pink-500/20"
                }`}
              >
                {tab === "received" ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-pink-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold truncate">{g.counterpart_name}</span>
                  <span
                    className={`text-sm font-black shrink-0 ${
                      tab === "received" ? "text-emerald-400" : "text-pink-400"
                    }`}
                  >
                    {tab === "received" ? "+" : "−"}
                    {g.amount} RP
                  </span>
                </div>
                {g.message && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    "{g.message}"
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: ko })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyGiftHistory;
