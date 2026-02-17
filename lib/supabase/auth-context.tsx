"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export type AppRole = "admin" | "operator" | "manager" | "viewer"

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  avatar_url: string | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

function withTimeout<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        reject(err)
      })
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("profiles")
            .select("id, email, full_name, role, avatar_url")
            .eq("id", userId)
            .single()
        )
        if (error) {
          console.error("Failed to fetch profile:", error)
          setProfile(null)
          return
        }
        setProfile(data as Profile | null)
      } catch (err) {
        console.error("Unexpected profile fetch error:", err)
        setProfile(null)
      }
    },
    [supabase]
  )

  useEffect(() => {
    // Use getSession() — reads JWT from local storage (instant, no network call).
    // The middleware already validates server-side, so we don't need getUser()
    // which makes an extra roundtrip to Supabase on every page load.
    const init = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 20000)

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // Don't block loading on the profile fetch — fire and forget
          fetchProfile(currentUser.id).catch((err) =>
            console.error("Background profile fetch failed:", err)
          )
        }
      } catch (err) {
        console.error("Failed to initialize auth session:", err)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    init()

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          await fetchProfile(currentUser.id)
        } else if (!currentUser) {
          setProfile(null)
        }
      } catch (err) {
        console.error("Auth state change handling failed:", err)
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
