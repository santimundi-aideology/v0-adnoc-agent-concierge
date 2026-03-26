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
  Search,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  User,
  Settings as SettingsIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth, type AppRole } from "@/lib/supabase/auth-context"
import { signOut as signOutAction } from "@/app/login/sign-out-action"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

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

export function SidebarNav() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true
    if (!profile?.role) return false
    return item.roles.includes(profile.role)
  })

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  const handleSignOut = () => {
    signOutAction()
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => {
          if (!userMenuOpen) setCollapsed(true)
        }}
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

        <div className="border-t border-border p-2">
          <div className="flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-full justify-start gap-3 pl-2 pr-2"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center self-center">
                    <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </span>
                  {!collapsed && <span className="text-sm">Toggle theme</span>}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="font-medium">
                  Toggle theme
                </TooltipContent>
              )}
            </Tooltip>

            <DropdownMenu onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-full justify-start gap-3 pl-2 pr-2"
                  title={profile?.full_name || "User"}
                  onPointerDownCapture={() => setUserMenuOpen(true)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                  {!collapsed && <span className="truncate text-sm font-medium">{profile?.full_name || "User"}</span>}
                  {!collapsed && <ChevronDown className="ml-auto h-3 w-3 text-muted-foreground" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={collapsed ? "start" : "end"} side={collapsed ? "right" : "top"} className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
