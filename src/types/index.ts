export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface Cafe {
  id: string
  user_id: string
  name: string
  url: string
  description: string | null
  created_at: string
}

export interface CafeRule {
  id: string
  cafe_id: string
  banned_words: string[]         // 금지어 목록
  promo_days: DayOfWeek[]        // 홍보 허용 요일
  level_required: number         // 홍보 가능 최소 등급
  promo_time_start: string | null // 홍보 허용 시작 시간 (HH:MM)
  promo_time_end: string | null   // 홍보 허용 종료 시간 (HH:MM)
  notes: string | null
  updated_at: string
}

export interface Mission {
  id: string
  user_id: string
  cafe_id: string
  title: string
  content: string
  scheduled_date: string         // YYYY-MM-DD
  status: 'pending' | 'done' | 'skipped'
  created_at: string
  cafe?: Cafe
}
