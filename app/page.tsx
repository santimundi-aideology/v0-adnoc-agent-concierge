import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  let user = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth.getUser timeout after 2500ms")), 2500)
      ),
    ])
    user = result.data.user
  } catch {
    user = null
  }

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
