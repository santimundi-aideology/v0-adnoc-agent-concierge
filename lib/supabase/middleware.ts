import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }
  return url
}

function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY fallback)"
    )
  }
  return key
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const clearSupabaseCookies = (response: NextResponse) => {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.set(cookie.name, "", {
          path: "/",
          expires: new Date(0),
        })
      }
    }
  }

  const getUserWithTimeout = async (timeoutMs = 2500) => {
    return await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`auth.getUser timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  }

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  let user: { id: string } | null = null
  try {
    const {
      data: { user: currentUser },
      error,
    } = await getUserWithTimeout()

    if (error) {
      const code = (error as { code?: string }).code
      if (code === "refresh_token_not_found" || code === "invalid_refresh_token") {
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        const redirectResponse = NextResponse.redirect(url)
        clearSupabaseCookies(redirectResponse)
        return redirectResponse
      }
      user = null
    } else {
      user = currentUser ? { id: currentUser.id } : null
    }
  } catch (err) {
    console.error("Middleware auth lookup failed:", err)
    user = null
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    request.nextUrl.pathname !== "/"
  ) {
    // no user, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    const redirectResponse = NextResponse.redirect(url)
    clearSupabaseCookies(redirectResponse)
    return redirectResponse
  }

  // If user is on login page and already authenticated, redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
