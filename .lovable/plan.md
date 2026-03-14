

## 문제 분석

새로 추가된 80명의 크리에이터 카테고리가 영어(`gaming`, `mukbang`, `beauty`, `fitness`)로 저장되어 있어, UI의 한국어 카테고리 필터(`게임`, `먹방`, `뷰티`, `운동`)와 매칭되지 않습니다.

**현재 DB 상태:**
| 카테고리 | 크리에이터 수 | 문제 |
|----------|-------------|------|
| gaming | 20 | ❌ UI 필터 불일치 |
| mukbang | 20 | ❌ UI 필터 불일치 |
| beauty | 20 | ❌ UI 필터 불일치 |
| fitness | 20 | ❌ UI 필터 불일치 |
| 게임, 게임/스트리밍 등 | 나머지 | ✅ 정상 |

## 해결 방법

DB 마이그레이션으로 영어 카테고리를 한국어로 일괄 변환:

```sql
UPDATE creators SET category = '게임' WHERE category = 'gaming';
UPDATE creators SET category = '먹방' WHERE category = 'mukbang';
UPDATE creators SET category = '뷰티' WHERE category = 'beauty';
UPDATE creators SET category = '운동' WHERE category = 'fitness';
```

추가로 기존 복합 카테고리(`게임/스트리밍`, `먹방/요리`, `뷰티/패션`, `fitness/운동` 등)도 표준 카테고리로 통일:

```sql
UPDATE creators SET category = '게임' WHERE category IN ('게임/스트리밍');
UPDATE creators SET category = '먹방' WHERE category IN ('먹방/요리');
UPDATE creators SET category = '뷰티' WHERE category IN ('뷰티/패션');
UPDATE creators SET category = '운동' WHERE category IN ('fitness/운동');
UPDATE creators SET category = '음악' WHERE category = '음악/커버';
UPDATE creators SET category = '여행' WHERE category = '여행/브이로그';
UPDATE creators SET category = '테크' WHERE category IN ('테크/코딩');
UPDATE creators SET category = '아트' WHERE category = '아트/일러스트';
UPDATE creators SET category = '교육' WHERE category IN ('교육/독서');
UPDATE creators SET category = '댄스' WHERE category = '댄스/퍼포먼스';
```

## 수정 범위

| 대상 | 변경 |
|------|------|
| DB 마이그레이션 | 카테고리 영어→한국어 변환 + 복합 카테고리 통일 |
| `src/pages/Onboarding.tsx` | 카테고리 목록을 표준 단일 이름으로 업데이트 |
| `src/pages/MyPage.tsx` | 동일하게 카테고리 목록 업데이트 |

코드 변경은 최소한이며, 핵심은 DB 데이터 정리입니다.

