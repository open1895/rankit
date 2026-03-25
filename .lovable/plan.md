

## 카테고리별 크리에이터 10명씩 추가 계획

### 개요
12개 카테고리 × 10명 = **총 120명**의 실제 한국 유튜버(구독자 20만 이하)를 DB에 추가합니다.

### 카테고리 목록
게임, 먹방, 뷰티, 음악, 운동, 여행, 테크, 교육, 댄스, 아트, 요리, 반려동물

### 실행 방법

#### 1단계: 크리에이터 리서치
- YouTube Data API를 활용하여 카테고리별 한국 크리에이터를 검색
- 구독자 20만 이하 필터링
- 유효한 `youtube_channel_id` 확보
- 채널명, 구독자 수, 프로필 이미지 URL 수집

#### 2단계: DB 삽입
- `creators` 테이블에 INSERT (insert 도구 사용)
- 필수 필드: `name`, `category`, `youtube_channel_id`, `youtube_subscribers`, `avatar_url`, `channel_link`
- `rank`는 0으로 초기 설정

#### 3단계: 랭킹 재계산
- `batch_recalculate_ranks()` RPC 호출로 전체 순위 재정렬

### 주의사항
- YouTube API 할당량 제한이 있으므로 검색을 효율적으로 수행 (카테고리당 1-2회 호출)
- 이미 DB에 존재하는 크리에이터는 중복 추가 방지
- 모든 크리에이터는 실제 활동 중인 채널이어야 함

### 예상 소요
- API 호출 및 데이터 수집 후 일괄 INSERT 실행

