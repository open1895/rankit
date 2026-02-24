import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

const SUGGEST_PHRASES = [
  "오늘도 1위 가즈아! 🔥",
  "최고야! 항상 응원해 💜",
  "역전 임박!! 화이팅 🎯",
  "우리 팬이 최고야 ✨",
  "무조건 1위! 믿어 ❤️",
  "오늘 투표 완료! 🗳️",
];

interface QuickCheerProps {
  creatorId: string;
  creatorName: string;
  onSent?: () => void;
}

const QuickCheer = ({ creatorId, creatorName, onSent }: QuickCheerProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setNickname(data.display_name);
      });
  }, [user]);

  const handleSend = async () => {
    const nick = nickname.trim() || "익명팬";
    const msg = message.trim();
    if (!msg) return;
    if (msg.length > 50) {
      toast.error("50자 이내로 작성해주세요.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      creator_id: creatorId,
      nickname: nick,
      message: msg,
      vote_count: 1,
      post_count: 1,
    });
    setSending(false);
    if (error) {
      toast.error("전송에 실패했습니다.");
      return;
    }
    toast.success("응원 완료! 💬");
    setMessage("");
    setShowSuggestions(false);
    onSent?.();
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3 border border-neon-cyan/10">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-neon-cyan" />
        <span className="text-sm font-bold gradient-text">
          {creatorName}에게 응원 한마디
        </span>
        <div className="ml-auto flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[10px] text-green-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Suggestion chips */}
      {showSuggestions && (
        <div className="flex flex-wrap gap-1.5 animate-fade-in">
          {SUGGEST_PHRASES.map((phrase) => (
            <button
              key={phrase}
              onClick={() => { setMessage(phrase); setShowSuggestions(false); }}
              className="text-[11px] glass-sm px-2.5 py-1 rounded-full text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/50 transition-all active:scale-95"
            >
              {phrase}
            </button>
          ))}
        </div>
      )}

      {user ? (
        <div className="text-xs text-muted-foreground">
          닉네임: <span className="text-foreground font-medium">{nickname || "로딩 중..."}</span>
        </div>
      ) : (
        <input
          type="text"
          placeholder="닉네임 (미입력시 익명팬)"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-background/50 border border-glass-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50"
        />
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="한마디 남기기..."
            maxLength={50}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="w-full bg-background/50 border border-glass-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 pr-16"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {message.length}/50
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="shrink-0 px-3 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1"
        >
          {sending ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default QuickCheer;
