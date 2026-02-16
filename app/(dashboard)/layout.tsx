"use client"

import dynamic from "next/dynamic"
import { SidebarNav } from "@/components/sidebar-nav"
import { AuthProvider } from "@/lib/supabase/auth-context"

const TopBar = dynamic(() => import("@/components/top-bar").then((m) => ({ default: m.TopBar })), {
  ssr: false,
  loading: () => <header className="flex h-14 items-center border-b border-border bg-card px-4" />,
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <SidebarNav />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}
