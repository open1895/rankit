import { Link } from "react-router-dom";
import { Medal, Trophy, Star, MessageSquare } from "lucide-react";
import FanBadge from "@/components/FanBadge";
import FanLevelBadge from "@/components/FanLevelBadge";
import FanAchievementBadges from "@/components/FanAchievementBadges";
import { FanPeriod, FanRankingEntry } from "./types";

interface FansTabProps {
  creatorId: string;
  fanRanking: FanRankingEntry[];
  fanPeriod: FanPeriod;
  setFanPeriod: (p: FanPeriod) => void;
  fanLoading: boolean;
}

const FansTab = ({ creatorId, fanRanking, fanPeriod, setFanPeriod, fanLoading }: FansTabProps) => (
  <>
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2"><Medal className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">🏅 팬 랭킹 TOP 10</h3></div>
      <div className="flex items-center gap-2">
        {([["all", "전체"], ["weekly", "주간"], ["monthly", "월간"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFanPeriod(key)} className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${fanPeriod === key ? "bg-primary text-primary-foreground" : "glass-sm text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>
      {fanLoading ? (
        <div className="text-center py-8 text-muted-foreground text-xs">로딩 중...</div>
      ) : fanRanking.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          {fanPeriod === "all" ? "아직 팬 활동 데이터가 없어요." : fanPeriod === "weekly" ? "이번 주 활동 데이터가 없어요." : "이번 달 활동 데이터가 없어요."}
          <br />투표하고 게시판에 참여해보세요! 🔥
        </div>
      ) : (
        <div className="space-y-1.5">
          {fanRanking.map((fan, idx) => {
            const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
            return (
              <div key={fan.nickname} className={`glass-sm px-3 py-2.5 flex items-center gap-3 ${idx < 3 ? "border border-primary/20" : ""}`}>
                <div className="w-6 text-center shrink-0">
                  {idx < 3 ? <Trophy className={`w-4 h-4 mx-auto ${medalColors[idx]}`} /> : <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold truncate ${idx === 0 ? "text-yellow-400" : "text-foreground"}`}>{fan.nickname}</span>
                    {idx === 0 && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                    <FanLevelBadge activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                    <FanAchievementBadges activity={{ votes: fan.votes, posts: fan.posts, comments: fan.comments }} />
                    <FanBadge voteCount={fan.votes} postCount={fan.posts} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">투표 {fan.votes}</span>
                    <span className="text-[9px] text-muted-foreground">게시글 {fan.posts}</span>
                    <span className="text-[9px] text-muted-foreground">댓글 {fan.comments}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold gradient-text">{fan.score}</div>
                  <div className="text-[8px] text-muted-foreground">점</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    <Link to={`/creator/${creatorId}/board`} className="block w-full glass p-4 text-center text-sm font-medium text-secondary hover:border-secondary/50 transition-all rounded-2xl">
      <span className="inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" />팬 게시판 바로가기</span>
    </Link>
  </>
);

export default FansTab;
