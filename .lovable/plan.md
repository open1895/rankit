

# Vote Combo System + Super Vote Multiplier + Season Ranking Reset 구현 계획

이전 대화에서 추천한 3가지 미완성 기능을 모두 구현합니다.

---

## 1. Database Changes (Migration)

### 새 컬럼 추가
- `profiles` 테이블에 `super_votes INTEGER DEFAULT 0` 추가 (보유 슈퍼투표 수)
- `votes` 테이블에 `combo_count INTEGER DEFAULT 1` 추가 (해당 투표의 콤보 단계)
- `votes` 테이블에 `is_super BOOLEAN DEFAULT false` 추가 (슈퍼투표 여부)
- `votes` 테이블에 `vote_weight INTEGER DEFAULT 1` 추가 (실제 반영 투표수, 슈퍼투표 시 2~3)

### 새 테이블: `season_snapshots`
시즌 종료 시 크리에이터별 최종 투표수를 저장 (기존 `season_rankings`와 별도로 votes_count 원본 보존용)

```sql
CREATE TABLE season_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Vote Combo System

### 로직 (vote edge function에 추가)
1. 투표 시 해당 유저의 **마지막 투표 시간**을 조회
2. 마지막 투표로부터 **10분 이내**이면 콤보 카운터 증가
3. 콤보 보상:
   - 3콤보 → +1 보너스 티켓
   - 5콤보 → +2 보너스 티켓  
   - 10콤보 → +3 보너스 티켓
4. 10분 초과 시 콤보 리셋 (combo_count = 1)
5. 응답에 `combo_count`와 `combo_bonus` 포함

### 프론트엔드
- `CreatorProfile.tsx`의 `handleVote` 응답에서 combo 정보 수신
- 콤보 달성 시 "🔥 3 COMBO!" 토스트 + 보너스 티켓 안내 표시
- 투표 버튼 근처에 현재 콤보 카운터 UI 표시

---

## 3. Super Vote Multiplier

### 로직
- 7일 연속 출석 달성 시 `super_votes += 1` 지급 (tickets edge function에서 처리)
- 투표 시 `use_super: true` 파라미터 전송 가능
- 슈퍼투표 사용 시:
  - `super_votes` 1 차감
  - `creators.votes_count`를 +3 (일반은 +1)
  - `votes` 테이블에 `is_super=true`, `vote_weight=3` 기록

### 프론트엔드
- 투표 버튼에 슈퍼투표 보유 시 "⚡ 슈퍼투표 사용" 토글 표시
- 슈퍼투표 사용 시 "+3 ⚡" 애니메이션

### DB Function 수정
- `increment_votes_count()` 트리거를 수정하여 `vote_weight` 만큼 증가하도록 변경

---

## 4. Season Ranking Reset

### season-rewards edge function 수정
기존 보상 지급 로직 이후에 추가:
1. 현재 모든 크리에이터의 `votes_count`와 `rank`를 `season_snapshots`에 저장
2. `season_rankings`에도 최종 순위 기록
3. 모든 크리에이터의 `votes_count = 0` 리셋
4. `batch_recalculate_ranks()` 실행하여 순위 재계산

### 관리자 UI
- `SeasonRewardsTab`의 "시즌 종료 & 보상 지급" 버튼에 확인 다이얼로그 추가
- "⚠️ 모든 크리에이터의 투표수가 0으로 초기화됩니다" 경고 문구

---

## 5. 수정 대상 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| Migration SQL | 새 컬럼, 새 테이블, increment_votes_count 수정 |
| `supabase/functions/vote/index.ts` | 콤보 감지, 슈퍼투표 처리 |
| `supabase/functions/season-rewards/index.ts` | 투표 리셋 + 스냅샷 로직 |
| `supabase/functions/tickets/index.ts` | 7일 연속 출석 시 슈퍼투표 지급 |
| `src/pages/CreatorProfile.tsx` | 콤보 UI, 슈퍼투표 토글 |
| `src/pages/AdminPanelPage.tsx` | 시즌 종료 확인 다이얼로그 |

