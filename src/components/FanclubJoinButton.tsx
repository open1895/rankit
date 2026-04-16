import { useEffect, useState } from "react";
import { Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface FanclubJoinButtonProps {
  creatorId: string;
  creatorName: string;
  onChange?: (joined: boolean, memberCount: number) => void;
}

const FanclubJoinButton = ({ creatorId, creatorName, onChange }: FanclubJoinButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const [{ count }, joinedRes] = await Promise.all([
        (supabase as any)
          .from("fanclub_members")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId),
        user
          ? (supabase as any)
              .from("fanclub_members")
              .select("id")
              .eq("creator_id", creatorId)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const newCount = count || 0;
      const isJoined = !!joinedRes.data;
      setMemberCount(newCount);
      setJoined(isJoined);
      onChange?.(isJoined, newCount);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [creatorId, user, onChange]);

  const handleJoin = async () => {
    if (!user) {
      toast.info("팬클럽 가입은 로그인이 필요해요.");
      navigate("/auth");
      return;
    }
    setBusy(true);
    const { error } = await (supabase as any).from("fanclub_members").insert({
      creator_id: creatorId,
      user_id: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error("팬클럽 가입에 실패했어요.");
      return;
    }
    setJoined(true);
    setMemberCount((n) => n + 1);
    onChange?.(true, memberCount + 1);
    toast.success(`💜 ${creatorName} 팬클럽에 가입했어요!`);
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!confirm(`${creatorName} 팬클럽에서 탈퇴할까요?`)) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("fanclub_members")
      .delete()
      .eq("creator_id", creatorId)
      .eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error("탈퇴에 실패했어요.");
      return;
    }
    setJoined(false);
    setMemberCount((n) => Math.max(0, n - 1));
    onChange?.(false, Math.max(0, memberCount - 1));
    toast.success("팬클럽에서 탈퇴했어요.");
  };

  return (
    <div className="space-y-1.5">
      <Button
        onClick={joined ? handleLeave : handleJoin}
        disabled={busy}
        variant="outline"
        className={`w-full h-11 rounded-xl text-sm font-bold gap-1.5 transition-all ${
          joined
            ? "glass-sm border-primary/40 text-primary hover:border-destructive/40 hover:text-destructive"
            : "border-pink-500/40 text-pink-400 hover:border-pink-500/70 hover:bg-pink-500/10"
        }`}
      >
        {joined ? (
          <>
            <Check className="w-4 h-4" />
            팬클럽 멤버
          </>
        ) : (
          <>
            <Heart className="w-4 h-4" />
            ❤️ 팬클럽 가입
          </>
        )}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        팬클럽 <span className="font-bold text-foreground">{memberCount.toLocaleString()}</span>명
      </p>
    </div>
  );
};

export default FanclubJoinButton;
