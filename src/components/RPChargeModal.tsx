import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Crown, Star, Sparkles, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface RPChargeOption {
  amount: number;
  price: string;
  label?: string;
  icon: React.ReactNode;
}

const RP_OPTIONS: RPChargeOption[] = [
  { amount: 100, price: "₩1,100", icon: <Zap className="w-4 h-4" /> },
  { amount: 500, price: "₩4,900", icon: <Star className="w-4 h-4" /> },
  { amount: 1000, price: "₩8,900", label: "인기", icon: <Crown className="w-4 h-4" /> },
  { amount: 5000, price: "₩39,000", label: "최고 가치", icon: <Sparkles className="w-4 h-4" /> },
];

interface RPChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RPChargeModal = ({ open, onOpenChange }: RPChargeModalProps) => {
  const [selected, setSelected] = useState<number>(1000);
  const navigate = useNavigate();

  const handleCharge = () => {
    // Future: integrate with payment
    onOpenChange(false);
    import("sonner").then(({ toast }) => {
      toast.info("결제 시스템이 곧 연동됩니다. 무료 충전소를 이용해주세요! 🎁");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto glass border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-yellow-500" />
            RP 충전하기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {RP_OPTIONS.map((opt) => (
            <button
              key={opt.amount}
              onClick={() => setSelected(opt.amount)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                selected === opt.amount
                  ? "border-primary bg-primary/5 shadow-[0_0_16px_rgba(168,85,247,0.15)]"
                  : "border-border/50 hover:border-primary/30 bg-card/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    selected === opt.amount
                      ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {opt.icon}
                </div>
                <div className="text-left">
                  <div className="font-bold text-foreground">+{opt.amount.toLocaleString()} RP</div>
                  <div className="text-xs text-muted-foreground">{opt.price}</div>
                </div>
              </div>
              {opt.label && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                  {opt.label}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-1">
          RP는 투표, 예측, 배틀 참여에 사용됩니다.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCharge} className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90">
            <Zap className="w-4 h-4 mr-1" />
            충전하기
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 text-sm font-semibold border-primary/30 hover:bg-primary/5"
            onClick={() => {
              onOpenChange(false);
              navigate("/recharge");
            }}
          >
            <Gift className="w-4 h-4 mr-1 text-primary" />
            🎁 무료충전소 가기
          </Button>
          <p className="text-[10px] text-center text-muted-foreground">
            팬 파워를 충전하고 크리에이터를 응원하세요.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RPChargeModal;
