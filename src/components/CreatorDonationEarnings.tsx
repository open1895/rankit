import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Wallet, TrendingUp, Banknote } from "lucide-react";

interface CreatorDonationEarningsProps {
  creatorId: string;
}

interface EarningsData {
  total_earnings: number;
  pending_amount: number;
  settled_amount: number;
  donation_total: number;
  monthlyAmount: number;
  donorCount: number;
}

const CreatorDonationEarnings = ({ creatorId }: CreatorDonationEarningsProps) => {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: earnings } = await supabase
        .from("creator_earnings")
        .select("total_earnings, pending_amount, settled_amount, donation_total")
        .eq("creator_id", creatorId)
        .maybeSingle();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthlyDonations } = await supabase
        .from("creator_donations")
        .select("amount, donor_id")
        .eq("creator_id", creatorId)
        .eq("status", "completed")
        .gte("created_at", monthStart.toISOString());

      const monthlyAmount = (monthlyDonations || []).reduce((sum, d) => sum + d.amount, 0);
      const donorCount = new Set((monthlyDonations || []).map(d => d.donor_id)).size;

      setData({
        total_earnings: earnings?.total_earnings || 0,
        pending_amount: earnings?.pending_amount || 0,
        settled_amount: earnings?.settled_amount || 0,
        donation_total: earnings?.donation_total || 0,
        monthlyAmount,
        donorCount,
      });
      setLoading(false);
    };
    fetch();
  }, [creatorId]);

  const handleSettlement = () => {
    // 향후 정산 신청 모달 또는 페이지로 라우팅
    alert("정산 신청 기능은 준비 중입니다. 보유 잔액이 10,000원 이상이면 운영팀에 문의해주세요.");
  };

  if (loading) return null;
  if (!data || data.donation_total === 0) {
    return (
      <div className="glass p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-foreground">후원 수입</h3>
        </div>
        <p className="text-xs text-muted-foreground">아직 받은 후원이 없습니다. 팬들에게 응원 메시지를 부탁해보세요!</p>
      </div>
    );
  }

  const canWithdraw = data.pending_amount >= 10000;

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
        <h3 className="text-sm font-bold text-foreground">💝 후원 수입 현황</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass-sm p-3 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Wallet className="w-3 h-3" /> 총 후원 수입
          </div>
          <div className="text-sm font-bold text-foreground">{data.donation_total.toLocaleString()}원</div>
          <div className="text-[9px] text-muted-foreground">수수료 차감 후</div>
        </div>
        <div className="glass-sm p-3 rounded-xl space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TrendingUp className="w-3 h-3" /> 이번 달
          </div>
          <div className="text-sm font-bold text-orange-500">{data.monthlyAmount.toLocaleString()}원</div>
          <div className="text-[9px] text-muted-foreground">{data.donorCount}명 후원</div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">출금 가능 잔액</span>
          <span className="text-base font-bold text-orange-600 dark:text-orange-400">{data.pending_amount.toLocaleString()}원</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>누적 정산 완료</span>
          <span>{data.settled_amount.toLocaleString()}원</span>
        </div>
        <button
          onClick={handleSettlement}
          disabled={!canWithdraw}
          className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-muted disabled:text-muted-foreground transition"
        >
          <Banknote className="w-3.5 h-3.5" />
          {canWithdraw ? "출금 신청하기" : "최소 10,000원부터 출금 가능"}
        </button>
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        후원금의 10%는 플랫폼 운영 수수료로 사용됩니다.
      </p>
    </div>
  );
};

export default CreatorDonationEarnings;
