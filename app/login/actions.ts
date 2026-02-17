"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type DemoProfileKey = "operator" | "manager"

const DEMO_CREDENTIALS: Record<DemoProfileKey, { email: string; password: string }> = {
  operator: {
    email: "rashed.a@adnoc.ae",
    password: "Operator123!",
  },
  manager: {
    email: "manager@adnoc.ae",
    password: "Manager123!",
  },
}

export async function loginAsProfile(profileKey: DemoProfileKey) {
  const supabase = await createClient()

  const credentials = DEMO_CREDENTIALS[profileKey]
  if (!credentials) {
    return { error: "Invalid profile selection" }
  }

  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return { error: error.message }
  }

  // Check user role to determine landing page
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let destination = "/dashboard"

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "manager" || profile?.role === "admin") {
      destination = "/manager"
    }
  }

  revalidatePath("/", "layout")
  redirect(destination)
}
