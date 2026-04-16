import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Users, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface DonationStatsProps {
  creatorId: string;
}

interface RecentDonation {
  id: string;
  donor_nickname: string;
  amount: number;
  message: string | null;
  created_at: string;
}

const DonationStats = ({ creatorId }: DonationStatsProps) => {
  const [totalAmount, setTotalAmount] = useState(0);
  const [donorCount, setDonorCount] = useState(0);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        // 공개 메시지 가진 최근 후원 (RLS: 공개+완료된 것만 조회 가능)
        const { data: recent } = await supabase
          .from("creator_donations")
          .select("id, donor_nickname, amount, message, created_at")
          .eq("creator_id", creatorId)
          .eq("status", "completed")
          .eq("is_message_public", true)
          .order("created_at", { ascending: false })
          .limit(3);

        setRecentDonations(recent || []);

        // 총 후원 금액 + 후원자 수는 creator_earnings의 donation_total에서 조회
        const { data: earnings } = await supabase
          .from("creator_earnings")
          .select("donation_total")
          .eq("creator_id", creatorId)
          .maybeSingle();

        if (earnings) {
          // donation_total은 net (수수료 제외) 누적. 표시는 결제총액 기준이 더 직관적
          // net / 0.9 ≈ 결제총액
          const grossTotal = Math.round((earnings.donation_total || 0) / 0.9);
          setTotalAmount(grossTotal);
        }

        // 후원자 수: 공개 메시지 기준이라 부정확하므로 RPC 없이 distinct count 시도
        // 공개된 데이터로만 추정하되, 최소값으로 표시
        const { count } = await supabase
          .from("creator_donations")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("status", "completed")
          .eq("is_message_public", true);

        setDonorCount(count || 0);
      } catch (err) {
        console.error("Failed to fetch donation stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [creatorId]);

  if (loading) return null;
  if (totalAmount === 0 && recentDonations.length === 0) return null;

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
        <h3 className="text-sm font-semibold text-foreground">받은 후원</h3>
      </div>

      {totalAmount > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-sm p-3 text-center space-y-0.5">
            <div className="text-base font-bold text-orange-500">💝 {totalAmount.toLocaleString()}원</div>
            <div className="text-[10px] text-muted-foreground">총 후원 금액</div>
          </div>
          <div className="glass-sm p-3 text-center space-y-0.5">
            <div className="text-base font-bold text-amber-500">{donorCount}+ 명</div>
            <div className="text-[10px] text-muted-foreground">공개 후원자</div>
          </div>
        </div>
      )}

      {recentDonations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MessageCircle className="w-3 h-3" />
            <span>최근 응원 메시지</span>
          </div>
          {recentDonations.map((d) => (
            <div key={d.id} className="glass-sm p-2.5 rounded-xl space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-foreground truncate">{d.donor_nickname}</div>
                <div className="text-[10px] font-semibold text-orange-500 whitespace-nowrap">{d.amount.toLocaleString()}원</div>
              </div>
              {d.message && <p className="text-[11px] text-muted-foreground leading-snug">{d.message}</p>}
              <div className="text-[9px] text-muted-foreground/70">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ko })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationStats;
