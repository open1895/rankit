import { useState } from "react";
import { X, Send, Lock, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreatorFanLevel } from "@/hooks/useCreatorFanLevel";
import { FAN_PERMISSIONS, getFanLevelByLevel } from "@/lib/fanLevel";

interface CreatorMessageModalProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
}

const CreatorMessageModal = ({ open, onClose, creatorId, creatorName }: CreatorMessageModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, points, fanLevel } = useCreatorFanLevel(user?.id, creatorId);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const canSend = level >= FAN_PERMISSIONS.CAN_DIRECT_MESSAGE;
  const requiredLevel = getFanLevelByLevel(FAN_PERMISSIONS.CAN_DIRECT_MESSAGE);
  const pointsRemaining = Math.max(0, requiredLevel.minPoints - points);

  const handleSend = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!canSend) return;
    if (message.trim().length < 2 || message.length > 200) {
      toast.error("메시지는 2~200자로 입력해주세요.");
      return;
    }
    setSending(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await (supabase as any).from("creator_messages").insert({
      creator_id: creatorId,
      sender_id: user.id,
      sender_nickname: profile?.display_name || "익명 팬",
      message: message.trim(),
      fan_level: level,
    });
    setSending(false);
    if (error) {
      toast.error("메시지 전송에 실패했어요.");
      return;
    }
    toast.success(`💌 ${creatorName}님에게 응원 메시지를 보냈어요!`);
    setMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass rounded-2xl border border-glass-border p-5 space-y-4 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            {creatorName}에게 응원 메시지
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!canSend ? (
          <div className="space-y-3">
            <div className="glass-sm rounded-xl p-4 border border-purple-500/20 text-center space-y-2">
              <Lock className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-bold">
                {requiredLevel.emoji} {requiredLevel.label} 달성 시 이용 가능
              </p>
              <p className="text-xs text-muted-foreground">
                현재 {fanLevel.emoji} Lv.{level} ({points.toLocaleString()}점)
              </p>
              <p className="text-xs text-purple-400">
                <span className="font-bold">{pointsRemaining.toLocaleString()}점</span> 더 모으면 직접
                응원 메시지를 보낼 수 있어요!
              </p>
            </div>
            <div className="text-[11px] text-muted-foreground text-center space-y-0.5">
              <p>📊 점수 획득: 투표 +3점, 게시글 +5점, 댓글 +1점</p>
              <p>해당 크리에이터에 대한 활동만 집계돼요.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`px-2 py-0.5 rounded-full font-bold border ${fanLevel.color}`}>
                {fanLevel.emoji} {fanLevel.label}
              </span>
              <span>전용 권한 사용 중</span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`${creatorName}님께 진심 어린 응원의 메시지를 보내보세요!`}
              maxLength={200}
              className="min-h-[120px] resize-none glass-sm border-glass-border"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>크리에이터에게만 전달됩니다 🔒</span>
              <span>{message.length}/200</span>
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || message.trim().length < 2}
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-bold gap-1.5"
            >
              <Send className="w-4 h-4" />
              {sending ? "전송 중..." : "💌 응원 메시지 보내기"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CreatorMessageModal;
