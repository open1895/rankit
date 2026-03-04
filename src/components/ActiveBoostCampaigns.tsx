import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BoostProgressCard } from "@/components/PowerBoostCard";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface BoostCampaign {
  id: string;
  creator_id: string;
  goal: number;
  current_points: number;
  status: string;
  started_at: string;
  ends_at: string;
  creator_name?: string;
  creator_avatar?: string;
}

const ActiveBoostCampaigns = () => {
  const [campaigns, setCampaigns] = useState<BoostCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("boost_campaigns" as any)
        .select("*")
        .eq("status", "active")
        .order("current_points", { ascending: false })
        .limit(5);

      if (!data || (data as any[]).length === 0) { setLoading(false); return; }

      const raw = data as any[];
      const now = Date.now();
      const active = raw.filter((c: any) => new Date(c.ends_at).getTime() > now);
      if (active.length === 0) { setLoading(false); return; }

      // Fetch creator info
      const creatorIds = [...new Set(active.map((c: any) => c.creator_id))];
      const { data: creators } = await supabase
        .from("creators")
        .select("id, name, avatar_url")
        .in("id", creatorIds);

      const creatorMap = new Map((creators || []).map((c) => [c.id, c]));

      setCampaigns(
        active.map((c: any) => {
          const cr = creatorMap.get(c.creator_id);
          return { ...c, creator_name: cr?.name || "크리에이터", creator_avatar: cr?.avatar_url || "" };
        })
      );
      setLoading(false);
    };

    fetch();

    const channel = supabase
      .channel("active-boosts")
      .on("postgres_changes", { event: "*", schema: "public", table: "boost_campaigns" }, () => { fetch(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading || campaigns.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h2 className="text-base font-bold gradient-text">Active Power Boost</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 rounded-full glass-sm">
          {campaigns.length}개 진행 중
        </span>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Link key={campaign.id} to={`/creator/${campaign.creator_id}`} className="block">
            <BoostProgressCard campaign={campaign} compact />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ActiveBoostCampaigns;
