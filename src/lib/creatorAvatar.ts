// Helper for resolving a creator's avatar URL with YouTube fallback.
// When `creators.avatar_url` is missing/placeholder, returns a URL to the
// `get-youtube-avatar` edge function which 302-redirects to the YouTube
// channel thumbnail (and backfills the DB).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const isMissing = (url?: string | null) =>
  !url || url.trim() === "" || url === "/placeholder.svg" || url.includes("placeholder");

export interface CreatorAvatarInput {
  id?: string | null;
  avatar_url?: string | null;
  youtube_channel_id?: string | null;
}

export function getCreatorAvatarUrl(creator: CreatorAvatarInput | null | undefined): string {
  if (!creator) return "/placeholder.svg";
  if (!isMissing(creator.avatar_url)) return creator.avatar_url as string;
  if (creator.youtube_channel_id && SUPABASE_URL) {
    const params = new URLSearchParams({ channel_id: creator.youtube_channel_id });
    if (creator.id) params.set("creator_id", creator.id);
    return `${SUPABASE_URL}/functions/v1/get-youtube-avatar?${params.toString()}`;
  }
  return "/placeholder.svg";
}

/** onError handler that swaps to YouTube avatar fallback if available. */
export function avatarOnError(
  e: React.SyntheticEvent<HTMLImageElement>,
  creator: CreatorAvatarInput | null | undefined,
) {
  const img = e.currentTarget;
  const fallback = getCreatorAvatarUrl({ ...creator, avatar_url: null });
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
