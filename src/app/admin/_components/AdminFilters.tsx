'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const SORT_OPTIONS = [
  { value: 'updated', label: '최신 업데이트 순' },
  { value: 'created', label: '등록일 순' },
]

const USER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'has_users', label: '사용자 있음' },
  { value: 'no_users', label: '사용자 없음' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'analyzed', label: '분석 완료' },
  { value: 'pending', label: '대기중' },
]

function FilterGroup({
  title,
  options,
  paramKey,
  current,
}: {
  title: string
  options: { value: string; label: string }[]
  paramKey: string
  current: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramKey, value)
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{title}</p>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value)}
          className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
            current === opt.value
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminFilters({
  sort,
  userFilter,
  statusFilter,
}: {
  sort: string
  userFilter: string
  statusFilter: string
}) {
  return (
    <aside className="w-44 shrink-0 space-y-5">
      <FilterGroup title="정렬" options={SORT_OPTIONS} paramKey="sort" current={sort} />
      <FilterGroup title="사용자" options={USER_OPTIONS} paramKey="users" current={userFilter} />
      <FilterGroup title="분석 상태" options={STATUS_OPTIONS} paramKey="status" current={statusFilter} />
    </aside>
  )
}
