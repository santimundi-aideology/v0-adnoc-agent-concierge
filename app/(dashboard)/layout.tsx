"use client"

import { SidebarNav } from "@/components/sidebar-nav"
import { MobileDashboardNav } from "@/components/mobile-dashboard-nav"
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
          <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background lg:flex-row">
            <MobileDashboardNav />
            <SidebarNav />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-6">
              {children}
            </main>
          </div>
        </PreloadCacheProvider>
      </EnsureOperatorSession>
    </AuthProvider>
  )
}
