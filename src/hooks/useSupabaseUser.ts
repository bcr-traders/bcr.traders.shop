'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

/**
 * Client-side session hook — replaces Clerk's useAuth()/useUser().
 */
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsLoaded(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoaded(true)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, isLoaded, isSignedIn: !!user }
}
