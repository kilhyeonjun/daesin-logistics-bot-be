# 대신물류 모바일 웹 - 디자인 명세서

## 1. 프로젝트 개요

### 1.1 목적
- 기존 PC 전용 대신물류 페이지의 모바일 최적화 버전 제공
- 직관적인 UX로 배차 현황 조회 경험 개선
- 카카오톡 챗봇의 한계 보완

### 1.2 타겟 사용자
- 물류 담당자 (현장/사무실)
- 모바일 환경에서 빠른 조회가 필요한 사용자

### 1.3 핵심 가치
- **Speed**: 3초 내 원하는 정보 도달
- **Clarity**: 복잡한 데이터를 한눈에
- **Touch-friendly**: 엄지손가락 하나로 모든 조작

---

## 2. Information Architecture (IA)

```
🏠 홈 (/)
├── 오늘 현황 요약
├── 빠른 검색
└── 최근 검색 기록

🔍 검색 (/search)
├── 검색 타입 선택 (노선코드/차량번호/노선명)
├── 검색 입력
├── 결과 리스트
└── 필터/정렬

📊 통계 (/stats)
├── 날짜 선택
├── 요약 카드
└── 차트 (일별 추이)

📋 상세 (/route/[code])
├── 노선 상세 정보
├── 관련 차량 목록
└── 공유하기
```

---

## 3. 사용자 플로우

### 3.1 메인 플로우
```
앱 진입 → 오늘 현황 확인 → 검색 → 결과 확인 → 상세 보기
```

### 3.2 검색 플로우
```
검색 아이콘 탭 → 검색 타입 선택 → 키워드 입력 → 결과 리스트 → 항목 탭 → 상세 바텀시트
```

### 3.3 통계 플로우
```
통계 탭 → 날짜 선택 → 요약 확인 → 차트 스크롤 → 특정 날짜 탭 → 해당일 상세
```

---

## 4. 와이어프레임

### 4.1 홈 화면 (/)

```
┌─────────────────────────────────┐
│ ≡  대신물류                 🔔  │  ← 헤더 (48px)
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │  📅 2026.01.25 (토)      │   │  ← 날짜 표시
│  │                          │   │
│  │  ┌──────┐ ┌──────┐      │   │
│  │  │ 729  │ │110,283│      │   │  ← 요약 카드
│  │  │ 노선  │ │ 건수  │      │   │
│  │  └──────┘ └──────┘      │   │
│  │  ┌──────┐ ┌──────┐      │   │
│  │  │161,219│ │7.6억 │      │   │
│  │  │ 수량  │ │ 운임  │      │   │
│  │  └──────┘ └──────┘      │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🔍 노선, 차량, 지역 검색   │   │  ← 검색 바
│  └─────────────────────────┘   │
│                                 │
│  최근 검색                      │
│  ┌─────────────────────────┐   │
│  │ 🕐 노선 101102           ✕ │   │
│  │ 🕐 차량 4536             ✕ │   │
│  │ 🕐 도착 마포             ✕ │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  🏠    🔍    📊    ⋮           │  ← 하단 네비게이션 (56px)
│  홈    검색   통계  더보기       │
└─────────────────────────────────┘
```

### 4.2 검색 화면 (/search)

```
┌─────────────────────────────────┐
│ ←  검색                         │  ← 헤더
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🔍 검색어 입력            × │   │  ← 검색 입력
│  └─────────────────────────┘   │
│                                 │
│  ┌────────┬────────┬────────┐  │
│  │ 노선코드 │ 차량번호 │ 노선명  │  │  ← 검색 타입 탭
│  └────────┴────────┴────────┘  │
│                                 │
│  ─────────────────────────────  │
│  정렬: 운임순 ▼    필터 ▽       │  ← 필터/정렬
│  ─────────────────────────────  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 101102                   │   │
│  │ 충북음성 → 서울마포       │   │  ← 결과 카드
│  │ 🚛 충북80아4536          │   │
│  │ 건수 152 │ 수량 234       │   │
│  │ ₩1,245,000              │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 101103                   │   │
│  │ 충북음성 → 서울연희       │   │
│  │ 🚛 경기12가3456          │   │
│  │ 건수 98 │ 수량 156        │   │
│  │ ₩892,000                │   │
│  └─────────────────────────┘   │
│                                 │
│  ... (무한 스크롤)              │
│                                 │
└─────────────────────────────────┘
```

