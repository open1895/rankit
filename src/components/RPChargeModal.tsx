import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Gift, ShoppingCart } from "lucide-react";
import { TermsOfServiceModal } from "@/components/LegalModals";

interface RPChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RPChargeModal = ({ open, onOpenChange }: RPChargeModalProps) => {
  const navigate = useNavigate();
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm mx-auto glass border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              티켓 충전
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground text-center">
            티켓을 충전하고 크리에이터를 응원하세요! 🎫
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/ticket-store");
              }}
              className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              티켓 구매하기
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
              미사용 RP는 구매일로부터 7일 이내 환불 가능합니다.{" "}
              <button
                type="button"
                onClick={() => setTermsOpen(true)}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                이용약관 확인
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <TermsOfServiceModal open={termsOpen} onOpenChange={setTermsOpen} />
    </>
  );
};

export default RPChargeModal;
