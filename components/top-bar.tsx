"use client"

import { Search, Bell, ChevronDown, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"

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

export function TopBar() {
  const { theme, setTheme } = useTheme()

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

      {/* User Avatar */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 gap-2 px-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">OP</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline-block">Operator</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Preferences</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
