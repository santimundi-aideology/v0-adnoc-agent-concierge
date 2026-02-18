"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Database,
  GitBranch,
  BarChart3,
  Settings,
  Headphones,
  Building2,
  Mic,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth, type AppRole } from "@/lib/supabase/auth-context"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
  /** Roles that can see this item. undefined = visible to all. */
  roles?: AppRole[]
}

const navItems: NavItem[] = [
  { href: "/manager", label: "Manager Overview", icon: Building2, roles: ["manager", "admin"] },
  { href: "/demo", label: "Express Demo", icon: Mic },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live-calls", label: "Live Calls", icon: PhoneCall, badge: 4 },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/data-sources", label: "Data Sources", icon: Database },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const { profile } = useAuth()

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!profile?.role) return false
    return item.roles.includes(profile.role)
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo — px-4 centers 32px headset in collapsed 64px sidebar */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Headphones className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="ml-2 flex flex-col min-w-0">
              <span className="text-sm font-bold text-foreground whitespace-nowrap">ADNOC</span>
              <span className="text-[10px] text-muted-foreground leading-none whitespace-nowrap">Voice Concierge</span>
            </div>
          )}
        </div>

        {/* Nav — icon column at 16px when collapsed (centered in 64px), same when expanded */}
        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto p-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            const Icon = item.icon

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-9 items-center rounded-md text-sm font-medium transition-colors",
                  "gap-3 pl-2 pr-2",
                  !collapsed && "pr-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center">
                  <Icon className="h-4 w-4" />
                </span>
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>

      </aside>
    </TooltipProvider>
  )
}
