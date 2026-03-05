"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { signInAsOperatorOnly } from "@/app/login/actions"
import { Loader2 } from "lucide-react"

type Status = "checking" | "signed-in" | "signing-in"

/**
 * When the user opens the app with no Supabase session, automatically sign in as operator
 * so API/data requests (which require a real session) succeed instead of returning 406.
 */
export function EnsureOperatorSession({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("signed-in")
        return
      }
      setStatus("signing-in")
      signInAsOperatorOnly().then((result) => {
        if ("ok" in result && result.ok) {
          window.location.href = "/dashboard"
        } else {
          setStatus("signed-in")
        }
      })
    })
  }, [])

  if (status === "checking" || status === "signing-in") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">
            {status === "signing-in" ? "Signing you in as operator…" : "Loading…"}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
