'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Coffee, ListTodo, LayoutDashboard, LogOut, MoreHorizontal, Pencil, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

type CafeItem = {
  cafe_id: string
  alias: string | null
  sort_order: number
  cafe_master: { id: string; name: string } | null
}

const mainNavItems = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '오늘의 미션', href: '/dashboard/missions', icon: ListTodo },
]

export function Sidebar({ cafes: initialCafes }: { cafes: CafeItem[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const sidebarRef = useRef<HTMLElement>(null)

  const [cafes, setCafes] = useState(initialCafes)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => { setCafes(initialCafes) }, [initialCafes])

  // 사이드바 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!openMenuId) return
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function startEdit(cafeId: string, currentName: string) {
    setEditingId(cafeId)
    setEditingName(currentName)
    setOpenMenuId(null)
  }

  async function handleRename(cafeId: string) {
    const trimmed = editingName.trim()
    if (!trimmed) { setEditingId(null); return }
    const { error } = await supabase
      .from('user_cafe_map')
      .update({ alias: trimmed })
      .eq('cafe_id', cafeId)
    if (error) { toast.error('이름 수정에 실패했습니다.'); return }
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(cafeId: string, cafeName: string) {
    setOpenMenuId(null)
    if (!window.confirm(
      `"${cafeName}" 카페를 삭제하면 완료·대기 중인 미션 기록이 모두 함께 삭제됩니다.\n계속하시겠습니까?`
    )) return
    const { error } = await supabase.from('user_cafe_map').delete().eq('cafe_id', cafeId)
    if (error) { toast.error('삭제에 실패했습니다.'); return }
    // 해당 카페 미션 전체 삭제 (완료·대기 포함)
    await supabase.from('mission_log').delete().eq('cafe_id', cafeId)
    if (pathname === `/dashboard/cafes/${cafeId}`) router.push('/dashboard')
    router.refresh()
  }

  async function handleMove(cafeId: string, direction: 'up' | 'down') {
    const idx = cafes.findIndex(c => c.cafe_id === cafeId)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= cafes.length) return
    const newCafes = [...cafes]
    ;[newCafes[idx], newCafes[targetIdx]] = [newCafes[targetIdx], newCafes[idx]]
    setCafes(newCafes)
    await Promise.all(
      newCafes.map((cafe, i) =>
        supabase.from('user_cafe_map').update({ sort_order: i }).eq('cafe_id', cafe.cafe_id)
      )
    )
  }

  return (
    <aside ref={sidebarRef} className="flex h-screen w-60 flex-col border-r bg-background px-3 py-4">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-2 py-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Coffee className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">카페가드</p>
          <p className="text-xs text-muted-foreground">홍보 스케줄 관리</p>
        </div>
      </div>

      <Separator className="mb-3" />

      {/* 메인 네비게이션 */}
      <nav className="flex flex-col gap-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <Separator className="my-3" />

      {/* 내 카페 리스트 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          내 카페 리스트
        </p>
        <nav className="flex flex-col gap-0.5">
          {cafes.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">등록된 카페가 없습니다</p>
          ) : (
            cafes.map((item, idx) => {
              const cafeId = item.cafe_master?.id
              const cafeName = item.alias || item.cafe_master?.name || '이름 없음'
              if (!cafeId) return null

              const href = `/dashboard/cafes/${cafeId}`
              const isActive = pathname === href
              const isEditing = editingId === cafeId
              const isMenuOpen = openMenuId === cafeId

              // 이름 수정 모드
              if (isEditing) {
                return (
                  <div key={item.cafe_id} className="flex items-center gap-1 px-2 py-1">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(cafeId)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 min-w-0 rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => handleRename(cafeId)}
                      className="shrink-0 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              }

              const isFirst = idx === 0
              const isLast = idx === cafes.length - 1

              return (
                <div key={item.cafe_id} className="group relative">
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors pr-14',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Coffee className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{cafeName}</span>
                  </Link>

                  {/* ↑↓ 정렬 버튼 */}
                  <div className={cn(
                    'absolute right-7 top-1/2 -translate-y-1/2 flex flex-col gap-0 opacity-0 group-hover:opacity-100 transition-opacity'
                  )}>
                    <button
                      onClick={e => { e.preventDefault(); handleMove(cafeId, 'up') }}
                      disabled={isFirst}
                      className={cn(
                        'rounded p-0.5 transition-colors',
                        isActive ? 'text-primary-foreground/60 hover:text-primary-foreground disabled:opacity-20' : 'text-muted-foreground hover:text-foreground disabled:opacity-20'
                      )}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); handleMove(cafeId, 'down') }}
                      disabled={isLast}
                      className={cn(
                        'rounded p-0.5 transition-colors',
                        isActive ? 'text-primary-foreground/60 hover:text-primary-foreground disabled:opacity-20' : 'text-muted-foreground hover:text-foreground disabled:opacity-20'
                      )}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* ... 버튼 */}
                  <button
                    onClick={e => {
                      e.preventDefault()
                      setOpenMenuId(isMenuOpen ? null : cafeId)
                    }}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors',
                      isActive
                        ? 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>

                  {/* 드롭다운 */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-0.5 w-32 rounded-md border bg-background shadow-md py-1">
                      <button
                        onClick={() => startEdit(cafeId, cafeName)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3" />
                        이름 수정
                      </button>
                      <button
                        onClick={() => handleDelete(cafeId, cafeName)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>
      </div>

      <Separator className="mb-3" />

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        <span>로그아웃</span>
      </button>
    </aside>
  )
}
