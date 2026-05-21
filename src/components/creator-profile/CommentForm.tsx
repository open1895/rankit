import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { CommentItem } from "./types";

interface CommentFormProps {
  creatorId: string;
  onCommentAdded: (c: CommentItem) => void;
}

const CommentForm = ({ creatorId, onCommentAdded }: CommentFormProps) => {
  const { user, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { setDisplayName(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const fallback = (user.user_metadata?.full_name as string | undefined)
        || (user.email ? user.email.split("@")[0] : "")
        || "팬";
      setDisplayName((data?.display_name?.trim() || fallback).slice(0, 20));
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading) {
    return <div className="glass-sm p-3 rounded-xl text-xs text-muted-foreground">불러오는 중...</div>;
  }

  if (!user) {
    return (
      <div className="glass-sm p-3 rounded-xl flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">로그인하면 응원 메시지를 남길 수 있어요 💬</p>
        <Link to="/auth">
          <Button size="sm" className="h-8 px-3 gradient-primary text-primary-foreground rounded-lg text-xs">로그인</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    const nick = (displayName || "팬").trim().slice(0, 20);
    const trimMsg = message.trim();
    if (nick.length < 2) { toast.error("프로필 닉네임을 2자 이상으로 설정해주세요."); return; }
    if (trimMsg.length < 2 || trimMsg.length > 50) { toast.error("메시지는 2~50자로 입력해주세요."); return; }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ creator_id: creatorId, nickname: nick, message: trimMsg })
      .select()
      .single();
    setSubmitting(false);
    if (error) { toast.error("메시지 등록에 실패했습니다."); return; }
    if (data) { onCommentAdded(data as CommentItem); setMessage(""); toast.success("응원 메시지가 등록되었습니다! 💬"); }
  };

  return (
    <div className="glass-sm p-3 rounded-xl space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-neon-purple">{displayName || "팬"}</span>
        <span className="text-[10px] text-muted-foreground">으로 등록</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="응원 메시지를 남겨보세요! (2~50자)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={50}
          className="h-8 text-xs bg-background/50 border-glass-border flex-1"
          onKeyDown={(e) => e.key === "Enter" && !submitting && handleSubmit()}
        />
        <Button onClick={handleSubmit} disabled={submitting} size="sm" className="h-8 px-3 gradient-primary text-primary-foreground rounded-lg text-xs">
          {submitting ? "..." : "등록"}
        </Button>
      </div>
    </div>
  );
};

export default CommentForm;
