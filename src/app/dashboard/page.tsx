import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Coffee, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddCafeForm } from '@/components/cafe-request-form'

const MISSION_TYPE_LABEL: Record<string, string> = {
  level_up_post: '등업',
  comment: '댓글',
  promo_post: '홍보',
  check_rule: '대기',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  const [
    { data: cafes },
    { data: todayMissionData },
    { count: completedTotal },
    { count: promoCount },
  ] = await Promise.all([
    supabase.from('user_cafe_map').select('cafe_id, alias').eq('user_id', user?.id ?? ''),
    supabase.from('mission_log').select('id, cafe_id, status, mission_type, title').eq('mission_date', today),
    supabase.from('mission_log').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('mission_log').select('*', { count: 'exact', head: true })
      .eq('mission_type', 'promo_post').eq('status', 'done').gte('mission_date', monthStartStr),
  ])

  const cafeCount = cafes?.length ?? 0
  const todayPending = (todayMissionData ?? []).filter(m => m.status === 'pending').length
  const completed = completedTotal ?? 0
  const promoThisMonth = promoCount ?? 0

  const aliasMap = new Map((cafes ?? []).map(c => [c.cafe_id, c.alias]))
  const activeCafeIds = new Set((cafes ?? []).map(c => c.cafe_id))

  // 카페별 오늘의 첫 번째 pending 미션
  const seenCafes = new Set<string>()
  const previewMissions: { id: string; cafe_id: string; cafe_name: string; mission_type: string; title: string }[] = []
  for (const m of (todayMissionData ?? []).filter(m => m.status === 'pending' && activeCafeIds.has(m.cafe_id))) {
    if (!seenCafes.has(m.cafe_id)) {
      seenCafes.add(m.cafe_id)
      previewMissions.push({ ...m, cafe_name: aliasMap.get(m.cafe_id) || '알 수 없음' })
    }
  }

  const stats = [
    { label: '등록된 카페', value: cafeCount, sub: '개', icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '오늘 미션', value: todayPending, sub: '개 대기', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: '완료한 미션', value: completed, sub: '개', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
    { label: '이번 달 홍보', value: promoThisMonth, sub: '회', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  ]

  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground text-sm mt-1">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className={`rounded-md p-1.5 ${stat.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {stat.value}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{stat.sub}</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AddCafeForm />

      <Card className="shadow-none">
        <CardHeader className="pb-2 pt-5 px-6">
          <CardTitle className="text-base">오늘의 미션 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-6 pb-6">
          {previewMissions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              오늘 예정된 미션이 없습니다.
            </p>
          ) : (
            previewMissions.map((m) => (
              <Link key={m.id} href="/dashboard/missions">
                <div className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{m.cafe_name}</p>
                      <p className="text-xs text-muted-foreground">{m.title}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {MISSION_TYPE_LABEL[m.mission_type] ?? m.mission_type}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
