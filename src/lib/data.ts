export interface Creator {
  id: string;
  name: string;
  category: string;
  avatar_url: string;
  votes_count: number;
  rank: number;
  previousRank: number;
  is_verified: boolean;
}

export interface VoteEvent {
  id: string;
  fanLocation: string;
  creatorName: string;
  timestamp: Date;
}

export type UserBadge = "슈퍼 팬" | "투표 대장" | "신규 팬" | "열혈 서포터";

export const LOCATIONS = [
  "서울시 마포구", "부산시 해운대구", "대구시 수성구", "인천시 남동구",
  "광주시 서구", "대전시 유성구", "서울시 강남구", "경기도 성남시",
  "서울시 송파구", "제주시", "서울시 용산구", "경기도 수원시",
];

export function getVotesUntilNext(creator: Creator, creators: Creator[]): number | null {
  const sorted = [...creators].sort((a, b) => a.rank - b.rank);
  const idx = sorted.findIndex(c => c.id === creator.id);
  if (idx <= 0) return null;
  const above = sorted[idx - 1];
  return above.votes_count - creator.votes_count;
}
