# MC Design System Guide

> KYUTOPIA Mission Control 디자인 기준 문서. 새 페이지 작성 시 이 가이드를 따를 것.

## 레이아웃

- **컨테이너:** `max-w-7xl mx-auto` (전 페이지 동일)
- **패딩:** `p-3 sm:p-4 lg:p-6`
- **배경:** `min-h-screen bg-mc-bg`

## 카드

- **기본:** `bg-mc-bg-secondary border border-mc-border rounded-xl p-5`
- **요약(KPI):** `bg-gradient-to-br from-{color}-600/20 to-{color}-800/10 border border-{color}-500/20 rounded-xl p-5`

## 버튼

- **Primary:** `bg-mc-accent text-white px-4 py-2 rounded-lg hover:bg-mc-accent/80`
- **Success:** `bg-mc-accent-green text-white px-4 py-2 rounded-lg hover:bg-mc-accent-green/80`
- **Ghost:** `bg-mc-bg-tertiary text-mc-text-secondary px-4 py-2 rounded-lg hover:bg-mc-border`
- **소형:** `px-3 py-1.5 text-xs rounded-lg`

## 입력 필드

- `bg-mc-bg border border-mc-border rounded-lg px-3 py-2 text-sm text-mc-text focus:border-mc-accent outline-none`

## 텍스트

- **페이지 제목:** `text-2xl font-bold`
- **부제:** `text-mc-text-secondary text-sm`
- **카드 제목:** `text-lg font-bold`
- **본문:** `text-sm`
- **라벨:** `text-xs`

## 색상 토큰 (tailwind.config.ts)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `mc-bg` | `#0F172A` | 페이지 배경 |
| `mc-bg-secondary` | `#1E293B` | 카드/섹션 배경 |
| `mc-bg-tertiary` | `#334155` | 호버/Ghost 버튼 |
| `mc-border` | `#475569` | 보더 |
| `mc-text` | `#F8FAFC` | 기본 텍스트 |
| `mc-text-secondary` | `#94A3B8` | 보조 텍스트 |
| `mc-accent` | `#2563EB` | Primary 액센트 (파랑) |
| `mc-accent-green` | `#22C55E` | Success |
| `mc-accent-yellow` | `#F59E0B` | Warning |
| `mc-accent-red` | `#EF4444` | Error/긴급 |
| `mc-accent-purple` | `#A855F7` | 보라 |
| `mc-accent-cyan` | `#06B6D4` | 시안 |

## 반응형 브레이크포인트

- **모바일:** 기본 (단일 칼럼)
- **sm (640px):** 2칼럼 시작
- **md (768px):** 사이드바 표시
- **lg (1024px):** 4칼럼/풀 레이아웃

---

*작성: 솔희 (CSO) | 2026-02-18*
