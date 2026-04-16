import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useCreatorFanLevel } from "@/hooks/useCreatorFanLevel";
import { FAN_PERMISSIONS, getFanLevelByLevel } from "@/lib/fanLevel";

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
  is_fanclub?: boolean;
  fan_level?: number; // computed client-side from sender activity (best effort)
}

interface CreatorChatProps {
  creatorId: string;
  creatorName: string;
}

type ChatMode = "general" | "fanclub";

const CreatorChat = ({ creatorId, creatorName }: CreatorChatProps) => {
  const { user } = useAuth();
  const { level: fanLevel } = useCreatorFanLevel(user?.id, creatorId);
  const [mode, setMode] = useState<ChatMode>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [nickname, setNickname] = useState(() => localStorage.getItem("chat_nickname") || "");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profileNickname, setProfileNickname] = useState("");
  const [isFanclubMember, setIsFanclubMember] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canFanclubChat = fanLevel >= FAN_PERMISSIONS.CAN_FANCLUB_CHAT && isFanclubMember;
  const requiredLevel = getFanLevelByLevel(FAN_PERMISSIONS.CAN_FANCLUB_CHAT);

  // Profile nickname
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

  // Fanclub membership check
  useEffect(() => {
    if (!user) {
      setIsFanclubMember(false);
      return;
    }
    (supabase as any)
      .from("fanclub_members")
      .select("id")
      .eq("creator_id", creatorId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: any }) => setIsFanclubMember(!!data));
  }, [user, creatorId]);

  // Fetch messages + realtime
  useEffect(() => {
    if (!isOpen) return;
    const isFanclub = mode === "fanclub";

    const fetchMessages = async () => {
      const { data } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_fanclub", isFanclub)
        .order("created_at", { ascending: true })
        .limit(100);
      setMessages(data || []);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat-${creatorId}-${mode}`)
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
          if (!!msg.is_fanclub === isFanclub) {
            setMessages((prev) => [...prev.slice(-99), msg]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, creatorId, mode]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (mode === "fanclub" && !canFanclubChat) {
      toast.error(`팬클럽 채팅은 ${requiredLevel.emoji} ${requiredLevel.label} 이상 + 팬클럽 가입 필요`);
      return;
    }
    if (!nickname.trim() || nickname.trim().length < 2) {
      toast.error("닉네임을 2자 이상 입력해주세요.");
      return;
    }
    if (!input.trim()) return;

    setSending(true);
    localStorage.setItem("chat_nickname", nickname.trim());

    const { error } = await (supabase as any).from("chat_messages").insert({
      creator_id: creatorId,
      nickname: nickname.trim(),
      message: input.trim(),
      is_fanclub: mode === "fanclub",
    });

    if (error) {
      toast.error("메시지 전송에 실패했습니다.");
    }
    setInput("");
    setSending(false);
  };

  const fanclubLocked = mode === "fanclub" && !canFanclubChat;

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
            <span className="px-1.5 py-0.5 rounded-full bg-neon-cyan/20 text-[10px] font-bold">
              {messages.length}
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="glass p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-neon-cyan" />
              {creatorName} 채팅방
              <span className="px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-[10px] text-neon-cyan">
                LIVE
              </span>
            </h3>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 p-0.5 rounded-xl bg-muted/50">
            <button
              onClick={() => setMode("general")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                mode === "general"
                  ? "gradient-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💬 일반 채팅
            </button>
            <button
              onClick={() => setMode("fanclub")}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                mode === "fanclub"
                  ? "bg-purple-500/30 text-purple-200 shadow-sm border border-purple-400/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {fanclubLocked && <Lock className="w-3 h-3" />}
              💜 팬클럽 채팅
            </button>
          </div>

          {/* Messages */}
          <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-hide">
            {fanclubLocked ? (
              <div className="text-center py-6 space-y-2">
                <Lock className="w-7 h-7 mx-auto text-purple-400/70" />
                <p className="text-xs font-bold text-purple-300">팬클럽 전용 채팅방</p>
                <p className="text-[11px] text-muted-foreground">
                  {!user
                    ? "로그인 후 팬클럽에 가입하면 참여할 수 있어요."
                    : !isFanclubMember
                      ? "팬클럽에 가입하면 참여할 수 있어요."
                      : `${requiredLevel.emoji} ${requiredLevel.label} (${requiredLevel.minPoints}점) 달성 시 이용 가능`}
                </p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {mode === "fanclub" ? "💜 팬클럽 멤버끼리만 보이는 공간이에요!" : "첫 번째 메시지를 보내보세요! 💬"}
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="glass-sm p-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neon-purple">{msg.nickname}</span>
                    {mode === "fanclub" && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                        💜 멤버
                      </span>
                    )}
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
          {!fanclubLocked && (
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
                  placeholder={mode === "fanclub" ? "팬클럽 멤버에게 메시지..." : "메시지를 입력하세요..."}
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
          )}
        </div>
      )}
    </div>
  );
};

export default CreatorChat;
