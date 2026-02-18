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

function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "operator" || value === "manager" || value === "viewer"
}

function fallbackProfileFromUser(user: User): Profile {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const role = isAppRole(metadata.role) ? metadata.role : "operator"
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name
      : (user.email?.split("@")[0] ?? "User")

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    role,
    avatar_url: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Auth initialization timed out after ${ms}ms`))
    }, ms)

    promise
      .then((value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string, isCancelled?: () => boolean) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, avatar_url")
          .eq("id", userId)
          .single()
        if (error) {
          console.error("Failed to fetch profile:", error)
          return
        }
        if (isCancelled?.()) return
        setProfile(data as Profile | null)
      } catch (err) {
        if (!isCancelled?.()) {
          console.error("Unexpected profile fetch error:", err)
        }
      }
    },
    [supabase]
  )

  useEffect(() => {
    let cancelled = false
    // Absolute fail-safe: auth loading must never block the app forever.
    const hardLoadingStop = window.setTimeout(() => {
      if (!cancelled) {
        console.warn("Auth init fallback: forcing loading=false")
        setLoading(false)
      }
    }, 6000)

    // Use getSession() — reads JWT from local storage (instant, no network call).
    // The middleware already validates server-side, so we don't need getUser()
    // which makes an extra roundtrip to Supabase on every page load.
    const init = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 4000)
        if (cancelled) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          // Render a stable user identity immediately; DB profile can hydrate after.
          setProfile((prev) => prev ?? fallbackProfileFromUser(currentUser))
          // Don't block loading on the profile fetch — fire and forget
          fetchProfile(currentUser.id, () => cancelled).catch((err) =>
            console.error("Background profile fetch failed:", err)
          )
        }
      } catch (err) {
        if (cancelled) return
        console.error("Failed to initialize auth session:", err)
        setUser(null)
        setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    // Listen for auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (cancelled) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          setProfile((prev) => prev ?? fallbackProfileFromUser(currentUser))
          await fetchProfile(currentUser.id, () => cancelled)
        } else if (!currentUser) {
          setProfile(null)
        }
      } catch (err) {
        console.error("Auth state change handling failed:", err)
      }
    })

    const onFocus = () => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (cancelled) return
          const currentUser = session?.user ?? null
          if (!currentUser) return
          setUser(currentUser)
          setProfile((prev) => prev ?? fallbackProfileFromUser(currentUser))
          await fetchProfile(currentUser.id, () => cancelled)
        } catch (err) {
          console.error("Focus auth refresh failed:", err)
        }
      })()
    }
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      window.clearTimeout(hardLoadingStop)
      subscription.unsubscribe()
      window.removeEventListener("focus", onFocus)
    }
  }, [fetchProfile, supabase])

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
