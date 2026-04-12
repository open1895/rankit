import { Link } from "react-router-dom";
import { MessageCircle, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import FanBadge from "@/components/FanBadge";
import CreatorOfficialFeed from "@/components/CreatorOfficialFeed";
import CreatorChat from "@/components/CreatorChat";
import CommentForm from "./CommentForm";
import { CommentItem } from "./types";

interface CommunityTabProps {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  creatorUserId?: string;
  isVerified: boolean;
  comments: CommentItem[];
  onCommentAdded: (c: CommentItem) => void;
  feedTab: "cheer" | "official";
  setFeedTab: (t: "cheer" | "official") => void;
}

const CommunityTab = ({
  creatorId, creatorName, creatorAvatar, creatorUserId, isVerified,
  comments, onCommentAdded, feedTab, setFeedTab,
}: CommunityTabProps) => (
  <>
    <div className="glass p-4 space-y-3">
      <div className="flex gap-1 p-0.5 rounded-xl bg-muted/50">
        <button onClick={() => setFeedTab("cheer")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${feedTab === "cheer" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>💬 응원톡</button>
        <button onClick={() => setFeedTab("official")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${feedTab === "official" ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>✨ 공식 피드</button>
      </div>

      {feedTab === "cheer" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-semibold">응원 메시지</h3>
            <span className="text-xs text-muted-foreground">({comments.length})</span>
          </div>
          <CommentForm creatorId={creatorId} onCommentAdded={onCommentAdded} />
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">아직 응원 메시지가 없어요.<br />첫 번째 응원을 남겨보세요! 💬</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="glass-sm px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{c.nickname}</span>
                    <FanBadge voteCount={c.vote_count} postCount={c.post_count} />
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDistanceToNow(new Date(c.created_at), { locale: ko, addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-foreground/90">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {feedTab === "official" && (
        <CreatorOfficialFeed creatorId={creatorId} creatorName={creatorName} creatorAvatar={creatorAvatar} creatorUserId={creatorUserId} isVerified={isVerified} />
      )}
    </div>

    <div className="glass p-4 space-y-3">
      <CreatorChat creatorId={creatorId} creatorName={creatorName} />
    </div>

    <Link to={`/creator/${creatorId}/board`} className="block w-full glass p-4 text-center text-sm font-medium text-secondary hover:border-secondary/50 transition-all rounded-2xl">
      <span className="inline-flex items-center gap-2"><MessageSquare className="w-4 h-4" />팬 게시판 바로가기</span>
    </Link>
  </>
);

export default CommunityTab;
