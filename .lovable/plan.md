
## CTA 배너 밝기 개선

### 현재 문제
- 배경 gradient 투명도가 너무 낮음: `neon-purple / 0.18`, `neon-cyan / 0.12`
- 다크 배경(230 25% 7%)에서 거의 구별이 안 됨
- 텍스트도 `gradient-text` + `text-neon-cyan` 인데 배경과 대비가 약함

### 수정 방향

**`src/pages/Index.tsx`** — 배너 div 스타일 변경

1. **배경 opacity 대폭 상향**: `0.18` → `0.45`, `0.12` → `0.35`
2. **border 강화**: `border-primary/30` → `border-primary/60`
3. **glow 효과 추가**: `box-shadow`로 외곽에 보라/청록 glow 적용
4. **텍스트 대비 강화**: "1초 만에 참여" 텍스트를 `font-bold` + 약간 더 큰 사이즈로

```tsx
// 변경 전
style={{ background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.18), hsl(var(--neon-cyan) / 0.12))" }}

// 변경 후
style={{
  background: "linear-gradient(135deg, hsl(var(--neon-purple) / 0.45), hsl(var(--neon-cyan) / 0.35))",
  boxShadow: "0 0 24px hsl(var(--neon-purple) / 0.25), 0 0 8px hsl(var(--neon-cyan) / 0.15)"
}}
```

추가로 border에도 neon 색상 직접 적용:
```tsx
className="... border-2 border-white/20"
```
