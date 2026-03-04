import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Ticket, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

interface PredictionUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  total_bets: number;
  wins: number;
  total_reward: number;
  hit_rate: number;
}

const medals = ["🥇", "🥈", "🥉"];

const PredictionLeaderboard = () => {
  const [monthOffset, setMonthOffset] = useState(0);

  const monthLabel = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthOffset);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  })();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["prediction-leaderboard", monthOffset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_prediction_leaderboard", {
        p_month_offset: monthOffset,
      });
      if (error) throw error;
      return (data || []) as PredictionUser[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="예측왕 명예의 전당 | Rankit"
        description="이번 달 예측 적중률 TOP 10 유저를 확인하세요!"
      />

      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              예측왕 명예의 전당
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              적중률 TOP 10 (최소 3회 참여)
            </p>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((p) => p + 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[100px] text-center">
            {monthLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((p) => Math.max(0, p - 1))}
            disabled={monthOffset === 0}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Leaderboard */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                이번 달 데이터가 아직 없습니다
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                최소 3회 이상 참여한 유저가 집계됩니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.map((user, idx) => (
              <Card
                key={user.user_id}
                className={`transition-all ${
                  idx === 0
                    ? "border-primary/40 bg-primary/5 shadow-md"
                    : idx < 3
                    ? "border-primary/20 bg-primary/[0.02]"
                    : ""
                }`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {idx < 3 ? (
                      <span className="text-xl">{medals[idx]}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-muted/50 overflow-hidden shrink-0 border border-border">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        {user.display_name.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.display_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{user.wins}/{user.total_bets}전</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Ticket className="w-3 h-3" />
                        +{user.total_reward}
                      </span>
                    </div>
                  </div>

                  {/* Hit rate */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-lg font-black ${
                        user.hit_rate >= 80
                          ? "text-primary"
                          : user.hit_rate >= 60
                          ? "text-green-500"
                          : "text-foreground"
                      }`}
                    >
                      {user.hit_rate}%
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      <TrendingUp className="w-3 h-3" />
                      적중률
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info card */}
        <Card className="mt-6 border-dashed">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              예측왕 선정 기준
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>월간 최소 3회 이상 예측 게임 참여</li>
              <li>적중률(승리 수 / 전체 참여 수) 기준 정렬</li>
              <li>동률 시 승리 수 → 총 보상 순으로 결정</li>
              <li>매월 1일 자동 초기화</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PredictionLeaderboard;
