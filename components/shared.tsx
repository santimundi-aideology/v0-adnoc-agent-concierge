"use client"

import { cn } from "@/lib/utils"
import type { AgentState, CallStatus } from "@/lib/mock-data"

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-500 uppercase tracking-wider", className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Live
    </span>
  )
}

export function StatusPill({ status }: { status: AgentState | CallStatus }) {
  const colorMap: Record<string, string> = {
    Listening: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
    Speaking: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "Querying DB": "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
    "Retrieving Doc": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Confirming: "bg-primary/15 text-primary border-primary/20",
    Processing: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
    active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    ringing: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "on-hold": "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
    completed: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dropped: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", colorMap[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  )
}

export function LatencyChip({ ms }: { ms: number }) {
  const color =
    ms < 500
      ? "text-emerald-600 dark:text-emerald-400"
      : ms < 1000
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"

  return (
    <span className={cn("inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium", color)}>
      {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
    </span>
  )
}

export function KPIStatCard({
  title,
  value,
  change,
  trend,
}: {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            trend === "up" ? "text-emerald-600 dark:text-emerald-400" : trend === "down" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
    </div>
  )
}
