"use client"

import { createContext, useContext, useEffect, useState } from "react"
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

const DEMO_USER = {
  id: "demo-user",
  email: "demo@adnoc.ae",
  user_metadata: { full_name: "Demo User", role: "admin" },
} as User

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Demo app mode: auth is ready on first render so data loading can run immediately
  const [user, setUser] = useState<User | null>(() => DEMO_USER)
  const [profile, setProfile] = useState<Profile | null>(() => fallbackProfileFromUser(DEMO_USER))
  const loading = false

  const signOut = async () => {
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
