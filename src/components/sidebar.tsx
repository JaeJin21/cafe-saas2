'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coffee, ListTodo, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const navItems = [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: '내 카페 리스트',
    href: '/dashboard/cafes',
    icon: Coffee,
    badge: null,
  },
  {
    label: '오늘의 미션',
    href: '/dashboard/missions',
    icon: ListTodo,
    badge: '3',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background px-3 py-4">
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

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
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
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge
                  variant={isActive ? 'secondary' : 'default'}
                  className="h-5 px-1.5 text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <Separator className="mb-3" />

      {/* 로그아웃 */}
      <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <LogOut className="h-4 w-4" />
        <span>로그아웃</span>
      </button>
    </aside>
  )
}
