import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface CommentInputProps {
  creatorId: string;
  creatorName: string;
  onClose: () => void;
}

const CommentInput = ({ creatorId, creatorName, onClose }: CommentInputProps) => {
  const { user } = useAuth();
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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

  const handleSubmit = async () => {
    const trimmedNick = nickname.trim();
    const trimmedMsg = message.trim();

    if (!trimmedNick || !trimmedMsg) {
      toast.error("닉네임과 메시지를 모두 입력해주세요.");
      return;
    }
    if (trimmedMsg.length > 50) {
      toast.error("메시지는 50자 이내로 작성해주세요.");
      return;
    }
    if (trimmedNick.length > 20) {
      toast.error("닉네임은 20자 이내로 작성해주세요.");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("comments").insert({
      creator_id: creatorId,
      nickname: trimmedNick,
      message: trimmedMsg,
      vote_count: 1,
      post_count: 1,
    });

    if (error) {
      toast.error("메시지 전송에 실패했습니다.");
      setSending(false);
      return;
    }

    toast.success("응원 메시지를 남겼습니다! 💬");
    setSending(false);
    onClose();
  };

  return (
    <div className="animate-fade-in glass-sm p-3 mt-2 space-y-2">
      <p className="text-xs text-neon-cyan font-medium">
        🎉 <span className="text-foreground">{creatorName}</span>에게 응원 한마디!
      </p>
      {user ? (
        <div className="text-xs text-muted-foreground">
          닉네임: <span className="text-foreground font-medium">{nickname || "로딩 중..."}</span>
        </div>
      ) : (
        <input
          type="text"
          placeholder="닉네임"
          maxLength={20}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-background/50 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50"
        />
      )}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="응원 메시지 (50자 이내)"
          maxLength={50}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 bg-background/50 border border-glass-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50"
        />
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="shrink-0 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          {sending ? "..." : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
