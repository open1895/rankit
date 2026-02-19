import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

interface CreatorChatProps {
  creatorId: string;
  creatorName: string;
}

const CreatorChat = ({ creatorId, creatorName }: CreatorChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [nickname, setNickname] = useState(() => localStorage.getItem("chat_nickname") || "");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profileNickname, setProfileNickname] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch profile nickname
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) {
          setProfileNickname(data.display_name);
          setNickname(data.display_name);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${creatorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `creator_id=eq.${creatorId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => [...prev.slice(-99), msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, creatorId]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!nickname.trim() || nickname.trim().length < 2) {
      toast.error("닉네임을 2자 이상 입력해주세요.");
      return;
    }
    if (!input.trim()) return;

    setSending(true);
    localStorage.setItem("chat_nickname", nickname.trim());

    const { error } = await supabase.from("chat_messages").insert({
      creator_id: creatorId,
      nickname: nickname.trim(),
      message: input.trim(),
    });

    if (error) {
      toast.error("메시지 전송에 실패했습니다.");
    }
    setInput("");
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-sm p-3 text-center text-sm font-medium text-neon-cyan hover:border-neon-cyan/50 transition-all rounded-xl"
      >
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          실시간 채팅 {isOpen ? "닫기" : "열기"}
          {messages.length > 0 && !isOpen && (
            <span className="px-1.5 py-0.5 rounded-full bg-neon-cyan/20 text-[10px] font-bold">{messages.length}</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="glass p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-neon-cyan" />
            {creatorName} 채팅방
            <span className="px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-[10px] text-neon-cyan">LIVE</span>
          </h3>

          {/* Messages */}
          <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hide">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">첫 번째 메시지를 보내보세요! 💬</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="glass-sm p-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neon-purple">{msg.nickname}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="space-y-2">
            {profileNickname ? (
              <div className="text-xs text-muted-foreground px-1">
                닉네임: <span className="text-foreground font-medium">{profileNickname}</span>
              </div>
            ) : !localStorage.getItem("chat_nickname") ? (
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 (2~20자)"
                maxLength={20}
                className="w-full px-3 py-2 rounded-lg glass-sm bg-card/30 border border-glass-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50"
              />
            ) : null}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="메시지를 입력하세요..."
                maxLength={200}
                className="flex-1 px-3 py-2 rounded-lg glass-sm bg-card/30 border border-glass-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorChat;
