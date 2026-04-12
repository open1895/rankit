import { ExternalLink } from "lucide-react";

interface SnsLinksProps {
  channelLink?: string;
  youtubeChannelId?: string;
  chzzkChannelId?: string;
}

const SnsLinks = ({ channelLink, youtubeChannelId, chzzkChannelId }: SnsLinksProps) => {
  const isYoutubeLink = channelLink?.includes("youtube.com");
  const youtubeUrl = isYoutubeLink
    ? channelLink
    : youtubeChannelId
      ? `https://www.youtube.com/channel/${youtubeChannelId}`
      : "";
  const displayUrl = channelLink
    ? channelLink.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
    : youtubeUrl
      ? youtubeUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")
      : "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {(youtubeUrl || youtubeChannelId) && (
          <a href={youtubeUrl || `https://www.youtube.com/channel/${youtubeChannelId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 hover:bg-destructive/20 transition-colors" title="YouTube">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-destructive" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
        )}
        {chzzkChannelId && (
          <a href={`https://chzzk.naver.com/${chzzkChannelId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 hover:bg-green-500/20 transition-colors" title="치지직">
            <span className="text-xs font-black text-green-500">치</span>
          </a>
        )}
        {channelLink && !isYoutubeLink && (
          <a href={channelLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 hover:bg-secondary/20 transition-colors" title="채널">
            <ExternalLink className="w-3.5 h-3.5 text-secondary" />
          </a>
        )}
      </div>
      {displayUrl && (
        <a href={youtubeUrl || channelLink || ""} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block text-[11px] text-muted-foreground hover:text-primary truncate max-w-[200px] transition-colors">
          {displayUrl}
        </a>
      )}
    </div>
  );
};

export default SnsLinks;
