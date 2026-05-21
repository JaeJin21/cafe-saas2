'use client'

import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'

export function FloatingLoginButton() {
  const router = useRouter()
  const { user, loading, popupVisible } = useAuth()

  if (loading || user) return null

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      {popupVisible && (
        <div className="rounded-lg border bg-background shadow-lg px-4 py-2.5 text-sm font-medium animate-in slide-in-from-bottom-2 duration-200">
          로그인 후 이용 가능합니다
        </div>
      )}
      <Button
        onClick={() => router.push('/login')}
        className="rounded-full shadow-lg h-11 px-5 gap-2"
      >
        <LogIn className="h-4 w-4" />
        로그인
      </Button>
    </div>
  )
}
