import { useState, forwardRef } from "react";
import { Creator } from "@/lib/data";
import OvertakeShareCard from "./OvertakeShareCard";

interface VoteResultModalProps {
  show: boolean;
  creator: Creator;
  aboveCreator: Creator | null;
  gap: number | null;
  siteUrl: string;
  onClose: () => void;
  onBonusVote: () => void;
  cachedBlob?: Blob | null;
  cachedUrl?: string | null;
  onImageReady?: (blob: Blob, url: string) => void;
}

const VoteResultModal = forwardRef<HTMLDivElement, VoteResultModalProps>(({ show, creator, aboveCreator, gap, siteUrl, onClose, onBonusVote, cachedBlob, cachedUrl, onImageReady }, ref) => {
  const [shared, setShared] = useState(false);

  if (!show) return null;

  return (
    <OvertakeShareCard
      creator={creator}
      aboveCreator={aboveCreator}
      gap={gap}
      siteUrl={siteUrl}
      onClose={() => {
        setShared(false);
        onClose();
      }}
      onShareBonus={onBonusVote}
      shared={shared}
      onShared={() => setShared(true)}
      cachedBlob={cachedBlob}
      cachedUrl={cachedUrl}
      onImageReady={onImageReady}
    />
  );
});

VoteResultModal.displayName = "VoteResultModal";

export default VoteResultModal;
