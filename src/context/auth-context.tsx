'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthContextType = {
  user: User | null
  loading: boolean
  requireAuth: () => boolean
  popupVisible: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  requireAuth: () => false,
  popupVisible: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [popupVisible, setPopupVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = useCallback((): boolean => {
    if (user) return true
    setPopupVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setPopupVisible(false), 3000)
    return false
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, requireAuth, popupVisible }}>
      {children}
    </AuthContext.Provider>
  )
}
