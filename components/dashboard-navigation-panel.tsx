"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  User,
  Settings as SettingsIcon,
  Headphones,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/supabase/auth-context"
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
import { DASHBOARD_NAV_ITEMS, getVisibleDashboardNavItems } from "@/components/dashboard-nav-items"

export type DashboardNavigationPanelProps = {
  variant: "sidebar" | "sheet"
  /** Sidebar-only: narrow rail with tooltips */
  collapsed?: boolean
  /** Sidebar-only: keep expanded while user menu is open */
  userMenuOpen?: boolean
  onUserMenuOpenChange?: (open: boolean) => void
  /** Sheet: close drawer after navigation */
  onNavigate?: () => void
  /** Optional class on root for sheet padding */
  className?: string
  /** When false, omits the header logo row (e.g. mobile sheet where the top bar already shows brand). */
  showLogo?: boolean
}

export function DashboardNavigationPanel({
  variant,
  collapsed = false,
  userMenuOpen: userMenuOpenControlled,
  onUserMenuOpenChange,
  onNavigate,
  className,
  showLogo = true,
}: DashboardNavigationPanelProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [internalUserMenuOpen, setInternalUserMenuOpen] = useState(false)

  const userMenuOpen =
    variant === "sidebar" && onUserMenuOpenChange !== undefined && userMenuOpenControlled !== undefined
      ? userMenuOpenControlled
      : internalUserMenuOpen

  const setUserMenuOpen =
    variant === "sidebar" && onUserMenuOpenChange !== undefined
      ? onUserMenuOpenChange
      : setInternalUserMenuOpen

  const showLabels = variant === "sheet" || !collapsed
  const useTooltips = variant === "sidebar" && collapsed
  const linkMinHeight = variant === "sheet" ? "min-h-11" : "min-h-9"
  const footerButtonMin = variant === "sheet" ? "min-h-11 h-11" : "h-9"

  const visibleItems = getVisibleDashboardNavItems(DASHBOARD_NAV_ITEMS, profile?.role)

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

  const handleNavClick = () => {
    onNavigate?.()
  }

  const logoBlock = (
    <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
        <Headphones className="h-4 w-4 text-primary-foreground" />
      </div>
      {showLabels && (
        <div className="ml-2 flex min-w-0 flex-col">
          <span className="whitespace-nowrap text-sm font-bold text-foreground">ADNOC</span>
          <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground">Voice Concierge</span>
        </div>
      )}
    </div>
  )

  const navLinks = visibleItems.map((item) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
    const Icon = item.icon

    const linkContent = (
      <Link
        href={item.href}
        onClick={handleNavClick}
        className={cn(
          "flex items-center rounded-md text-sm font-medium transition-colors",
          linkMinHeight,
          "gap-3 pl-2 pr-2",
          showLabels && "pr-3",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center">
          <Icon className="h-4 w-4" />
        </span>
        {showLabels && <span className="whitespace-nowrap">{item.label}</span>}
        {showLabels && item.badge && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    )

    if (useTooltips) {
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
  })

  const themeButton = (
    <Button
      variant="ghost"
      className={cn("w-full justify-start gap-3 pl-2 pr-2", footerButtonMin)}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center self-center">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      {showLabels && <span className="text-sm">Toggle theme</span>}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )

  const userDropdownModal = variant === "sheet" ? false : true

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      {showLogo ? logoBlock : null}

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">{navLinks}</nav>

      <div className="border-t border-border p-2">
        <div className="flex flex-col gap-1">
          {useTooltips ? (
            <Tooltip>
              <TooltipTrigger asChild>{themeButton}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Toggle theme
              </TooltipContent>
            </Tooltip>
          ) : (
            themeButton
          )}

          <DropdownMenu modal={userDropdownModal} open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn("w-full justify-start gap-3 pl-2 pr-2", footerButtonMin)}
                title={profile?.full_name || "User"}
                onPointerDownCapture={() => setUserMenuOpen(true)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </span>
                {showLabels && <span className="truncate text-sm font-medium">{profile?.full_name || "User"}</span>}
                {showLabels && <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side={variant === "sheet" ? "bottom" : collapsed ? "right" : "top"}
              sideOffset={variant === "sheet" ? 8 : 4}
              className="z-[60] w-56"
            >
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
    </div>
  )
}