### 4.3 검색 결과 상세 (바텀시트)

```
┌─────────────────────────────────┐
│                                 │
│  (배경 딤 처리)                  │
│                                 │
├─────────────────────────────────┤  ← 드래그 핸들
│  ────────                       │
│                                 │
│  101102                         │
│  충북음성 → 서울마포             │  ← 노선 정보
│                                 │
│  ─────────────────────────────  │
│                                 │
│  차량정보                        │
│  🚛 충북80아4536                │
│  차량코드: 1234                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  배송현황                        │
│  ┌────────┬────────┬────────┐  │
│  │ 152건  │ 234개  │ 구간운임 │  │
│  │ 건수   │ 수량   │ ₩520,000│  │
│  └────────┴────────┴────────┘  │
│                                 │
│  총 운임                        │
│  ₩1,245,000                    │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ┌─────────────────────────┐   │
│  │      📤 공유하기         │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### 4.4 통계 화면 (/stats)

```
┌─────────────────────────────────┐
│ ≡  통계                    📅   │  ← 헤더 + 날짜선택
├─────────────────────────────────┤
│                                 │
│  ◀  2026년 1월  ▶              │  ← 월 네비게이션
│                                 │
│  ┌─────────────────────────┐   │
│  │  일 월 화 수 목 금 토    │   │
│  │     1  2  3  4  5  6    │   │  ← 캘린더 (간략)
│  │  7  8  9 10 11 12 13    │   │
│  │ 14 15 16 17 18 19 20    │   │
│  │ 21 22 23 24 ●25         │   │  ← 오늘 표시
│  └─────────────────────────┘   │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  1월 25일 (토)                  │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 729  │ │110,283│ │ 7.6억 │   │  ← 요약 카드
│  │ 노선  │ │ 건수  │ │ 운임  │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  주간 추이                       │
│  ┌─────────────────────────┐   │
│  │     📊                   │   │
│  │   ┃   ┃                 │   │  ← 막대 차트
│  │   ┃ ┃ ┃ ┃               │   │
│  │ ┃ ┃ ┃ ┃ ┃ ┃ ●          │   │
│  │ 월 화 수 목 금 토        │   │
│  └─────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  🏠    🔍    📊    ⋮           │
└─────────────────────────────────┘
```

---

## 5. 컴포넌트 시스템

### 5.1 디자인 토큰

#### Colors
```css
/* Primary */
--color-primary: #1a1f36;        /* 다크 네이비 - 메인 */
--color-primary-light: #2d3348;  /* 호버 상태 */

/* Accent */
--color-accent: #10b981;         /* 민트 그린 - 강조 */
--color-accent-light: #34d399;   /* 호버 */

/* Semantic */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-error: #ef4444;

/* Neutral */
--color-bg: #f8fafc;             /* 배경 */
--color-surface: #ffffff;        /* 카드 배경 */
--color-border: #e2e8f0;         /* 테두리 */
--color-text-primary: #1e293b;   /* 주요 텍스트 */
--color-text-secondary: #64748b; /* 보조 텍스트 */
--color-text-muted: #94a3b8;     /* 비활성 텍스트 */
```

#### Typography
```css
/* Font Family */
--font-sans: 'Pretendard', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;  /* 숫자용 */

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

#### Spacing
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

#### Radius
```css
--radius-sm: 0.375rem;  /* 6px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-full: 9999px;  /* pill */
```

#### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### 5.2 컴포넌트 목록

#### Layout Components
| 컴포넌트 | 설명 | Props |
|---------|------|-------|
| `AppShell` | 앱 전체 레이아웃 | children |
| `Header` | 상단 헤더 (48px) | title, leftAction, rightAction |
| `BottomNav` | 하단 네비게이션 (56px) | activeTab |
| `Container` | 콘텐츠 컨테이너 | children, padding |

