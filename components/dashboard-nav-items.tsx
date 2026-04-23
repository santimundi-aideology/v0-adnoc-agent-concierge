import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Database,
  GitBranch,
  BarChart3,
  Settings,
  Building2,
  Mic,
  Search,
} from "lucide-react"

import type { AppRole } from "@/lib/supabase/auth-context"

export type DashboardNavItem = {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
  /** Roles that can see this item. undefined = visible to all. */
  roles?: AppRole[]
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/manager", label: "Manager Overview", icon: Building2, roles: ["manager", "admin"] },
  { href: "/demo", label: "Express Demo", icon: Mic },
  { href: "/document-search-agent", label: "Document Search Agent", icon: Search },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live-calls", label: "Live Calls", icon: PhoneCall, badge: 4 },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/data-sources", label: "Data Sources", icon: Database },
  { href: "/workflows", label: "Workflows", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function getVisibleDashboardNavItems(
  items: DashboardNavItem[],
  profileRole: AppRole | null | undefined
): DashboardNavItem[] {
  return items.filter((item) => {
    if (!item.roles) return true
    if (!profileRole) return false
    return item.roles.includes(profileRole)
  })
}
