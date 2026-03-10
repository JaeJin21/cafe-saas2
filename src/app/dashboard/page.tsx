import { Coffee, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CafeRequestForm } from '@/components/cafe-request-form'

const stats = [
  {
    label: '등록된 카페',
    value: '0',
    sub: '개',
    icon: Coffee,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    label: '오늘 미션',
    value: '0',
    sub: '개 대기',
    icon: AlertCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    label: '완료한 미션',
    value: '0',
    sub: '개',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50',
  },
  {
    label: '이번 달 홍보',
    value: '0',
    sub: '회',
    icon: TrendingUp,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
]

const recentMissions = [
  { cafe: '맛집탐방 카페', task: '홍보글 작성', day: '오늘', status: 'pending' },
  { cafe: '소상공인 모임', task: '댓글 3개 달기', day: '오늘', status: 'pending' },
  { cafe: '동네 사장님들', task: '등업용 게시글', day: '내일', status: 'upcoming' },
]

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">대시보드</h1>
        <p className="text-muted-foreground text-sm mt-1">{today}</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {stat.sub}
                  </span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 카페 분석 요청 폼 */}
      <CafeRequestForm />

      {/* 오늘의 미션 미리보기 */}
      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">오늘의 미션 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentMissions.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{m.cafe}</p>
                  <p className="text-xs text-muted-foreground">{m.task}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{m.day}</span>
                <Badge
                  variant={m.status === 'pending' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {m.status === 'pending' ? '대기중' : '예정'}
                </Badge>
              </div>
            </div>
          ))}
          {recentMissions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              오늘 예정된 미션이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