#### Data Display
| 컴포넌트 | 설명 | Props |
|---------|------|-------|
| `StatCard` | 통계 카드 | label, value, icon, trend? |
| `RouteCard` | 노선 결과 카드 | route: RouteDto, onClick |
| `RouteDetail` | 노선 상세 바텀시트 | route: RouteDto, open, onClose |
| `StatsSummary` | 통계 요약 그리드 | stats: StatsDto |
| `BarChart` | 막대 차트 | data, xKey, yKey |

#### Input Components
| 컴포넌트 | 설명 | Props |
|---------|------|-------|
| `SearchBar` | 검색 입력 | value, onChange, placeholder |
| `SearchTabs` | 검색 타입 탭 | activeType, onTypeChange |
| `DatePicker` | 날짜 선택기 | value, onChange |
| `FilterSheet` | 필터 바텀시트 | filters, onApply |

#### Feedback
| 컴포넌트 | 설명 | Props |
|---------|------|-------|
| `LoadingSpinner` | 로딩 스피너 | size |
| `EmptyState` | 빈 상태 | icon, title, description |
| `ErrorState` | 에러 상태 | message, onRetry |
| `Toast` | 토스트 알림 | message, type |

#### Navigation
| 컴포넌트 | 설명 | Props |
|---------|------|-------|
| `BackButton` | 뒤로가기 | onClick |
| `TabBar` | 탭 바 | tabs, activeTab, onChange |

---

## 6. 인터랙션 & 애니메이션

### 6.1 페이지 전환
```css
/* 페이지 진입 */
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter {
  animation: page-enter 0.3s ease-out;
}
```

### 6.2 리스트 아이템 Stagger
```css
/* 리스트 아이템 순차 등장 */
.list-item {
  opacity: 0;
  animation: fade-in-up 0.4s ease-out forwards;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
/* ... */

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 6.3 바텀시트
```css
/* 바텀시트 등장 */
.bottom-sheet-backdrop {
  animation: fade-in 0.2s ease-out;
}

