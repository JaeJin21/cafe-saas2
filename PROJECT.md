# 카페가드 (CafeGuard) — 프로젝트 전체 문서

## 서비스 개요

네이버 카페는 카페마다 홍보 규칙이 다르다. 금지어, 허용 요일, 홍보 가능 등급 등이 제각각이라 사장님들이 일일이 규칙을 확인하고 홍보하는 게 번거롭고 실수도 잦다.

**카페가드**는 사장님이 카페 규칙을 붙여넣기만 하면, AI가 규칙을 분석해 개인화된 카페 대시보드를 만들어주고, 등업 퀘스트 → 홍보 가이드라인 → 홍보 전 컨펌까지 1:1로 도와주는 SaaS다.

---

## 핵심 사용자 플로우

```
1. 회원가입 / 로그인
        ↓
2. 카페 추가 (대시보드 메인)
   └─ 카페 이름(alias) + 네이버 카페 URL 입력
   └─ 사이드바에 즉시 반영
   └─ 등록 즉시 기본 미션 자동 생성
        ↓
3. 카페 상세 페이지 (/dashboard/cafes/[cafe_master_id])
   └─ ① 나의 현황: 등급/활동지수 입력, 다음 홍보가능일 계산 (최상단)
   └─ ② AI 규칙 분석: 공지 텍스트 → Groq AI → 내 규칙에 즉시 반영
   └─ ③ 내 규칙 설정: 개인 수정본 저장 (alias도 동기화)
        ↓
4. 오늘의 미션 (/dashboard/missions)
   └─ 카페별 그룹화된 미션 카드
   └─ 순차 완료 → 완료 시 나의 현황 자동 업데이트
   └─ 다가오는 미션 일정 표시
        ↓
5. 홍보 전 컨펌 (미구현)
```

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 + shadcn/ui |
| 백엔드 / DB | Supabase (PostgreSQL + Auth + RLS) |
| AI 분석 | Groq API (`groq-sdk`, llama-3.3-70b-versatile) |
| 알림 | Sonner (토스트) + `lib/notify.ts` (카카오/문자 확장 준비) |
| 아이콘 | lucide-react |

---

## DB 스키마

### `users` — 사장님 프로필
```
id, email, nickname, business_name, phone, plan(free/pro/enterprise), created_at, updated_at
```
- Supabase Auth `auth.users`와 1:1 연결, 신규 가입 시 트리거로 자동 생성

### `cafe_master` — 네이버 카페 공용 정보
```
id, name, url, category, region, member_count
banned_words[], promo_days[], promo_time_start, promo_time_end
promo_interval_days, level_required
posts_for_level_up, comments_for_level_up, days_for_level_up
notes, is_active, created_at, updated_at
```
- AI 분석 결과는 더 이상 cafe_master에 저장하지 않음 → rules_override(개인)에 저장
- name: 카페 추가 시 URL slug 기반으로 저장되는 공용 이름

### `user_cafe_map` — 유저가 등록한 카페 + 활동 현황
```
id, user_id, cafe_id
alias                          ← 단일 소스 카페 이름 (사이드바·미션·규칙 모두 이걸 씀)
rules_override (JSONB)         ← 개인 규칙 수정본 (AI 분석 결과 포함)
sort_order                     ← 사이드바 순서 (↑↓ 버튼으로 변경)
current_level, post_count, comment_count, active_days
last_promo_date, is_enabled, joined_at, created_at, updated_at
```
- `alias`: 모든 화면에서 카페 이름의 단일 소스. 내 규칙 저장 시 alias도 동기화
- `rules_override`: AI 분석 결과 + 개인 수정값이 함께 저장됨
- 화면 표시: alias 우선, 없으면 cafe_master.name

### `mission_log` — 일일 미션 이력
```
id, user_id, cafe_id, mission_date, mission_type(promo_post/comment/level_up_post/check_rule)
title, content, status(pending/done/skipped), done_at, result_note, created_at
```
- 다일 스케줄 지원: mission_date가 미래 날짜도 가능 (스케줄 미리 생성)

---

## 데이터 설계 원칙

| 데이터 | 저장 위치 | 공유 범위 |
|---|---|---|
| AI 분석 결과 | `user_cafe_map.rules_override` | 나만 |
| 개인 규칙 수정 | `user_cafe_map.rules_override` | 나만 |
| 개인 카페 별칭 | `user_cafe_map.alias` | 나만 |
| 활동 지수 | `user_cafe_map` | 나만 |
| 미션 스케줄 | `mission_log` | 나만 |

미션 생성 시 규칙 우선순위: `rules_override` > `cafe_master` (merge)

---

## 추가 RLS 정책 및 마이그레이션 (schema.sql 외 추가 실행)

```sql
-- cafe_master INSERT/UPDATE 허용
CREATE POLICY "cafe_master_insert_auth" ON public.cafe_master
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "cafe_master_update_own" ON public.cafe_master
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_cafe_map WHERE cafe_id = public.cafe_master.id AND user_id = auth.uid())
  );

-- user_cafe_map 컬럼 추가
ALTER TABLE public.user_cafe_map ADD COLUMN rules_override JSONB;
ALTER TABLE public.user_cafe_map ADD COLUMN alias TEXT;
ALTER TABLE public.user_cafe_map ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- mission_log 삭제 정책
CREATE POLICY "mission_log_delete_own" ON public.mission_log
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 페이지 구조

```
/login                         ✅ 완성
/signup                        ✅ 완성

