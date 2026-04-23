"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardNavigationPanel } from "@/components/dashboard-navigation-panel"

export function SidebarNav() {
  const [collapsed, setCollapsed] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => {
          if (!userMenuOpen) setCollapsed(true)
        }}
        className={cn(
          "hidden h-full min-h-0 shrink-0 flex-col border-r border-border bg-card transition-all duration-300 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <DashboardNavigationPanel
          variant="sidebar"
          collapsed={collapsed}
          userMenuOpen={userMenuOpen}
          onUserMenuOpenChange={setUserMenuOpen}
        />
      </aside>
    </TooltipProvider>
  )
}