.bottom-sheet-content {
  animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### 6.4 숫자 카운트업
```typescript
// 통계 숫자 카운트업 효과
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const step = end / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  
  return count;
}
```

### 6.5 터치 피드백
```css
/* 카드 터치 피드백 */
.card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-sm);
}
```

### 6.6 스켈레톤 로딩
```css
/* 스켈레톤 shimmer 효과 */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    var(--color-bg) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 7. 반응형 브레이크포인트

```css
/* Mobile First */
/* Base: 320px ~ */

/* Small: 640px ~ */
@media (min-width: 640px) {
  /* 태블릿 세로 */
}

/* Medium: 768px ~ */
@media (min-width: 768px) {
  /* 태블릿 가로 */
  /* 2열 그리드 적용 */
}

/* Large: 1024px ~ */
@media (min-width: 1024px) {
  /* 데스크탑 */
  /* 사이드바 레이아웃 */
  /* 최대 너비 제한 */
}
```

### 레이아웃 변화
| 화면 | 레이아웃 |
|------|---------|
| Mobile (< 768px) | 1열, 하단 네비게이션 |
| Tablet (768px~) | 2열 그리드, 하단 네비게이션 |
| Desktop (1024px~) | 사이드바 + 메인, 최대 1280px |

---

## 8. 접근성 (A11y)

### 8.1 터치 타겟
- 최소 터치 영역: 44px × 44px
- 권장 터치 영역: 48px × 48px

### 8.2 색상 대비
- 텍스트/배경 대비: 최소 4.5:1
- 대형 텍스트 대비: 최소 3:1

### 8.3 포커스 표시
```css
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### 8.4 스크린 리더
- 모든 아이콘에 aria-label
- 로딩 상태에 aria-busy
- 동적 콘텐츠에 aria-live

---

## 9. 데이터 구조 (API 연동)

### 9.1 RouteDto
```typescript
interface RouteDto {
  id?: number;
  searchDate: string;      // "20260125"
  lineCode: string;        // "101102"
  lineName: string | null; // "충북음성→서울마포"
  carCode: string | null;  // "1234"
  carNumber: string | null;// "충북80아4536"
  count: number;           // 152
  quantity: number;        // 234
  sectionFare: number;     // 520000
  totalFare: number;       // 1245000
}
```

### 9.2 StatsDto
```typescript
interface StatsDto {
  totalRoutes: number;      // 729
  totalCount: number;       // 110283
  totalQuantity: number;    // 161219
  totalSectionFare: number; // 664355601
  totalFare: number;        // 769223956
}
```

### 9.3 API Endpoints
```
GET /api/routes/code/:code    → RouteDto[]
GET /api/routes/name/:name    → RouteDto[]
GET /api/routes/car/:number   → RouteDto[]
GET /api/routes/date/:date    → RouteDto[]
GET /api/stats/:date          → StatsDto
```

---

## 10. 파일 구조 (Next.js)

```
logistics-bot-web/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # 홈
│   │   ├── search/
│   │   │   └── page.tsx          # 검색
│   │   ├── stats/
│   │   │   └── page.tsx          # 통계
│   │   └── route/
│   │       └── [code]/
│   │           └── page.tsx      # 노선 상세
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── data-display/
│   │   │   ├── StatCard.tsx
│   │   │   ├── RouteCard.tsx
│   │   │   ├── RouteDetail.tsx
│   │   │   └── BarChart.tsx
│   │   ├── input/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchTabs.tsx
│   │   │   └── DatePicker.tsx
│   │   └── feedback/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── Skeleton.tsx
│   ├── hooks/
│   │   ├── useRoutes.ts
│   │   ├── useStats.ts
│   │   └── useCountUp.ts
│   ├── lib/
│   │   └── api.ts
│   ├── types/
│   │   └── api.ts
│   └── styles/
│       └── globals.css
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

---

## 11. 기존 사이트 분석 (PC 버전)

### 11.1 사이트 구조

```
http://logistics.ds3211.co.kr/
├── /daesin/jsp/logisticsNew/login/login.jsp  ← 로그인 페이지
├── /daesin/servlet/total.TotServlet          ← 메인 조회 (POST)
├── /daesin/jsp/logisticsNew/receipt/route_details.jsp  ← 경유지 상세
├── /daesin/jsp/total/lineGoodsTot_detail.jsp ← 차량 상세
└── http://www.ds3211.co.kr/mobile/loadPlan/list.jsp  ← 경유지 목록
```

### 11.2 기존 UI 분석 (PC 전용 문제점)

| 요소 | 현재 상태 | 모바일 문제 |
|------|----------|-------------|
| **레이아웃** | 고정 width 700~800px | 가로 스크롤 필요 |
| **폰트** | 9pt 굴림 | 너무 작음 |
| **테이블** | 13열 고정 테이블 | 읽기 어려움 |
| **터치 타겟** | 작은 링크 텍스트 | 터치 불가 수준 |
| **검색** | 드롭다운 + 입력 조합 | 복잡함 |
| **인코딩** | EUC-KR | 레거시 |

### 11.3 기존 기능 목록

| 기능 | 설명 | 크롤링 가능 |
|------|------|-------------|
| **노선 조회** | 날짜 + 노선코드 범위 검색 | ✅ 구현됨 |
| **노선명 검색** | 노선명으로 검색 | ✅ 구현됨 |
| **터미널별 조회** | 터미널 선택 조회 | ✅ 가능 |
| **도착지 검색** | 도착지명으로 검색 | ✅ 가능 |
| **지연 여부 필터** | 정상/지연/누락/자료없음 | ✅ 가능 |
| **차량 위치 (관제)** | 외부 API 연동 | ⚠️ 별도 API |
| **경유지 상세** | 팝업으로 표시 | ⚠️ 별도 크롤링 필요 |
| **발송지 상세** | 팝업으로 표시 | ⚠️ 별도 크롤링 필요 |
| **수정내역** | 운송장 수정 이력 | ⚠️ 별도 크롤링 필요 |
| **전자세금계산서** | 바로빌 외부 링크 | ❌ 외부 서비스 |

### 11.4 데이터 필드 (테이블 컬럼)

```
현재 크롤링 중인 필드:
├── 노선코드 (lineCode)
├── 노선명 (lineName) - "부곡터→연희동"
├── 차량코드 (carCode)
├── 차량번호 (carNumber) - "충북80아4536"
├── 건수 (count)
├── 수량 (quantity)
├── 구간운임 (sectionFare)
└── 전체운임 (totalFare)

추가 가능한 필드:
├── 관제 상태 (GPS 위치) - 외부 API
├── 경유지 정보 - 별도 페이지 크롤링
└── 지연 상태
```

### 11.5 검색 옵션 분석

```javascript
// 기존 사이트 검색 옵션
searchOpt: {
  "1": "노선명",      // lineName 입력
  "2": "노선코드",    // line1 ~ line2 범위
  "3": "터미널별",    // terminalCode 선택
  "4": "도착지검색"   // arriveArea 입력
}

searchDelayed: {
  "": "지연 여부 (전체)",
  "1": "정상",
  "2": "지연",
  "3": "누락",
  "4": "자료없음"
}

// 터미널 목록
terminals: [
  { code: "2221", name: "부곡터" },
  { code: "7010", name: "광주센터" },
  { code: "9030", name: "부산센터" },
  { code: "8010", name: "경북터" },
  { code: "8046", name: "대구터" },
  { code: "4310", name: "음성터" },
  { code: "5000", name: "대전센터" },
  { code: "2030", name: "인천센터" },
  { code: "7500", name: "여수센터" },
  { code: "2100", name: "화성터미널" },
  { code: "4000", name: "청주센터" }
]
```

### 11.6 외부 연동 API

```javascript
// 경유지 정보 (모바일 버전 존재)
const waypointUrl = `http://www.ds3211.co.kr/mobile/loadPlan/list.jsp?inputDate=${date}&streetCode=${lineCode}`;
```

---

## 12. FE 구현 시 고려사항

### 12.1 기존 BE API 확장 필요 여부

| 기능 | 현재 BE | FE 필요 | 조치 |
|------|---------|---------|------|
| 노선코드 검색 | ✅ | ✅ | 그대로 사용 |
| 노선명 검색 | ✅ | ✅ | 그대로 사용 |
| 차량번호 검색 | ✅ | ✅ | 그대로 사용 |
| 날짜별 조회 | ✅ | ✅ | 그대로 사용 |
| 통계 조회 | ✅ | ✅ | 그대로 사용 |
| **터미널별 조회** | ❌ | ✅ | BE 확장 필요 |
| **도착지 검색** | ❌ | ✅ | BE 확장 필요 |
| **지연 상태 필터** | ❌ | ⚠️ | 선택적 확장 |

### 12.2 UI 개선 포인트

| 기존 (PC) | 신규 (모바일) |
|-----------|---------------|
| 13열 테이블 | 카드 기반 리스트 |
| 드롭다운 검색타입 | 탭 UI |
| 팝업 상세보기 | 바텀시트 |
| 고정 너비 | 반응형 |
| 작은 폰트 | 가독성 좋은 크기 |
| 작은 링크 | 터치 친화적 버튼 |

### 12.3 MVP vs Full 범위

**MVP (Phase 1)**:
- [x] 홈: 오늘 현황 요약
- [x] 검색: 노선코드/노선명/차량번호
- [x] 통계: 날짜별 통계
- [x] 상세: 바텀시트 상세보기

**Full (Phase 2)**:
- [ ] 터미널별 필터
- [ ] 도착지 검색
- [ ] 지연 상태 필터
- [ ] 차량 위치 연동 (GPS)
- [ ] 경유지 상세

---

## 13. 다음 단계

1. [ ] FE 레포지토리 생성 (`logistics-bot-web`)
2. [ ] Next.js + Tailwind 프로젝트 초기화
3. [ ] 디자인 토큰 설정 (tailwind.config.ts)
4. [ ] 기본 레이아웃 컴포넌트 구현
5. [ ] 홈 페이지 구현
6. [ ] 검색 페이지 구현
7. [ ] 통계 페이지 구현
8. [ ] Vercel 배포 설정
