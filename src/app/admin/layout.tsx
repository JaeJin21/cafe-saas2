import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background px-6 py-3 flex items-center gap-3">
        <Shield className="h-4 w-4 text-primary" />
        <Link href="/admin" className="font-semibold text-sm">관리자 대시보드</Link>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:underline ml-auto"
        >
          일반 대시보드로 이동
        </Link>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
