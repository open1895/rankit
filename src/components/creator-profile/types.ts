import { Creator } from "@/lib/data";

export interface CommentItem {
  id: string;
  nickname: string;
  message: string;
  vote_count: number;
  post_count: number;
  created_at: string;
}

export type RankHistoryPoint = { recorded_at: string; rank: number; votes_count: number };
export type FanPeriod = "all" | "weekly" | "monthly";
export type ProfileTab = "overview" | "analytics" | "fans" | "community";

export type CreatorProfileData = Creator & {
  channel_link?: string;
  user_id?: string;
  youtube_channel_id?: string;
  chzzk_channel_id?: string;
  verification_status?: string;
  performance_tier?: string;
  featured_until?: string | null;
};

export interface FanRankingEntry {
  nickname: string;
  score: number;
  votes: number;
  posts: number;
  comments: number;
}
