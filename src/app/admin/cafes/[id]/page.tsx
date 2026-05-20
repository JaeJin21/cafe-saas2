'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, X, ExternalLink, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

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
  created_at: string
  updated_at: string
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const DEFAULT_RULES: CafeRules = {
  name: '',
  banned_words: [],
  promo_days: [1, 2, 3, 4, 5],
  promo_time_start: null,
  promo_time_end: null,
  promo_interval_days: 7,
  level_required: 1,
  posts_for_level_up: null,
  comments_for_level_up: null,
  days_for_level_up: null,
  notes: null,
}

export default function AdminCafeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [cafe, setCafe] = useState<CafeMaster | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [rules, setRules] = useState<CafeRules>(DEFAULT_RULES)
  const [newBannedWord, setNewBannedWord] = useState('')
  const [saving, setSaving] = useState(false)

  const [rulesText, setRulesText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: cafeData }, { count }] = await Promise.all([
        supabase.from('cafe_master').select('*').eq('id', params.id).single(),
        supabase.from('user_cafe_map').select('*', { count: 'exact', head: true }).eq('cafe_id', params.id),
      ])
      if (cafeData) {
        const c = cafeData as CafeMaster
        setCafe(c)
        setRules({
          name: c.name,
          banned_words: c.banned_words ?? [],
          promo_days: c.promo_days ?? [1, 2, 3, 4, 5],
          promo_time_start: c.promo_time_start,
          promo_time_end: c.promo_time_end,
          promo_interval_days: c.promo_interval_days ?? 7,
          level_required: c.level_required ?? 1,
          posts_for_level_up: c.posts_for_level_up,
          comments_for_level_up: c.comments_for_level_up,
          days_for_level_up: c.days_for_level_up,
          notes: c.notes,
        })
      }
      setUserCount(count ?? 0)
      setLoading(false)
    }
    fetchData()
  }, [params.id])

  async function handleAnalyze() {
    if (!rulesText.trim()) { toast.error('공지/규칙 텍스트를 입력해주세요.'); return }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cafe?.url, rules_text: rulesText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setRules(prev => ({ ...prev, ...data, name: prev.name || data.name || '' }))
      toast.success('AI 분석 완료! 폼에 자동으로 채워졌습니다. 확인 후 저장해주세요.')
    } catch (e: any) {
      toast.error(e.message || 'AI 분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!cafe) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/update-cafe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafeId: cafe.id, rules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCafe(prev => prev ? { ...prev, ...rules, updated_at: new Date().toISOString() } : prev)
      toast.success('cafe_master가 업데이트되었습니다. 모든 사용자에게 적용됩니다.')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function addBannedWord() {
    const w = newBannedWord.trim()
    if (!w || rules.banned_words.includes(w)) return
    setRules(prev => ({ ...prev, banned_words: [...prev.banned_words, w] }))
    setNewBannedWord('')
  }

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
      <div className="space-y-2">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          카페 목록으로
        </Link>
        <div className="flex items-start justify-between gap-3">
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
          <div className="text-right text-xs text-muted-foreground shrink-0">
            <p>사용자 {userCount}명</p>
            <p className="mt-0.5">마지막 업데이트: {new Date(cafe.updated_at).toLocaleDateString('ko-KR')}</p>
          </div>
        </div>
      </div>

      {/* AI 분석 */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">AI 규칙 분석</CardTitle>
          <CardDescription>
            카페 공지를 붙여넣으면 AI가 규칙을 자동 추출합니다. 결과를 확인한 후 저장하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="카페 공지 내용을 여기에 붙여넣으세요..."
            value={rulesText}
            onChange={e => setRulesText(e.target.value)}
          />
          <Button onClick={handleAnalyze} disabled={analyzing} variant="outline" className="w-full">
            {analyzing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />분석 중...</>
              : 'AI로 규칙 분석하기'}
          </Button>
        </CardContent>
      </Card>

      {/* 규칙 폼 */}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">규칙 설정</CardTitle>
          <CardDescription>
            저장하면 이 카페를 등록한 모든 사용자의 기본값이 업데이트됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 카페 이름 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">카페 이름</label>
            <Input
              value={rules.name}
              onChange={e => setRules(prev => ({ ...prev, name: e.target.value }))}
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
                    onClick={() => setRules(prev => ({
                      ...prev,
                      banned_words: prev.banned_words.filter(w => w !== word),
                    }))}
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
                    const days = prev.promo_days.includes(i)
                      ? prev.promo_days.filter(d => d !== i)
                      : [...prev.promo_days, i].sort((a, b) => a - b)
                    return { ...prev, promo_days: days }
                  })}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                    rules.promo_days.includes(i)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 홍보 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">홍보 시작 시간</label>
              <Input
                type="time"
                value={rules.promo_time_start ?? ''}
                onChange={e => setRules(prev => ({ ...prev, promo_time_start: e.target.value || null }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">홍보 종료 시간</label>
              <Input
                type="time"
                value={rules.promo_time_end ?? ''}
                onChange={e => setRules(prev => ({ ...prev, promo_time_end: e.target.value || null }))}
                className="h-8 text-sm"
              />
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
                    onChange={e => setRules(prev => ({
                      ...prev,
                      [key]: e.target.value ? +e.target.value : null,
                    }))}
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
                onChange={e => setRules(prev => ({ ...prev, level_required: +e.target.value }))}
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
                  onChange={e => setRules(prev => ({ ...prev, promo_interval_days: +e.target.value }))}
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
              onChange={e => setRules(prev => ({ ...prev, notes: e.target.value || null }))}
              placeholder="기타 특이사항"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />저장 중...</>
              : '전체 사용자에게 규칙 적용'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
