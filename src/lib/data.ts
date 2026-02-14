export interface Creator {
  id: string;
  name: string;
  category: string;
  avatar: string;
  votes: number;
  rank: number;
  previousRank: number;
  isVerified: boolean;
  channelUrl?: string;
}

export interface VoteEvent {
  id: string;
  fanLocation: string;
  creatorName: string;
  timestamp: Date;
}

export type UserBadge = "슈퍼 팬" | "투표 대장" | "신규 팬" | "열혈 서포터";

export const MOCK_CREATORS: Creator[] = [
  { id: "1", name: "코딩하는 민수", category: "IT/테크", avatar: "", votes: 12847, rank: 1, previousRank: 1, isVerified: true },
  { id: "2", name: "뷰티퀸 하나", category: "뷰티", avatar: "", votes: 11203, rank: 2, previousRank: 3, isVerified: true },
  { id: "3", name: "먹방의 신 준호", category: "먹방", avatar: "", votes: 10988, rank: 3, previousRank: 2, isVerified: true },
  { id: "4", name: "여행가 소연", category: "여행", avatar: "", votes: 9542, rank: 4, previousRank: 5, isVerified: true },
  { id: "5", name: "게임왕 태현", category: "게임", avatar: "", votes: 8901, rank: 5, previousRank: 4, isVerified: true },
  { id: "6", name: "댄서 유리", category: "댄스", avatar: "", votes: 7654, rank: 6, previousRank: 7, isVerified: false },
  { id: "7", name: "음악천재 시윤", category: "음악", avatar: "", votes: 7200, rank: 7, previousRank: 6, isVerified: false },
  { id: "8", name: "요리사 재민", category: "요리", avatar: "", votes: 6890, rank: 8, previousRank: 9, isVerified: false },
  { id: "9", name: "운동하는 서준", category: "피트니스", avatar: "", votes: 6340, rank: 9, previousRank: 8, isVerified: false },
  { id: "10", name: "일러스트 지은", category: "아트", avatar: "", votes: 5980, rank: 10, previousRank: 10, isVerified: true },
];

export const LOCATIONS = [
  "서울시 마포구", "부산시 해운대구", "대구시 수성구", "인천시 남동구",
  "광주시 서구", "대전시 유성구", "서울시 강남구", "경기도 성남시",
  "서울시 송파구", "제주시", "서울시 용산구", "경기도 수원시",
];

export function getRandomVoteEvent(): VoteEvent {
  const creator = MOCK_CREATORS[Math.floor(Math.random() * MOCK_CREATORS.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  return {
    id: Math.random().toString(36).substr(2, 9),
    fanLocation: location,
    creatorName: creator.name,
    timestamp: new Date(),
  };
}

export function getVotesUntilNext(creator: Creator): number | null {
  const idx = MOCK_CREATORS.findIndex(c => c.id === creator.id);
  if (idx <= 0) return null;
  const above = MOCK_CREATORS[idx - 1];
  return above.votes - creator.votes;
}