/dashboard                     ✅ 완성 (통계 DB 연동, 오늘의 미션 현황 카드)
/dashboard/cafes/[id]          ✅ 완성 (나의현황 → AI분석 → 내 규칙 순서)
/dashboard/missions            ✅ 완성 (카페별 그룹, 스케줄 자동생성, 순차 토스트)
```

---

## 완성된 것

### 인증/레이아웃
- Next.js + Supabase 프로젝트 세팅
- 로그인 / 회원가입 / 로그아웃 / 미들웨어 라우트 보호
- 대시보드 레이아웃 (사이드바 + 메인)

### 사이드바
- 동적 카페 리스트 (alias 우선 표시)
- 카페 이름 수정 → alias 업데이트
- 카페 삭제 → 관련 미션 전체 삭제 (경고 포함)
- **↑↓ 버튼으로 순서 변경** (sort_order, 호버 시 표시)

### 대시보드 메인
- 카페 추가 폼 (이름 + URL)
- **통계 카드 DB 연동**: 등록된 카페 수, 오늘 미션 대기, 완료 미션 누적, 이번달 홍보 횟수
- **오늘의 미션 현황**: 카페별 첫 번째 pending 미션 표시, 클릭 시 미션 페이지 이동

### 카페 상세 페이지
- **순서**: 나의 현황 → AI 규칙 분석 → 내 규칙 설정
- **나의 현황** (최상단): 등급/게시글/댓글/활동일, 다음 홍보가능일 (등급 미달 시 "등업 필요" 표시), 등업까지 계산
- **AI 규칙 분석**: Groq API(llama-3.3-70b-versatile) → 분석 완료 시 rules_override **자동 저장** (저장 버튼 불필요)
- **내 규칙 설정**: 사용자가 수동 수정 후 저장 버튼으로 반영, alias도 동기화 → 사이드바 이름 즉시 갱신

### 오늘의 미션
- **카페별 카드 그룹화**: 한 카페 5~10분 집중 완료
- **순차 토스트**: 완료 시 같은 카페 다음 미션 → 다음 카페 미션 알림, **토스트의 "이동" 클릭 시 해당 카페 카드로 스크롤**
- **스케줄 자동 생성**: 게시글 2일에 1개, 댓글 하루 2개로 분산
- **조건 순서 보장**: 등업 조건 모두 충족 후에만 홍보 미션 생성
- **스케줄 재생성** 버튼 (항상 표시)
- **카페 없을 때**: "등록된 카페가 없습니다" 안내 표시 (생성 버튼 숨김)
- **미션 완료 시 나의 현황 자동 업데이트**: level_up_post → post_count+1, comment → comment_count+1, promo_post → last_promo_date 갱신
- **카페 이름 클릭** → 카페 상세 나의 현황 섹션으로 스크롤
- 삭제된 카페 미션 자동 필터링

### API / 라이브러리
- `/api/add-cafe`: 카페 추가 + 등록 즉시 미션 자동 생성
- `/api/analyze-rules`: Groq llama-3.3-70b-versatile, JSON mode
- `lib/mission-scheduler.ts`: 날짜별 미션 스케줄 계산 로직
- `lib/notify.ts`: 알림 추상화 (action 콜백 지원, 향후 카카오/문자 확장 가능)

---

## 미완성 / TODO

### Phase 3 — 홍보 컨펌 시스템
- 작성한 홍보 글 붙여넣기 → AI로 규칙 위반 여부 검사
- 금지어 / 요일·시간 / 등급 체크
- `mission_log`에 promo_post done 기록

### Phase 4 — UX 개선
- 등업 달성 시 자동 등급 업그레이드 알림
- 카카오톡 / 문자 알림 연동 (`lib/notify.ts` 확장)
- 카페별 홍보 캘린더 뷰
- 플랜 제한 (free: 카페 3개, pro: 무제한)

---

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   ├── add-cafe/route.ts         ✅ 카페 추가 + 미션 자동 생성
│   │   └── analyze-rules/route.ts    ✅ Groq AI 규칙 분석
│   ├── dashboard/
│   │   ├── cafes/[id]/page.tsx       ✅ 카페 상세 (나의현황/AI분석/내규칙)
│   │   ├── missions/page.tsx         ✅ 오늘의 미션 (카페별 그룹, 스케줄)
│   │   ├── layout.tsx                ✅ 서버 컴포넌트, sort_order 포함 fetch
│   │   └── page.tsx                  ✅ 메인 대시보드 (통계 DB 연동)
│   ├── login/page.tsx                ✅
│   ├── signup/page.tsx               ✅
│   └── globals.css / layout.tsx
├── components/
│   ├── ui/                           ✅ shadcn 컴포넌트
│   ├── cafe-request-form.tsx         ✅ 카페 추가 폼
│   └── sidebar.tsx                   ✅ 동적 리스트, 이름수정/삭제/순서변경
├── lib/
│   ├── mission-scheduler.ts          ✅ 미션 스케줄 계산 (게시글/댓글/홍보)
│   ├── notify.ts                     ✅ 알림 추상화 (toast → 카카오 확장 준비)
│   └── supabase/client.ts, server.ts ✅
├── middleware.ts                      ✅
└── types/index.ts                     ✅

supabase/
├── schema.sql                         ✅ 전체 스키마 + RLS
└── migrations/
```

---

## 환경 변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GROQ_API_KEY=...            ← Groq 무료 API (console.groq.com)
```
