# 카페가드 (CafeGuard) — 프로젝트 전체 문서

## 서비스 개요

네이버 카페는 카페마다 홍보 규칙이 다르다. 금지어, 허용 요일, 홍보 가능 등급 등이 제각각이라 사장님들이 일일이 규칙을 확인하고 홍보하는 게 번거롭고 실수도 잦다.

**카페가드**는 사장님이 카페 규칙을 붙여넣기만 하면, AI가 규칙을 분석해 개인화된 카페 대시보드를 만들어주고, 등업 퀘스트 → 홍보 가이드라인 → 홍보 전 컨펌까지 1:1로 도와주는 SaaS다.

---

## 핵심 사용자 플로우

```
1. (비로그인) 대시보드 프리뷰 — 서비스 둘러보기 가능
   └─ 왼쪽 아래 플로팅 로그인 버튼 항상 표시
   └─ 기능 사용 시도 시 "로그인 후 이용 가능합니다" 팝업
        ↓
2. 회원가입 / 로그인
   └─ 업종 선택 (카드 버튼 UI, business_type 저장)
        ↓
3. 카페 추가 (대시보드 메인)
   └─ 카페 이름(alias) + 네이버 카페 URL 입력
   └─ 사이드바에 즉시 반영
   └─ 등록 즉시 기본 미션 자동 생성
        ↓
4. 카페 상세 페이지 (/dashboard/cafes/[cafe_master_id])
   └─ ① 나의 현황: 등급/활동지수 입력, 다음 홍보가능일 계산 (최상단)
   └─ ② AI 홍보글 검토: 작성한 홍보글 붙여넣기 → 규정 위반 여부 검사
   └─ ③ 내 규칙 설정: 개인 수정본 저장 (alias도 동기화)
        ↓
5. 오늘의 미션 (/dashboard/missions)
   └─ 카페별 그룹화된 미션 카드
   └─ 순차 완료 → 완료 시 나의 현황 자동 업데이트
   └─ 다가오는 미션 일정 표시
        ↓
6. 홍보 컨펌 (미구현)
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
id, email, nickname, business_name, phone, business_type, plan(free/pro/enterprise), created_at, updated_at
```
- Supabase Auth `auth.users`와 1:1 연결, 신규 가입 시 트리거로 자동 생성
- `business_type`: 회원가입 시 업종 선택 (카드 버튼 UI)

### `cafe_master` — 네이버 카페 공용 정보
```
id, name, url, category, region, member_count
banned_words[], promo_days[], promo_time_start, promo_time_end
promo_interval_days, level_required
posts_for_level_up, comments_for_level_up, days_for_level_up
notes, is_active, created_at, updated_at
```
- name: 카페 추가 시 URL slug 기반으로 저장되는 공용 이름

### `user_cafe_map` — 유저가 등록한 카페 + 활동 현황
```
id, user_id, cafe_id
alias                          ← 단일 소스 카페 이름 (사이드바·미션·규칙 모두 이걸 씀)
rules_override (JSONB)         ← 개인 규칙 수정본
sort_order                     ← 사이드바 순서 (↑↓ 버튼으로 변경)
current_level, post_count, comment_count, active_days
last_promo_date, is_enabled, joined_at, created_at, updated_at
```
- `alias`: 모든 화면에서 카페 이름의 단일 소스. 내 규칙 저장 시 alias도 동기화
- `rules_override`: 개인 수정값이 저장됨. 없으면 cafe_master 그대로 사용

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
| 개인 규칙 수정 | `user_cafe_map.rules_override` | 나만 |
| 개인 카페 별칭 | `user_cafe_map.alias` | 나만 |
| 활동 지수 | `user_cafe_map` | 나만 |
| 미션 스케줄 | `mission_log` | 나만 |
| 공용 카페 규칙 | `cafe_master` | 관리자 관리 |

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

-- users 업종 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_type TEXT;
```

---

## 페이지 구조

```
/login                         ✅ 완성
/signup                        ✅ 완성 (업종 선택 UI 포함)

/dashboard                     ✅ 완성 (비로그인 프리뷰 가능)
/dashboard/cafes/[id]          ✅ 완성
/dashboard/missions            ✅ 완성

