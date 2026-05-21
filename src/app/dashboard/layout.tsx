import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/auth-context'
import { FloatingLoginButton } from '@/components/floating-login-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let cafes: Array<{ cafe_id: string; alias: string | null; sort_order: number; cafe_master: { id: string; name: string } | null }> = []
  if (user) {
    const { data } = await supabase
      .from('user_cafe_map')
      .select('cafe_id, alias, sort_order, cafe_master(id, name)')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    cafes = (data as unknown as typeof cafes) ?? []
  }

  return (
    <AuthProvider>
      <div className="flex h-screen bg-muted/40">
        <Sidebar cafes={cafes} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
        <Toaster richColors position="top-right" />
        <FloatingLoginButton />
      </div>
    </AuthProvider>
  )
}
