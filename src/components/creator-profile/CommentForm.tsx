import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CommentItem } from "./types";

interface CommentFormProps {
  creatorId: string;
  onCommentAdded: (c: CommentItem) => void;
}

const CommentForm = ({ creatorId, onCommentAdded }: CommentFormProps) => {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimNick = nickname.trim();
    const trimMsg = message.trim();
    if (trimNick.length < 2 || trimNick.length > 20) { toast.error("닉네임은 2~20자로 입력해주세요."); return; }
    if (trimMsg.length < 2 || trimMsg.length > 50) { toast.error("메시지는 2~50자로 입력해주세요."); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from("comments").insert({ creator_id: creatorId, nickname: trimNick, message: trimMsg }).select().single();
    setSubmitting(false);
    if (error) { toast.error("메시지 등록에 실패했습니다."); return; }
    if (data) { onCommentAdded(data as CommentItem); setMessage(""); toast.success("응원 메시지가 등록되었습니다! 💬"); }
  };

  return (
    <div className="glass-sm p-3 rounded-xl space-y-2">
      {!nickname.trim() || nickname.trim().length < 2 ? (
        <Input placeholder="닉네임 (2~20자)" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="h-8 text-xs bg-background/50 border-glass-border" />
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-neon-purple">{nickname.trim()}</span>
          <button onClick={() => setNickname("")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">변경</button>
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="응원 메시지를 남겨보세요! (2~50자)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={50} className="h-8 text-xs bg-background/50 border-glass-border flex-1" onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()} />
        <Button onClick={handleSubmit} disabled={submitting} size="sm" className="h-8 px-3 gradient-primary text-primary-foreground rounded-lg text-xs">
          {submitting ? "..." : "등록"}
        </Button>
      </div>
    </div>
  );
};

export default CommentForm;