/admin                         ✅ 완성 (ADMIN_EMAIL 이중 보호)
/admin/cafes/[id]              ✅ 완성
```

---

## 완성된 것

### 인증 / 레이아웃
- Next.js + Supabase 프로젝트 세팅
- 로그인 / 회원가입 (업종 선택) / 로그아웃
- 비로그인 사용자 대시보드 프리뷰 — 화면은 보이되 기능은 차단
- 왼쪽 아래 플로팅 로그인 버튼 (비로그인 시만 표시)
- 기능 시도 시 팝업 "로그인 후 이용 가능합니다" (3초 자동 소멸)
- AuthContext: 클라이언트 auth 상태 + requireAuth() 전역 제공
- 미들웨어: /admin 보호, 로그인 사용자 /login·/signup 리다이렉트

### 사이드바
- 동적 카페 리스트 (alias 우선 표시)
- 카페 이름 수정 → alias 업데이트
- 카페 삭제 → 관련 미션 전체 삭제 (경고 포함)
- ↑↓ 버튼으로 순서 변경 (sort_order, 호버 시 표시)
- 비로그인 시 로그아웃 버튼 숨김

### 대시보드 메인
- 카페 추가 폼 (이름 + URL) — 비로그인 시 차단
- 통계 카드 DB 연동: 등록 카페 수, 오늘 미션 대기, 완료 미션 누적, 이번달 홍보 횟수
- 오늘의 미션 현황: 카페별 첫 번째 pending 미션 표시

### 카페 상세 페이지
- **나의 현황** (최상단): 등급/게시글/댓글/활동일, 다음 홍보가능일, 등업까지 계산
- **AI 홍보글 검토**: 홍보글 붙여넣기 → Groq AI → 위반여부/이슈/수정제안 반환
- **내 규칙 설정**: 수동 수정 후 저장, alias 동기화 → 사이드바 즉시 갱신
- 모든 저장 액션 비로그인 시 차단

### 오늘의 미션
- 카페별 카드 그룹화
- 순차 토스트: 완료 시 다음 미션 알림, "이동" 클릭 시 해당 카드 스크롤
- 스케줄 자동 생성: 게시글 2일에 1개, 댓글 하루 2개
- 미션 완료 시 나의 현황 자동 업데이트 (post_count / comment_count / last_promo_date)
- 스케줄 재생성 버튼, 삭제된 카페 미션 자동 필터링
- 모든 액션 비로그인 시 차단

### 관리자 대시보드 (/admin)
- 접근: ADMIN_EMAIL 일치 여부로 서버사이드 체크 (middleware + layout 이중 보호)
- 카페 목록: 정렬(최신업데이트/등록일), 필터(사용자유무/분석상태) — URL 파라미터 기반
- 카페 상세 (/admin/cafes/[id]): cafe_master 규칙 직접 수정
- 저장 API (/api/admin/update-cafe): 서비스 롤 키로 RLS 우회하여 cafe_master UPDATE

### API / 라이브러리
- `/api/add-cafe`: 카페 추가 + 등록 즉시 미션 자동 생성
- `/api/analyze-rules`: Groq llama-3.3-70b-versatile, JSON mode (관리자 전용)
- `/api/review-post`: 홍보글 + 현재 규칙 → 위반여부/이슈/수정제안 반환 (로그인 필수)
- `/api/admin/update-cafe`: 서비스 롤 키로 cafe_master 업데이트
- `lib/mission-scheduler.ts`: 날짜별 미션 스케줄 계산
- `lib/notify.ts`: 알림 추상화 (action 콜백 지원, 카카오/문자 확장 준비)
- `lib/supabase/admin.ts`: 서비스 롤 클라이언트 (RLS 우회, 관리자 API 전용)

### 보안
- 모든 API route: 미인증 시 401 반환
- catch 블록: err.message 외부 노출 제거, console.error로만 기록

---

## 미완성 / TODO

### Phase 3 — 홍보 컨펌 시스템
- 홍보글 작성 후 mission_log promo_post done 기록 연동
- 홍보 가능 여부 사전 체크 (요일·시간·등급·재홍보 주기)

### Phase 4 — 알림 / UX
- 카카오 로그인 연동 + 나에게 보내기 API (자동 개인화 알림, 무료, 사업자 불필요)
- 등업 달성 시 자동 등급 업그레이드 알림
- 카페별 홍보 캘린더 뷰
- 플랜 제한 (free: 카페 3개, pro: 무제한)

---

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   ├── add-cafe/route.ts              ✅ 카페 추가 + 미션 자동 생성
│   │   ├── analyze-rules/route.ts         ✅ Groq AI 규칙 분석 (관리자 전용)
│   │   ├── review-post/route.ts           ✅ AI 홍보글 검토 (로그인 필수)
│   │   └── admin/update-cafe/route.ts     ✅ cafe_master 업데이트 (서비스 롤)
│   ├── admin/
│   │   ├── layout.tsx                     ✅ ADMIN_EMAIL 서버사이드 보호
│   │   ├── page.tsx                       ✅ 카페 목록 (필터/정렬)
│   │   ├── cafes/[id]/page.tsx            ✅ 카페 규칙 직접 수정
│   │   └── _components/AdminFilters.tsx   ✅ 필터 UI
│   ├── dashboard/
│   │   ├── cafes/[id]/page.tsx            ✅ 카페 상세 (나의현황/AI검토/내규칙)
│   │   ├── missions/page.tsx              ✅ 오늘의 미션
│   │   ├── layout.tsx                     ✅ AuthProvider + FloatingLoginButton
│   │   └── page.tsx                       ✅ 메인 대시보드 (통계)
│   ├── login/page.tsx                     ✅
│   ├── signup/page.tsx                    ✅ 업종 선택 포함
│   └── globals.css / layout.tsx
├── components/
│   ├── ui/                                ✅ shadcn 컴포넌트
│   ├── cafe-request-form.tsx              ✅ 카페 추가 폼
│   ├── floating-login-button.tsx          ✅ 왼쪽 아래 플로팅 로그인 버튼
│   └── sidebar.tsx                        ✅ 동적 리스트, 이름수정/삭제/순서변경
├── context/
│   └── auth-context.tsx                   ✅ 클라이언트 auth 상태 + requireAuth()
├── lib/
│   ├── mission-scheduler.ts               ✅ 미션 스케줄 계산
│   ├── notify.ts                          ✅ 알림 추상화
│   └── supabase/
│       ├── client.ts                      ✅
│       ├── server.ts                      ✅
│       └── admin.ts                       ✅ 서비스 롤 클라이언트
├── middleware.ts                           ✅ /admin 보호, 로그인 리다이렉트
└── types/index.ts                          ✅

supabase/
├── schema.sql                              ✅ 전체 스키마 + RLS
└── migrations/
    ├── 20260310000000_init_schema.sql      ✅
    └── 20260519000000_add_business_type.sql ✅
```

---

## 환경 변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   ← 관리자 API 전용 (RLS 우회)
GROQ_API_KEY=...                ← Groq 무료 API (console.groq.com)
ADMIN_EMAIL=...                 ← 관리자 이메일
```
