import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Heart, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface DonationRecord {
  id: string;
  creator_id: string;
  amount: number;
  message: string | null;
  created_at: string;
  creator_name?: string;
  creator_avatar?: string;
}

const MyDonationHistory = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("creator_donations")
        .select("id, creator_id, amount, message, created_at")
        .eq("donor_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const total = data.reduce((sum, d) => sum + d.amount, 0);
      setTotalSpent(total);

      // creator 정보 조인
      const creatorIds = [...new Set(data.map(d => d.creator_id))];
      const { data: creators } = await supabase
        .from("creators_public")
        .select("id, name, avatar_url")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map(c => [c.id, c]));
      const enriched = data.map(d => ({
        ...d,
        creator_name: creatorMap.get(d.creator_id)?.name || "알 수 없음",
        creator_avatar: creatorMap.get(d.creator_id)?.avatar_url || "",
      }));

      setDonations(enriched);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return null;
  if (donations.length === 0) return null;

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-orange-500 fill-orange-500" />
          <h3 className="text-sm font-bold text-foreground">내가 한 후원</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">총 {totalSpent.toLocaleString()}원</span>
      </div>

      <div className="space-y-2">
        {donations.slice(0, 5).map((d) => (
          <Link
            key={d.id}
            to={`/creator/${d.creator_id}`}
            className="flex items-center gap-3 p-2.5 rounded-xl glass-sm hover:border-orange-500/40 border border-transparent transition"
          >
            <img src={d.creator_avatar} alt={d.creator_name} className="w-9 h-9 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground truncate">{d.creator_name}</span>
                <span className="text-xs font-bold text-orange-500 whitespace-nowrap">{d.amount.toLocaleString()}원</span>
              </div>
              {d.message && <p className="text-[10px] text-muted-foreground truncate">{d.message}</p>}
              <span className="text-[9px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyDonationHistory;
