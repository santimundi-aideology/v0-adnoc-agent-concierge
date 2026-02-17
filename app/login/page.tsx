"use client"

import { useState, useTransition } from "react"
import { loginAsProfile } from "./actions"
import { Headphones, Loader2, UserCog, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ProfileOption = {
  key: "operator" | "manager"
  title: string
  description: string
  email: string
  icon: typeof UserCog
}

const PROFILE_OPTIONS: ProfileOption[] = [
  {
    key: "operator",
    title: "Operator",
    description: "Live call operations and concierge monitoring",
    email: "rashed.a@adnoc.ae",
    icon: UserCog,
  },
  {
    key: "manager",
    title: "Manager",
    description: "Analytics, performance insights, and station overview",
    email: "manager@adnoc.ae",
    icon: ShieldCheck,
  },
]

export default function LoginPage() {
  const [selectedProfile, setSelectedProfile] = useState<"operator" | "manager">("operator")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSignIn() {
    setError(null)
    startTransition(async () => {
      const result = await loginAsProfile(selectedProfile)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <Headphones className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              ADNOC Voice Concierge
            </CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
              Select a profile to sign in
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PROFILE_OPTIONS.map((profile) => {
                const Icon = profile.icon
                const isSelected = selectedProfile === profile.key
                return (
                  <button
                    key={profile.key}
                    type="button"
                    disabled={isPending}
                    onClick={() => setSelectedProfile(profile.key)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/40 hover:bg-accent/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{profile.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{profile.description}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">{profile.email}</p>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="button" onClick={handleSignIn} className="w-full h-10" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                One-click demo login is enabled for Operator and Manager profiles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
