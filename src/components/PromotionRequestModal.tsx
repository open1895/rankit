import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Rocket, Loader2 } from "lucide-react";

interface PromotionRequestModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  creatorId: string;
  creatorName: string;
}

const PROMOTION_TYPES = [
  { value: "featured", label: "⭐ Featured Creator", desc: "홈페이지 상단 Featured 섹션에 노출" },
  { value: "rising", label: "🚀 Rising Creator", desc: "AI Rising 섹션에 우선 노출" },
];

const DURATION_OPTIONS = [
  { value: "24h", label: "24시간", hours: 24 },
  { value: "3d", label: "3일", hours: 72 },
  { value: "7d", label: "7일", hours: 168 },
];

const PromotionRequestModal = ({ open, onOpenChange, creatorId, creatorName }: PromotionRequestModalProps) => {
  const [type, setType] = useState("featured");
  const [duration, setDuration] = useState("24h");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const durationHours = DURATION_OPTIONS.find(d => d.value === duration)?.hours || 24;
      const { data, error } = await supabase.functions.invoke("admin", {
        body: {
          action: "submit_promotion",
          creator_id: creatorId,
          promotion_type: type,
          duration_hours: durationHours,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || "프로모션 신청에 실패했습니다.");
        return;
      }
      toast.success("프로모션 신청이 완료되었습니다! 관리자 승인 후 적용됩니다. ⭐");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "프로모션 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            프로필 홍보 신청
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{creatorName}</span> 프로필을 홍보합니다.
          </p>

          {/* Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">홍보 타입</label>
            <div className="space-y-2">
              {PROMOTION_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setType(pt.value)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    type === pt.value
                      ? "border-primary bg-primary/5"
                      : "border-border/40 glass-sm hover:border-border"
                  }`}
                >
                  <div className="text-sm font-semibold">{pt.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{pt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">홍보 기간</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    duration === d.value
                      ? "gradient-primary text-primary-foreground"
                      : "glass-sm text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full gradient-primary text-primary-foreground font-bold"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            홍보 신청하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromotionRequestModal;
