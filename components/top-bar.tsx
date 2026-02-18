"use client"

import { Search, Bell, ChevronDown, Moon, Sun, LogOut, User, Settings } from "lucide-react"
import { signOut as signOutAction } from "@/app/login/sign-out-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { useAuth } from "@/lib/supabase/auth-context"

function SystemHealthPill({ label, status, latency }: { label: string; status: "ok" | "degraded" | "down"; latency?: string }) {
  const statusColor =
    status === "ok"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : status === "degraded"
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ok" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-red-500"}`} />
      {label}
      {latency && <span className="text-muted-foreground">{latency}</span>}
    </span>
  )
}

const roleColors: Record<string, string> = {
  admin: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  manager: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  operator: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  viewer: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
}

export function TopBar() {
  const { theme, setTheme } = useTheme()
  const { profile } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  const roleBadgeClass = profile?.role
    ? roleColors[profile.role] || roleColors.viewer
    : roleColors.viewer

  const handleSignOut = () => {
    signOutAction()
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search calls, stations, orders..."
          className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      {/* System Health Strip */}
      <div className="hidden lg:flex items-center gap-2">
        <SystemHealthPill label="Voice" status="ok" />
        <SystemHealthPill label="ASR/TTS" status="ok" />
        <SystemHealthPill label="RAG" status="ok" />
        <SystemHealthPill label="SQL" status="ok" />
        <SystemHealthPill label="Avg Latency" status="ok" latency="820ms" />
      </div>

      {/* Environment Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
            Cloud
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Cloud</DropdownMenuItem>
          <DropdownMenuItem>On-Prem</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="relative h-8 w-8">
        <Bell className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
          3
        </span>
        <span className="sr-only">Notifications</span>
      </Button>

      {/* User Avatar & Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 gap-2 px-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium">{profile?.full_name || "User"}</span>
              {profile?.role && (
                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize ${roleBadgeClass}`}>
                  {profile.role}
                </span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
