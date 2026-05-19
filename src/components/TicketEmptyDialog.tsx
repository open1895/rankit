import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RPChargeModal from "./RPChargeModal";
import { FEATURES } from "@/config/features";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * 투표권 0개 도달 시 노출되는 팝업.
 * 1) 무료 투표권 받기 → /rewards
 * 2) RP 충전하기 → RPChargeModal (FEATURES.ENABLE_PAYMENT 가 true 일 때만)
 * 3) 닫기
 */
export default function TicketEmptyDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [chargeOpen, setChargeOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-lg font-black">투표권이 모두 소진되었어요 🎫</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              무료 보상으로 더 받을 수 있어요 🎁
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onOpenChange(false);
                navigate("/rewards");
              }}
              className="w-full h-12 rounded-xl font-bold text-sm gradient-primary text-primary-foreground active:scale-[0.98] transition-transform"
            >
              🎁 무료 투표권 받기
            </button>
            {FEATURES.ENABLE_PAYMENT && (
              <button
                onClick={() => setChargeOpen(true)}
                className="w-full h-12 rounded-xl font-bold text-sm glass-sm border border-amber-400/40 text-amber-500 active:scale-[0.98] transition-transform"
              >
                ⚡ RP 충전하기
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-full h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              닫기
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <RPChargeModal open={chargeOpen} onOpenChange={setChargeOpen} />
    </>
  );
}
