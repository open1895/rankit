import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTickets } from "@/hooks/useTickets";
import { Gift, Search, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetReceiverId?: string;
  presetReceiverName?: string;
}

interface ProfileResult {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

const PRESETS = [10, 50, 100, 500];
const MIN_AMOUNT = 10;

const GiftRPModal = ({ open, onOpenChange, presetReceiverId, presetReceiverName }: Props) => {
  const { user } = useAuth();
  const { tickets, refreshTickets } = useTickets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [receiver, setReceiver] = useState<ProfileResult | null>(null);
  const [amount, setAmount] = useState<number>(50);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setReceiver(null);
      setAmount(50);
      setMessage("");
    } else if (presetReceiverId && presetReceiverName) {
      setReceiver({ user_id: presetReceiverId, display_name: presetReceiverName, avatar_url: "" });
    }
  }, [open, presetReceiverId, presetReceiverName]);

  useEffect(() => {
    if (query.trim().length < 2 || receiver) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${query.trim()}%`)
        .neq("user_id", user?.id || "")
        .limit(6);
      setResults((data as ProfileResult[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, receiver, user?.id]);

  const handleSend = async () => {
    if (!user) return toast.error("로그인이 필요합니다");
    if (!receiver) return toast.error("받을 사람을 선택해주세요");
    if (amount < MIN_AMOUNT) return toast.error(`최소 ${MIN_AMOUNT} RP부터 선물할 수 있어요`);
    if (amount > tickets) return toast.error("RP가 부족해요");

    setSending(true);
    const { error } = await supabase.rpc("gift_rp", {
      p_sender_id: user.id,
      p_receiver_id: receiver.user_id,
      p_amount: amount,
      p_message: message.slice(0, 100),
    });
    setSending(false);

    if (error) {
      toast.error(error.message || "선물 전송에 실패했어요");
      return;
    }
    toast.success(`🎁 선물 완료! ${receiver.display_name}님에게 ${amount} RP를 보냈어요`);
    refreshTickets();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-400" />
            RP 선물하기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="glass-sm rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">내 보유 RP</span>
            <span className="text-lg font-black text-primary">{tickets.toLocaleString()} RP</span>
          </div>

          {/* Receiver picker */}
          {receiver ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
              {receiver.avatar_url ? (
                <img src={receiver.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold">
                  {receiver.display_name.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">받는 사람</div>
                <div className="font-bold truncate">{receiver.display_name}</div>
              </div>
              {!presetReceiverId && (
                <button
                  onClick={() => setReceiver(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  변경
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> 받는 사람 닉네임
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="닉네임 검색..."
                className="w-full px-3 py-2 rounded-xl bg-glass-bg border border-glass-border text-sm focus:outline-none focus:border-primary"
              />
              {query.trim().length >= 2 && results.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  존재하지 않는 유저입니다
                </div>
              )}
              {results.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      key={r.user_id}
                      onClick={() => {
                        setReceiver(r);
                        setResults([]);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-glass-bg text-left"
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold">
                          {r.display_name.slice(0, 1)}
                        </div>
                      )}
                      <span className="text-sm truncate">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">선물 금액</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    amount === p
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-glass-border bg-glass-bg hover:border-primary/50"
                  }`}
                >
                  {p} RP
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={10000}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Math.min(10000, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-2 rounded-xl bg-glass-bg border border-glass-border text-sm text-center font-bold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-xs font-semibold">메시지 (선택, 최대 100자)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              placeholder="응원 메시지를 남겨보세요"
              className="w-full px-3 py-2 rounded-xl bg-glass-bg border border-glass-border text-sm resize-none h-16 focus:outline-none focus:border-primary"
            />
            <div className="text-[10px] text-muted-foreground text-right">{message.length}/100</div>
          </div>

          <button
            disabled={sending || !receiver || amount <= 0 || amount > tickets}
            onClick={handleSend}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_4px_20px_hsl(var(--primary)/0.4)] transition-all"
          >
            <Send className="w-4 h-4" />
            {sending ? "전송 중..." : `${amount} RP 선물하기`}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            🎁 선물한 RP는 즉시 상대방 계정에 적립됩니다 (1회 최대 10,000 RP)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GiftRPModal;
