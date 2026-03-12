

## 분석 결과: 이미 대부분 구현되어 있습니다

요청하신 Creator Battles 기능을 코드베이스와 대조한 결과, **8개 항목 중 7개가 이미 구현**되어 있습니다.

### 이미 구현된 기능

| 항목 | 상태 | 구현 위치 |
|------|------|-----------|
| 1️⃣ DB 구조 (battles, battle_votes) | ✅ 완료 | DB 테이블 존재, RLS 적용 |
| 2️⃣ 투표 규칙 (1인 1투표, 로그인 필수) | ✅ 완료 | `battle-vote` Edge Function |
| 3️⃣ 배틀 UI (VS 카드, 투표 버튼, 퍼센티지) | ✅ 완료 | `BattlePage.tsx`, `CreatorBattleSection.tsx` |
| 4️⃣ 자동 배틀 생성 (카테고리/스코어 매칭) | ✅ 완료 | `generate-battles` Edge Function |
| 5️⃣ 홈페이지 통합 (배틀 오브 더 데이) | ✅ 완료 | `CreatorBattleSection` in `Index.tsx` |
| 7️⃣ 크리에이터 프로필 통합 | ✅ 완료 | `CreatorProfile.tsx`에 배틀 참여 이력 |
| 8️⃣ 어뷰징 방지 (로그인 필수, 중복 투표 방지) | ✅ 완료 | Edge Function에서 검증 |

### 미구현: 6️⃣ 영향력 점수에 배틀 승률 반영

현재 `batch_recalculate_ranks()` 함수의 영향력 점수 공식:
```
score = youtube_subscribers * 1.5 + chzzk_followers * 2.0 + instagram_followers * 1.2 + tiktok_followers * 0.8
```
이 공식에는 **투표 수**와 **배틀 승률**이 반영되지 않습니다.

요청하신 공식: `40% followers + 40% votes + 20% battle win rate`

### 구현 계획

**1. `batch_recalculate_ranks()` DB 함수 업데이트** (Migration)

- 각 크리에이터의 배틀 승률을 계산하는 서브쿼리 추가
- 새 공식 적용:
  - **팔로워 점수 (40%)**: 기존 SNS 구독자 가중합을 정규화
  - **투표 점수 (40%)**: `votes_count` 기반 정규화
  - **배틀 승률 (20%)**: `battles` 테이블에서 승/패 집계

**2. `battles` 테이블에 `category` 컬럼 추가** (Migration)

- 현재 `battles` 테이블에 `category` 컬럼이 없음
- `generate-battles` 함수에서 매칭 시 사용한 카테고리를 저장하도록 변경

**3. `generate-battles` Edge Function 업데이트**

- 새 배틀 생성 시 `category` 값을 함께 저장

**4. 배틀 완료 시 승자 기록 보강**

- `generate-battles`에서 만료 배틀 종료 시 승자(`winner_id`) 컬럼 활용 (현재 없으면 추가)

### 수정 파일

| 파일 | 변경 |
|------|------|
| Migration (새 파일) | `battles`에 `category`, `winner_id` 컬럼 추가 + `batch_recalculate_ranks()` 업데이트 |
| `supabase/functions/generate-battles/index.ts` | category 저장, 만료 시 winner_id 설정 |

기존 UI와 투표 로직은 변경 불필요합니다.

