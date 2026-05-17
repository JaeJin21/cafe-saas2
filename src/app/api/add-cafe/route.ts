import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSchedule } from '@/lib/mission-scheduler'

function extractSlugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    return pathname.split('/').filter(Boolean).pop() || url
  } catch {
    return url
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { url, name } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    const trimmedUrl = url.trim()
    const alias = name?.trim() || extractSlugFromUrl(trimmedUrl)

    // 이미 같은 URL의 카페가 있는지 확인
    const { data: existing } = await supabase
      .from('cafe_master')
      .select('id, name')
      .eq('url', trimmedUrl)
      .maybeSingle()

    let cafeId: string

    if (existing) {
      // cafe_master.name은 건드리지 않음 (공용 데이터)
      cafeId = existing.id
    } else {
      const { data: newCafe, error } = await supabase
        .from('cafe_master')
        .insert({ url: trimmedUrl, name: extractSlugFromUrl(trimmedUrl) })
        .select('id')
        .single()
      if (error) throw error
      cafeId = newCafe.id
    }

    // 유저-카페 연결 + 개인 별칭 저장 (이미 있으면 alias 업데이트)
    const { error: mapError } = await supabase
      .from('user_cafe_map')
      .upsert(
        { user_id: user.id, cafe_id: cafeId, alias },
        { onConflict: 'user_id,cafe_id' }
      )
    if (mapError) throw mapError

    // 새 카페 등록 시 미션 자동 생성 (중복 없을 때만)
    const today = new Date().toISOString().split('T')[0]
    const { data: existingMissions } = await supabase
      .from('mission_log')
      .select('id')
      .eq('cafe_id', cafeId)
      .gte('mission_date', today)
      .limit(1)

    if (!existingMissions?.length) {
      const { data: mapData } = await supabase
        .from('user_cafe_map')
        .select('current_level, post_count, comment_count, active_days, last_promo_date')
        .eq('user_id', user.id)
        .eq('cafe_id', cafeId)
        .single()

      const { data: masterData } = await supabase
        .from('cafe_master')
        .select('id, name, level_required, posts_for_level_up, comments_for_level_up, days_for_level_up, promo_interval_days')
        .eq('id', cafeId)
        .single()

      if (mapData && masterData) {
        const scheduled = buildSchedule(masterData.id, alias, masterData, mapData, new Date())
        if (scheduled.length > 0) {
          await supabase.from('mission_log').insert(
            scheduled.map(m => ({ user_id: user.id, ...m, status: 'pending' }))
          )
        }
      }
    }

    return NextResponse.json({ id: cafeId, name: alias })
  } catch (err: any) {
    console.error('add-cafe error:', err)
    return NextResponse.json({ error: err.message || '카페 추가에 실패했습니다.' }, { status: 500 })
  }
}
