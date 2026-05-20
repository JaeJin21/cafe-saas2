import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight, Users, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import AdminFilters from './_components/AdminFilters'

function isAnalyzed(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function UpdatedBadge({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  if (!isAnalyzed(createdAt, updatedAt)) {
    return <span className="text-xs font-medium text-amber-600">미분석</span>
  }
  const days = daysSince(updatedAt)
  const color =
    days < 7 ? 'text-green-600' :
    days < 30 ? 'text-yellow-600' :
    'text-red-500'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {days === 0 ? '오늘 업데이트' : `${days}일 전 업데이트`}
    </span>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; users?: string; status?: string }>
}) {
  const { sort = 'updated', users = 'all', status = 'all' } = await searchParams

  const supabase = await createClient()

  const { data: cafes } = await supabase
    .from('cafe_master')
    .select('id, url, name, created_at, updated_at, banned_words')
    .order(sort === 'created' ? 'created_at' : 'updated_at', { ascending: false })

  const { data: userMaps } = await supabase
    .from('user_cafe_map')
    .select('cafe_id')

  const userCountByCafe: Record<string, number> = {}
  userMaps?.forEach(({ cafe_id }) => {
    userCountByCafe[cafe_id] = (userCountByCafe[cafe_id] ?? 0) + 1
  })

  let list = (cafes ?? []).map(c => ({
    ...c,
    userCount: userCountByCafe[c.id] ?? 0,
    analyzed: isAnalyzed(c.created_at, c.updated_at),
  }))

  if (users === 'has_users') list = list.filter(c => c.userCount > 0)
  if (users === 'no_users') list = list.filter(c => c.userCount === 0)
  if (status === 'analyzed') list = list.filter(c => c.analyzed)
  if (status === 'pending') list = list.filter(c => !c.analyzed)

  const total = cafes?.length ?? 0
  const pendingCount = (cafes ?? []).filter(c => !isAnalyzed(c.created_at, c.updated_at)).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">카페 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          규칙을 입력하면 해당 카페를 등록한 모든 사용자에게 즉시 적용됩니다.
        </p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '전체 카페', value: total },
          { label: '미분석', value: pendingCount },
          { label: '분석 완료', value: total - pendingCount },
        ].map(item => (
          <div key={item.label} className="rounded-lg border bg-background p-4 text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 사이드바 + 목록 */}
      <div className="flex gap-6">
        <AdminFilters sort={sort} userFilter={users} statusFilter={status} />

        {/* 카페 목록 */}
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border bg-background divide-y">
            {list.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground text-sm">
                조건에 맞는 카페가 없습니다.
              </p>
            ) : (
              list.map(cafe => {
                const bannedCount = (cafe.banned_words as string[] | null)?.length ?? 0

                return (
                  <Link
                    key={cafe.id}
                    href={`/admin/cafes/${cafe.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    {/* 분석 상태 */}
                    <div className="shrink-0 w-14 text-center">
                      {cafe.analyzed
                        ? <Badge className="text-[10px] px-1.5 bg-green-100 text-green-700 hover:bg-green-100">완료</Badge>
                        : <Badge variant="outline" className="text-[10px] px-1.5 text-amber-600 border-amber-300 bg-amber-50">대기</Badge>
                      }
                    </div>

                    {/* 카페 이름 + URL */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cafe.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{cafe.url}</p>
                    </div>

                    {/* 업데이트 시각 */}
                    <div className="shrink-0 flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <UpdatedBadge createdAt={cafe.created_at} updatedAt={cafe.updated_at} />
                    </div>

                    {/* 사용자 수 */}
                    <div className={`shrink-0 flex items-center gap-1.5 min-w-[56px] justify-end ${
                      cafe.userCount > 0 ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      <Users className="h-3.5 w-3.5" />
                      <span className={`text-sm font-semibold ${cafe.userCount > 0 ? '' : 'opacity-40'}`}>
                        {cafe.userCount}명
                      </span>
                    </div>

                    {/* 금지어 수 */}
                    <div className="shrink-0 text-xs text-muted-foreground w-14 text-right">
                      금지어 {bannedCount}개
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                  </Link>
                )
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">{list.length}개 표시 중</p>
        </div>
      </div>
    </div>
  )
}
