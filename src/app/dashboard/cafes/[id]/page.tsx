'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, X, ExternalLink, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type CafeRules = {
  name: string
  banned_words: string[]
  promo_days: number[]
  promo_time_start: string | null
  promo_time_end: string | null
  promo_interval_days: number
  level_required: number
  posts_for_level_up: number | null
  comments_for_level_up: number | null
  days_for_level_up: number | null
  notes: string | null
}

type CafeMaster = CafeRules & {
  id: string
  url: string
  updated_at: string
}

type UserCafeMap = {
  id: string
  alias: string | null
  current_level: number
  post_count: number
  comment_count: number
  active_days: number
  last_promo_date: string | null
  joined_at: string | null
  rules_override: CafeRules | null
}

type ActivityState = Pick<
  UserCafeMap,
  'current_level' | 'post_count' | 'comment_count' | 'active_days' | 'last_promo_date' | 'joined_at'
>

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function mergeRules(base: CafeMaster, override: CafeRules | null): CafeRules {
  if (!override) return { ...base }
  return { ...base, ...override }
}

export default function CafeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [cafe, setCafe] = useState<CafeMaster | null>(null)
  const [userMap, setUserMap] = useState<UserCafeMap | null>(null)
  const [loading, setLoading] = useState(true)

  // ① AI 홍보글 검토
  const [postText, setPostText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<{
    ok: boolean
    issues: string[]
    suggestion: string | null
    summary: string
  } | null>(null)

  // ② 내 규칙
  const [rules, setRules] = useState<CafeRules | null>(null)
  const [newBannedWord, setNewBannedWord] = useState('')
  const [savingRules, setSavingRules] = useState(false)

  // ③ 나의 현황
  const [activity, setActivity] = useState<ActivityState | null>(null)
  const [editingActivity, setEditingActivity] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: cafeData }, { data: mapData }] = await Promise.all([
        supabase.from('cafe_master').select('*').eq('id', params.id).single(),
        supabase.from('user_cafe_map').select('*').eq('cafe_id', params.id).single(),
      ])

      if (cafeData) {
        const c = cafeData as CafeMaster
        setCafe(c)
        const override = (mapData?.rules_override as CafeRules | null) ?? null
        const merged = mergeRules(c, override)
        // 사이드바 이름(alias)을 항상 우선 적용
        merged.name = mapData?.alias || c.name
        setRules(merged)
      }
      if (mapData) {
        const m = mapData as UserCafeMap
        setUserMap(m)
        setActivity({
          current_level: m.current_level,
          post_count: m.post_count,
          comment_count: m.comment_count,
          active_days: m.active_days,
          last_promo_date: m.last_promo_date,
          joined_at: m.joined_at,
        })
      }
      setLoading(false)
    }
    fetchData().then(() => {
      if (window.location.hash === '#activity') {
        document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, [params.id])

  // AI 홍보글 검토
  async function handleReview() {
    if (!postText.trim()) { toast.error('홍보글 내용을 입력해주세요.'); return }
    setReviewing(true)
    setReviewResult(null)
    try {
      const res = await fetch('/api/review-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_text: postText, rules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReviewResult(data)
    } catch (e: any) {
      toast.error(e.message || '검토에 실패했습니다.')
    } finally {
      setReviewing(false)
    }
  }

  // 개인 규칙 수정 → user_cafe_map.rules_override 저장
  async function handleSavePersonalRules() {
    if (!rules) return
    setSavingRules(true)
    try {
      const { error } = await supabase
        .from('user_cafe_map')
        .update({ rules_override: rules, alias: rules.name })
        .eq('cafe_id', params.id)
      if (error) throw error
      setUserMap(prev => prev ? { ...prev, rules_override: rules, alias: rules.name } : prev)
      router.refresh()
      toast.success('내 규칙이 저장되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '저장에 실패했습니다.')
    } finally {
      setSavingRules(false)
    }
  }

  // 개인 수정본 초기화 → AI 기본값 복원
  async function handleResetRules() {
    if (!cafe) return
    const { error } = await supabase
      .from('user_cafe_map')
      .update({ rules_override: null })
      .eq('cafe_id', params.id)
    if (error) { toast.error('초기화에 실패했습니다.'); return }
    setUserMap(prev => prev ? { ...prev, rules_override: null } : prev)
    setRules(mergeRules(cafe, null))
    toast.success('AI 기본값으로 초기화되었습니다.')
  }

  // 활동 지수 저장
  async function handleSaveActivity() {
    if (!activity) return
    setSavingActivity(true)
    try {
      const { error } = await supabase
        .from('user_cafe_map')
        .update(activity)
        .eq('cafe_id', params.id)
      if (error) throw error
      setUserMap(prev => prev ? { ...prev, ...activity } : prev)
      setEditingActivity(false)
      toast.success('활동 지수가 업데이트되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '저장에 실패했습니다.')
    } finally {
      setSavingActivity(false)
    }
  }

  function getNextPromoDate(): string {
    if (!activity || !rules) return '-'
    if (activity.current_level < rules.level_required) {
      return `등업 필요 (현재 ${activity.current_level}등급 / 최소 ${rules.level_required}등급)`
    }
    if (!activity.last_promo_date) return '지금 바로 가능'
    const intervalDays = rules.promo_interval_days ?? 7
    const last = new Date(activity.last_promo_date)
    const next = new Date(last.getTime() + intervalDays * 86400000)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (next <= today) return '지금 바로 가능'
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / 86400000)
    return `${next.toLocaleDateString('ko-KR')} (${diffDays}일 후)`
  }

  function getLevelUpProgress(): string {
    if (!rules || !activity) return '-'
    const needs: string[] = []
    if (rules.posts_for_level_up && activity.post_count < rules.posts_for_level_up)
      needs.push(`게시글 ${rules.posts_for_level_up - activity.post_count}개`)
    if (rules.comments_for_level_up && activity.comment_count < rules.comments_for_level_up)
      needs.push(`댓글 ${rules.comments_for_level_up - activity.comment_count}개`)
    if (rules.days_for_level_up && activity.active_days < rules.days_for_level_up)
      needs.push(`활동일 ${rules.days_for_level_up - activity.active_days}일`)
    return needs.length === 0 ? '등업 조건 달성!' : needs.join(', ') + ' 더 필요'
  }

  function addBannedWord() {
    const w = newBannedWord.trim()
    if (!w || rules?.banned_words.includes(w)) return
    setRules(prev => prev ? { ...prev, banned_words: [...prev.banned_words, w] } : prev)
    setNewBannedWord('')
  }

  const hasOverride = !!userMap?.rules_override

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!cafe) {
    return <div className="text-center py-16 text-muted-foreground">카페를 찾을 수 없습니다.</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{cafe.name}</h1>
        <a
          href={cafe.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline mt-1"
        >
          {cafe.url}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* ③ 나의 현황 */}
      {activity && (
        <Card id="activity" className="shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">나의 현황</CardTitle>
                <CardDescription>현재 활동 지수와 홍보 가능 여부를 확인하세요.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingActivity && userMap) {
                    setActivity({
                      current_level: userMap.current_level,
                      post_count: userMap.post_count,
                      comment_count: userMap.comment_count,
                      active_days: userMap.active_days,
                      last_promo_date: userMap.last_promo_date,
                      joined_at: userMap.joined_at,
                    })
                  }
                  setEditingActivity(!editingActivity)
                }}
              >
                {editingActivity ? '취소' : '수정'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingActivity ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { key: 'current_level' as const, label: '현재 등급', min: 1 },
                    { key: 'post_count' as const, label: '게시글 수', min: 0 },
                    { key: 'comment_count' as const, label: '댓글 수', min: 0 },
                    { key: 'active_days' as const, label: '활동 일수', min: 0 },
                  ].map(({ key, label, min }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">{label}</label>
                      <Input
                        type="number"
                        min={min}
                        value={activity[key]}
                        onChange={e => setActivity(prev => prev ? { ...prev, [key]: +e.target.value } : prev)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">마지막 홍보일</label>
                    <Input
                      type="date"
                      value={activity.last_promo_date ?? ''}
                      onChange={e => setActivity(prev => prev ? { ...prev, last_promo_date: e.target.value || null } : prev)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">카페 가입일</label>
                    <Input
                      type="date"
                      value={activity.joined_at ?? ''}
                      onChange={e => setActivity(prev => prev ? { ...prev, joined_at: e.target.value || null } : prev)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveActivity} disabled={savingActivity} className="w-full">
                  {savingActivity
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</>
                    : '활동 지수 저장'}
                </Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: '현재 등급', value: `${activity.current_level}등급` },
                    { label: '게시글', value: `${activity.post_count}개` },
                    { label: '댓글', value: `${activity.comment_count}개` },
                    { label: '활동일', value: `${activity.active_days}일` },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border p-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">등업까지</span>
                    <span className="font-medium">{getLevelUpProgress()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">다음 홍보 가능일</span>
                    <span className="font-medium">{getNextPromoDate()}</span>
                  </div>
                  {activity.last_promo_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">마지막 홍보</span>
                      <span className="font-medium">
                        {new Date(activity.last_promo_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {activity.joined_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">카페 가입일</span>
                      <span className="font-medium">
                        {new Date(activity.joined_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ① AI 홍보글 검토 */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">AI 홍보글 검토</CardTitle>
          <CardDescription>
            작성한 홍보글을 붙여넣으면 카페 규정에 맞는지 AI가 검토해드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="작성한 홍보글을 여기에 붙여넣으세요..."
            value={postText}
            onChange={e => { setPostText(e.target.value); setReviewResult(null) }}
          />

          <Button onClick={handleReview} disabled={reviewing} className="w-full">
            {reviewing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />검토 중...</>
              : '홍보글 검토하기'}
          </Button>

          {reviewResult && (
            <div className={`rounded-lg border p-4 space-y-3 ${
              reviewResult.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {reviewResult.ok
                  ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  : <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                }
                <p className={`text-sm font-semibold ${reviewResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                  {reviewResult.summary}
                </p>
              </div>

              {reviewResult.issues.length > 0 && (
                <ul className="space-y-1 pl-1">
                  {reviewResult.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              )}

              {reviewResult.suggestion && (
                <div className="rounded-md bg-white/70 border border-red-100 px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">수정 제안</p>
                  <p className="text-sm text-foreground">{reviewResult.suggestion}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ② 내 규칙 설정 */}
      {rules && (
        <Card className="shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">내 규칙 설정</CardTitle>
                <CardDescription className="mt-1">
                  공용 AI 데이터를 기반으로 내 카페에 맞게 수정할 수 있습니다.
                  수정본은 나만 볼 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {hasOverride
                  ? <Badge variant="secondary" className="text-xs">내 수정본</Badge>
                  : <Badge variant="outline" className="text-xs">AI 기본값</Badge>
                }
                {hasOverride && (
                  <button
                    onClick={handleResetRules}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    title="AI 기본값으로 초기화"
                  >
                    <RotateCcw className="h-3 w-3" />
                    초기화
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 카페 이름 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">카페 이름</label>
              <Input
                value={rules.name}
                onChange={e => setRules(prev => prev ? { ...prev, name: e.target.value } : prev)}
              />
            </div>

            {/* 금지어 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">금지어</label>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {rules.banned_words.map(word => (
                  <Badge key={word} variant="secondary" className="gap-1 text-xs">
                    {word}
                    <button
                      onClick={() => setRules(prev =>
                        prev ? { ...prev, banned_words: prev.banned_words.filter(w => w !== word) } : prev
                      )}
                      className="hover:text-destructive ml-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="금지어 입력 후 Enter"
                  value={newBannedWord}
                  onChange={e => setNewBannedWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addBannedWord()}
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="sm" onClick={addBannedWord}>추가</Button>
              </div>
            </div>

            {/* 홍보 허용 요일 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">홍보 허용 요일</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => setRules(prev => {
                      if (!prev) return prev
                      const days = prev.promo_days.includes(i)
                        ? prev.promo_days.filter(d => d !== i)
                        : [...prev.promo_days, i].sort((a, b) => a - b)
                      return { ...prev, promo_days: days }
                    })}
                    className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${rules.promo_days.includes(i)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 등업 조건 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">등업 조건</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'posts_for_level_up' as const, label: '게시글 수' },
                  { key: 'comments_for_level_up' as const, label: '댓글 수' },
                  { key: 'days_for_level_up' as const, label: '활동 일수' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <Input
                      type="number"
                      min={0}
                      value={rules[key] ?? ''}
                      onChange={e => setRules(prev =>
                        prev ? { ...prev, [key]: e.target.value ? +e.target.value : null } : prev
                      )}
                      placeholder="없음"
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 최소 등급 + 재홍보 주기 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">홍보 가능 최소 등급</label>
                <Input
                  type="number"
                  min={1}
                  value={rules.level_required}
                  onChange={e => setRules(prev => prev ? { ...prev, level_required: +e.target.value } : prev)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">재홍보 주기</label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={rules.promo_interval_days}
                    onChange={e => setRules(prev => prev ? { ...prev, promo_interval_days: +e.target.value } : prev)}
                    className="h-8 text-sm pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">일</span>
                </div>
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">기타 메모</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                value={rules.notes ?? ''}
                onChange={e => setRules(prev => prev ? { ...prev, notes: e.target.value || null } : prev)}
                placeholder="기타 특이사항"
              />
            </div>

            <Button onClick={handleSavePersonalRules} disabled={savingRules} className="w-full">
              {savingRules
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</>
                : '내 규칙으로 저장하기'}
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
