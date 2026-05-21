'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, MinusCircle, ListTodo, Calendar } from 'lucide-react'
import { notify } from '@/lib/notify'
import { buildSchedule } from '@/lib/mission-scheduler'
import { useAuth } from '@/context/auth-context'

type MissionRow = {
  id: string
  cafe_id: string
  mission_date: string
  mission_type: string
  title: string
  content: string | null
  status: 'pending' | 'done' | 'skipped'
  cafe_name: string
}

const MISSION_TYPE_LABEL: Record<string, string> = {
  level_up_post: '등업',
  comment: '댓글',
  promo_post: '홍보',
  check_rule: '대기',
}

// 오늘 미션 내 표시 순서
const MISSION_ORDER: Record<string, number> = {
  promo_post: 0,
  level_up_post: 1,
  comment: 2,
  check_rule: 3,
}

const todayStr = new Date().toISOString().split('T')[0]

function sortMissions(list: MissionRow[]) {
  return [...list].sort((a, b) => (MISSION_ORDER[a.mission_type] ?? 9) - (MISSION_ORDER[b.mission_type] ?? 9))
}

export default function MissionsPage() {
  const supabase = createClient()
  const { requireAuth } = useAuth()
  const [todayMissions, setTodayMissions] = useState<MissionRow[]>([])
  const [upcomingMissions, setUpcomingMissions] = useState<MissionRow[]>([])
  const [hasSchedule, setHasSchedule] = useState(false)
  const [hasCafes, setHasCafes] = useState(true)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const initialToastShown = useRef(false)

  const loadMissions = useCallback(async () => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 14)
    const endStr = endDate.toISOString().split('T')[0]

    const [{ data: missionData }, { data: activeCafeData }] = await Promise.all([
      supabase.from('mission_log').select('*, cafe_master(name)').gte('mission_date', todayStr).lte('mission_date', endStr).order('mission_date'),
      supabase.from('user_cafe_map').select('cafe_id, alias'),
    ])

    const activeCafeIds = new Set((activeCafeData ?? []).map((c: any) => c.cafe_id))
    setHasCafes(activeCafeIds.size > 0)
    const aliasMap = new Map((activeCafeData ?? []).map((c: any) => [c.cafe_id, c.alias]))

    const all = (missionData ?? [])
      .map((m: any) => ({
        ...m,
        cafe_name: aliasMap.get(m.cafe_id) || m.cafe_master?.name || '알 수 없음',
      }))
      .filter((m: any) => activeCafeIds.has(m.cafe_id))  // 삭제된 카페 미션 제외

    setHasSchedule(all.length > 0)
    setTodayMissions(sortMissions(all.filter(m => m.mission_date === todayStr)))
    setUpcomingMissions(all.filter(m => m.mission_date > todayStr))
  }, [])

  useEffect(() => {
    setLoading(true)
    loadMissions().finally(() => setLoading(false))
  }, [loadMissions])

  function scrollToCafe(cafeId: string) {
    document.getElementById(`cafe-${cafeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 첫 로드 시 첫 번째 미션 토스트
  useEffect(() => {
    if (initialToastShown.current || todayMissions.length === 0) return
    const first = todayMissions.find(m => m.status === 'pending')
    if (first) {
      initialToastShown.current = true
      notify({
        title: '오늘의 첫 미션',
        description: first.title,
        action: { label: '이동', onClick: () => scrollToCafe(first.cafe_id) },
      })
    }
  }, [todayMissions])

  async function generateSchedule() {
    if (!requireAuth()) return
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      const { data: cafes, error } = await supabase
        .from('user_cafe_map')
        .select(`
          cafe_id, current_level, post_count, comment_count, active_days, last_promo_date,
          rules_override,
          cafe_master (id, name, level_required, posts_for_level_up, comments_for_level_up, days_for_level_up, promo_interval_days)
        `)
      if (error) throw error

      // 기존 미래 pending 미션 삭제 후 재생성 (중복 방지)
      await supabase.from('mission_log').delete().gte('mission_date', todayStr).eq('status', 'pending')

      const toInsert: any[] = []
      const startDate = new Date()

      for (const cafe of (cafes ?? []) as any[]) {
        if (!cafe.cafe_master) continue
        // 개인 rules_override가 cafe_master보다 우선 적용
        const master = {
          ...cafe.cafe_master,
          ...(cafe.rules_override ?? {}),
          id: cafe.cafe_master.id,
          name: cafe.rules_override?.name || cafe.cafe_master.name,
        }
        const scheduled = buildSchedule(master.id, master.name, master, cafe, startDate)
        for (const m of scheduled) {
          toInsert.push({ user_id: user.id, ...m, status: 'pending' })
        }
      }

      if (toInsert.length === 0) {
        notify({ title: '생성할 미션이 없습니다', description: '모든 조건 달성 또는 홍보 대기 중입니다.' })
        return
      }

      const { error: insertError } = await supabase.from('mission_log').insert(toInsert)
      if (insertError) throw insertError

      await loadMissions()
      notify({ title: '스케줄 생성 완료', description: `총 ${toInsert.length}개 미션이 예약되었습니다.` })
    } catch (e: any) {
      notify({ title: '스케줄 생성 실패', description: e.message })
    } finally {
      setGenerating(false)
    }
  }

  async function updateStatus(id: string, status: 'done' | 'skipped', cafeId: string) {
    if (!requireAuth()) return
    const { error } = await supabase
      .from('mission_log')
      .update({ status, done_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) { notify({ title: '업데이트에 실패했습니다.' }); return }

    // 완료 시 나의 현황 자동 업데이트
    if (status === 'done') {
      const mission = todayMissions.find(m => m.id === id)
      if (mission?.mission_type === 'level_up_post') {
        const { data: curr } = await supabase.from('user_cafe_map').select('post_count').eq('cafe_id', cafeId).single()
        await supabase.from('user_cafe_map').update({ post_count: (curr?.post_count ?? 0) + 1 }).eq('cafe_id', cafeId)
      } else if (mission?.mission_type === 'comment') {
        const { data: curr } = await supabase.from('user_cafe_map').select('comment_count').eq('cafe_id', cafeId).single()
        await supabase.from('user_cafe_map').update({ comment_count: (curr?.comment_count ?? 0) + 1 }).eq('cafe_id', cafeId)
      } else if (mission?.mission_type === 'promo_post') {
        await supabase.from('user_cafe_map').update({ last_promo_date: new Date().toISOString().split('T')[0] }).eq('cafe_id', cafeId)
      }
    }

    const updated = todayMissions.map(m => m.id === id ? { ...m, status } : m)
    setTodayMissions(updated)

    // 같은 카페 다음 미션 → 다른 카페 미션 순으로 토스트
    const sameCafeNext = updated.find(m => m.cafe_id === cafeId && m.id !== id && m.status === 'pending')
    if (sameCafeNext) {
      notify({
        title: '다음 미션',
        description: sameCafeNext.title,
        action: { label: '이동', onClick: () => scrollToCafe(sameCafeNext.cafe_id) },
      })
    } else {
      const otherCafeNext = updated.find(m => m.cafe_id !== cafeId && m.status === 'pending')
      if (otherCafeNext) {
        notify({
          title: `${otherCafeNext.cafe_name} 미션`,
          description: otherCafeNext.title,
          action: { label: '이동', onClick: () => scrollToCafe(otherCafeNext.cafe_id) },
        })
      } else {
        notify({ title: '오늘 미션 모두 완료!', description: '수고하셨습니다.' })
      }
    }
  }

  const upcomingByDate = upcomingMissions.reduce<Record<string, MissionRow[]>>((acc, m) => {
    if (!acc[m.mission_date]) acc[m.mission_date] = []
    acc[m.mission_date].push(m)
    return acc
  }, {})

  const doneCount = todayMissions.filter(m => m.status === 'done').length
  const pendingCount = todayMissions.filter(m => m.status === 'pending').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">오늘의 미션</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {todayMissions.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground">{doneCount} / {todayMissions.length} 완료</p>
          )}
          <Button onClick={generateSchedule} disabled={generating} variant="outline" size="sm">
            {generating
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />생성 중...</>
              : '스케줄 재생성'}
          </Button>
        </div>
      </div>

      {/* 스케줄 없음 */}
      {!hasSchedule && (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <ListTodo className="h-10 w-10 text-muted-foreground" />
            {!hasCafes ? (
              <div className="text-center">
                <p className="font-medium">등록된 카페가 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  대시보드에서 카페를 먼저 추가해주세요
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="font-medium">미션 스케줄이 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    카페 규칙을 바탕으로 등업까지의 미션 일정을 자동 생성합니다
                  </p>
                </div>
                <Button onClick={generateSchedule} disabled={generating}>
                  {generating
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />생성 중...</>
                    : '미션 스케줄 자동 생성'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 오늘 미션 — 카페별 카드 */}
      {todayMissions.length > 0 && Object.entries(
        todayMissions.reduce<Record<string, MissionRow[]>>((acc, m) => {
          if (!acc[m.cafe_id]) acc[m.cafe_id] = []
          acc[m.cafe_id].push(m)
          return acc
        }, {})
      ).map(([cafeId, cafeMissions]) => {
        const doneCnt = cafeMissions.filter(m => m.status === 'done').length
        const firstPendingIdx = cafeMissions.findIndex(m => m.status === 'pending')

        return (
          <Card key={cafeId} id={`cafe-${cafeId}`} className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/cafes/${cafeId}#activity`}
                  className="text-base font-semibold hover:underline underline-offset-2"
                >
                  {cafeMissions[0].cafe_name}
                </Link>
                <span className="text-xs text-muted-foreground">{doneCnt} / {cafeMissions.length} 완료</span>
              </div>
              <CardDescription>순서대로 완료하면 다음 미션 알림이 옵니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {cafeMissions.map((mission, idx) => {
                const isNext = mission.status === 'pending' && idx === firstPendingIdx

                return (
                  <div
                    key={mission.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isNext ? 'border-primary/50 bg-primary/5' :
                      mission.status === 'done' ? 'bg-muted/50 opacity-60' :
                      mission.status === 'skipped' ? 'opacity-40' : 'opacity-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={isNext ? 'default' : 'outline'} className="text-xs shrink-0">
                          {MISSION_TYPE_LABEL[mission.mission_type] ?? mission.mission_type}
                        </Badge>
                        <span className={`text-sm font-medium ${
                          mission.status !== 'pending' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {mission.title}
                        </span>
                      </div>
                      {mission.content && (
                        <p className="text-xs text-muted-foreground pl-0.5">{mission.content}</p>
                      )}
                    </div>
                    {isNext && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                          onClick={() => updateStatus(mission.id, 'done', cafeId)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />완료
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => updateStatus(mission.id, 'skipped', cafeId)}>
                          <MinusCircle className="h-3.5 w-3.5 mr-1" />건너뜀
                        </Button>
                      </div>
                    )}
                    {mission.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                    {mission.status === 'skipped' && <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {todayMissions.length > 0 && pendingCount === 0 && (
        <p className="text-center py-2 text-sm text-muted-foreground">오늘의 모든 미션을 완료했습니다!</p>
      )}

      {/* 다가오는 미션 */}
      {Object.keys(upcomingByDate).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">다가오는 미션</h2>
          </div>
          {Object.entries(upcomingByDate).slice(0, 7).map(([date, missions]) => (
            <div key={date} className="rounded-lg border px-4 py-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', {
                  month: 'long', day: 'numeric', weekday: 'short',
                })}
              </p>
              {missions.map(m => (
                <div key={m.id} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {MISSION_TYPE_LABEL[m.mission_type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground truncate">{m.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
