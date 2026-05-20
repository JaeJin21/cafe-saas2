import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    if (user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { cafeId, rules } = await req.json()
    if (!cafeId || !rules) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('cafe_master')
      .update({
        name: rules.name,
        banned_words: rules.banned_words,
        promo_days: rules.promo_days,
        promo_time_start: rules.promo_time_start,
        promo_time_end: rules.promo_time_end,
        promo_interval_days: rules.promo_interval_days,
        level_required: rules.level_required,
        posts_for_level_up: rules.posts_for_level_up,
        comments_for_level_up: rules.comments_for_level_up,
        days_for_level_up: rules.days_for_level_up,
        notes: rules.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cafeId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('admin/update-cafe error:', err.message)
    return NextResponse.json({ error: '저장에 실패했습니다.' }, { status: 500 })
  }
}
