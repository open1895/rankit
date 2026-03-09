import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Crown, ArrowRight } from "lucide-react";

interface TopCreator {
  id: string;
  name: string;
  avatar_url: string;
  votes_count: number;
  category: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

const MonthlyTop3Widget = () => {
  const [top3, setTop3] = useState<TopCreator[]>([]);

  useEffect(() => {
    supabase
      .from("creators")
      .select("id, name, avatar_url, votes_count, category")
      .order("votes_count", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) setTop3(data);
      });
  }, []);

  if (top3.length === 0) return null;

  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}월`;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 border border-yellow-500/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500" />
          <span className="text-xs font-bold">{monthLabel} TOP 3</span>
        </div>
        <Link
          to="/monthly-top3"
          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
        >
          자세히 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex gap-2">
        {top3.map((creator, i) => (
          <Link
            key={creator.id}
            to={`/creator/${creator.id}`}
            className="flex-1 glass-sm rounded-xl p-2.5 text-center hover:scale-105 transition-transform space-y-1.5"
          >
            <div className="relative mx-auto w-12 h-12">
              <img
                src={creator.avatar_url}
                alt={creator.name}
                className="w-12 h-12 rounded-full object-cover"
                loading="lazy"
              />
              <span className="absolute -top-1 -left-1 text-lg">{MEDALS[i]}</span>
            </div>
            <div className="text-[11px] font-bold truncate">{creator.name}</div>
            <div className="text-[9px] text-muted-foreground">{creator.votes_count.toLocaleString()}표</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MonthlyTop3Widget;
