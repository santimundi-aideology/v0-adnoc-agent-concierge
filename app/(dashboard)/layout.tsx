"use client"

import { SidebarNav } from "@/components/sidebar-nav"
import { EnsureOperatorSession } from "@/components/ensure-operator-session"
import { AuthProvider } from "@/lib/supabase/auth-context"
import { PreloadCacheProvider } from "@/lib/data/preload-cache"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <EnsureOperatorSession>
        <PreloadCacheProvider>
          <div className="flex h-screen overflow-hidden bg-background">
            <SidebarNav />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
          </div>
        </PreloadCacheProvider>
      </EnsureOperatorSession>
    </AuthProvider>
  )
}
