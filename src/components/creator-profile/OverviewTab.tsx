import { Code2, Check, Copy, FileDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import AICreatorInsights from "@/components/AICreatorInsights";
import RankitVerifiedBadge from "@/components/RankitVerifiedBadge";
import CreatorPerformanceBadge from "@/components/CreatorPerformanceBadge";
import CreatorRewards from "@/components/CreatorRewards";
import PowerBoostSection from "@/components/PowerBoostCard";
import { CreatorProfileData } from "./types";

interface OverviewTabProps {
  creator: CreatorProfileData;
  creatorId: string;
  topPercent: number;
  activityScore: number;
  showEmbedModal: boolean;
  setShowEmbedModal: (v: boolean) => void;
  embedCopied: boolean;
  handleCopyEmbed: () => void;
  embedCode: string;
  pdfGenerating: boolean;
  handleDownloadPDF: () => void;
}

const OverviewTab = ({
  creator, creatorId, topPercent, activityScore,
  showEmbedModal, setShowEmbedModal, embedCopied, handleCopyEmbed, embedCode,
  pdfGenerating, handleDownloadPDF,
}: OverviewTabProps) => (
  <>
    {/* Quick Stats */}
    <div className="grid grid-cols-3 gap-2">
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-xl font-bold gradient-text">{creator.rank}</div>
        <div className="text-[10px] text-muted-foreground">현재 순위</div>
      </div>
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-xl font-bold text-secondary">{topPercent <= 0 ? "—" : `${topPercent}%`}</div>
        <div className="text-[10px] text-muted-foreground">상위 퍼센트</div>
      </div>
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-sm font-bold text-green-500">{activityScore}</div>
        <div className="text-[10px] text-muted-foreground">활동 점수</div>
      </div>
    </div>

    <AICreatorInsights creatorId={creatorId} />

    {/* Detail Stats */}
    <div className="grid grid-cols-3 gap-2">
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-sm font-bold text-primary">{creator.subscriber_count.toLocaleString()}</div>
        <div className="text-[9px] text-muted-foreground">총 구독자</div>
      </div>
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-sm font-bold text-secondary">{creator.votes_count.toLocaleString()}</div>
        <div className="text-[9px] text-muted-foreground">총 투표</div>
      </div>
      <div className="glass-sm p-3 text-center space-y-0.5">
        <div className="text-sm font-bold text-green-500">{activityScore}</div>
        <div className="text-[9px] text-muted-foreground">활동 점수</div>
      </div>
    </div>

    {/* Creator Tools */}
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Code2 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">크리에이터 도구</h3>
      </div>
      {creator.is_verified && (
        <div className="glass-sm p-3 rounded-xl border border-secondary/20 space-y-2">
          <RankitVerifiedBadge size="lg" />
          <p className="text-[11px] text-muted-foreground">이 크리에이터는 Rankit에서 공식 인증된 크리에이터입니다.</p>
        </div>
      )}
      <CreatorPerformanceBadge creatorId={creator.id} performanceTier={(creator as any).performance_tier} featuredUntil={(creator as any).featured_until} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">📦 내 순위 위젯 임베드</span>
          <button onClick={() => setShowEmbedModal(!showEmbedModal)} className="text-[10px] text-secondary hover:underline">{showEmbedModal ? "닫기" : "코드 보기"}</button>
        </div>
        {showEmbedModal && (
          <div className="space-y-2 animate-fade-in">
            <div className="glass-sm p-2.5 rounded-xl font-mono text-[10px] text-muted-foreground break-all border border-glass-border">
              {embedCode}
            </div>
            <button onClick={handleCopyEmbed} className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${embedCopied ? "bg-secondary/20 text-secondary border border-secondary/30" : "glass-sm text-secondary border border-secondary/20 hover:border-secondary/50"}`}>
              {embedCopied ? <><Check className="w-3.5 h-3.5" /> 복사 완료!</> : <><Copy className="w-3.5 h-3.5" /> 코드 복사</>}
            </button>
          </div>
        )}
        <Link to={`/widget-generator?creator=${creator.id}`}
          className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-primary hover:from-primary/30 hover:to-secondary/30 transition-all">
          <ExternalLink className="w-3.5 h-3.5" /> 내 위젯 가져가기 (3종 + 테마)
        </Link>
      </div>
      <CreatorRewards creatorId={creator.id} currentVotes={creator.votes_count} />
    </div>

    {/* Power Boost */}
    <div className="glass p-4 space-y-3">
      <PowerBoostSection creatorId={creator.id} creatorName={creator.name} creatorAvatar={creator.avatar_url} />
      <button onClick={handleDownloadPDF} disabled={pdfGenerating} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 glass-sm border border-primary/20 text-primary hover:border-primary/50 active:scale-[0.98] disabled:opacity-60">
        {pdfGenerating ? <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> 생성 중...</> : <><FileDown className="w-4 h-4" /> 주간 리포트 PDF</>}
      </button>
    </div>
  </>
);

export default OverviewTab;
