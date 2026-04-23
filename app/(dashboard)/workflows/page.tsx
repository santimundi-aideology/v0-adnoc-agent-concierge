"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { agentWorkflows } from "@/lib/data/agent-workflows"
import type { AgentWorkflow, WorkflowNode } from "@/lib/types"
import {
  GitBranch,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Save,
  Upload,
  Settings,
  CheckCircle2,
  UtensilsCrossed,
  Car,
  Wrench,
  HelpCircle,
  Star,
  Zap,
  Search,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Icon map: agent.icon string → component ── */
const ICON_MAP: Record<string, typeof UtensilsCrossed> = {
  UtensilsCrossed,
  Car,
  Wrench,
  HelpCircle,
  Star,
  Zap,
}

/* ── Color config per agent color token ── */
const COLOR_CONFIG: Record<
  string,
  { bg: string; bgActive: string; border: string; text: string; badge: string; dot: string }
> = {
  orange: {
    bg: "bg-orange-500/5",
    bgActive: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  blue: {
    bg: "bg-blue-500/5",
    bgActive: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  amber: {
    bg: "bg-amber-500/5",
    bgActive: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  slate: {
    bg: "bg-slate-500/5",
    bgActive: "bg-slate-500/10",
    border: "border-slate-500/30",
    text: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-500",
  },
  purple: {
    bg: "bg-purple-500/5",
    bgActive: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    bgActive: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
}

function getColor(token: string) {
  return COLOR_CONFIG[token] ?? COLOR_CONFIG.blue
}

/* ------------------------------------------------------------------ */

export default function WorkflowsPage() {
  const [activeAgent, setActiveAgent] = useState<AgentWorkflow | null>(null)
  const [selectedNode, setSelectedNode] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all")

  const filteredAgents = agentWorkflows.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        a.intent.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleSelectAgent = (agent: AgentWorkflow) => {
    setActiveAgent(agent)
    setSelectedNode(agent.nodes[0]?.id ?? "")
  }

  const handleBack = () => {
    setActiveAgent(null)
    setSelectedNode("")
  }

  const selected = activeAgent?.nodes.find((n) => n.id === selectedNode)

  /* ── Agent Library View ── */
  if (!activeAgent) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
            <p className="text-sm text-muted-foreground">
              Agent library — select an agent to view and edit its conversation flow
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {agentWorkflows.length} agents
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 max-w-full flex-1 sm:max-w-[300px] sm:min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {(["all", "published", "draft", "archived"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-[11px] capitalize"
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => {
            const c = getColor(agent.color)
            const Icon = ICON_MAP[agent.icon] ?? GitBranch
            return (
              <Card
                key={agent.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  c.border,
                  "hover:ring-1 hover:ring-primary/20"
                )}
                onClick={() => handleSelectAgent(agent)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", c.bg)}>
                      <Icon className={cn("h-5 w-5", c.text)} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          agent.status === "published"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : agent.status === "draft"
                            ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {agent.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        v{agent.version}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-3">
                    {agent.name}
                  </CardTitle>
                  <CardDescription className="text-xs leading-relaxed">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] border", c.badge)}>
                        {agent.intent}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      {agent.nodes.length} steps
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No agents match your search.</p>
          </div>
        )}
      </div>
    )
  }

  /* ── Workflow Editor View (for selected agent) ── */
  const agentColor = getColor(activeAgent.color)
  const AgentIcon = ICON_MAP[activeAgent.icon] ?? GitBranch

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={handleBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All agents
          </Button>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", agentColor.bg)}>
            <AgentIcon className={cn("h-4 w-4", agentColor.text)} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight text-foreground">{activeAgent.name}</h1>
            <p className="truncate text-xs text-muted-foreground">{activeAgent.intent}</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              activeAgent.status === "published"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}
          >
            {activeAgent.status} · v{activeAgent.version}
          </Badge>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button size="sm" className="h-8 gap-1 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Agent description */}
      <Card className={cn("border-dashed", agentColor.border)}>
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            {activeAgent.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* Workflow Visual */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className={cn("h-4 w-4", agentColor.text)} />
              Conversation Flow
              <Badge variant="outline" className="ml-2 text-[10px]">
                {activeAgent.nodes.length} nodes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0">
              {activeAgent.nodes.map((node, i) => (
                <div key={node.id} className="flex flex-col items-center">
                  {/* Node */}
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    className={cn(
                      "flex w-full max-w-md items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      selectedNode === node.id
                        ? cn("ring-1", agentColor.border, agentColor.bgActive, "ring-primary/20")
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        selectedNode === node.id
                          ? cn(agentColor.dot, "text-white")
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {node.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {node.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {node.confirmations.length > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400"
                        >
                          {node.confirmations.length} confirm
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                  {/* Connector arrow */}
                  {i < activeAgent.nodes.length - 1 && (
                    <div className="flex h-8 items-center">
                      <div className="h-full w-px bg-border" />
                      <ArrowRight className="absolute h-3 w-3 text-muted-foreground rotate-90 -ml-1.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inspector Panel */}
        {selected && (
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Node Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Node ID</Label>
                  <p className="text-sm font-mono text-foreground">{selected.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input defaultValue={selected.label} className="h-8 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    defaultValue={selected.description}
                    className="min-h-16 text-sm mt-1 resize-none"
                  />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Required Confirmations
                  </Label>
                  {selected.confirmations.length > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {selected.confirmations.map((conf, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-md bg-amber-500/5 border border-amber-500/20 px-2 py-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-xs text-foreground">{conf}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      No confirmations required
                    </p>
                  )}
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Fallback Phrase
                  </Label>
                  <Input
                    defaultValue={selected.fallback}
                    className="h-8 text-sm mt-1"
                  />
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Escalation Threshold
                  </Label>
                  <Input
                    defaultValue="3 retries"
                    className="h-8 text-sm mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Escalate to human agent after this many retries
                  </p>
                </div>
                <Button size="sm" className="h-8 text-xs mt-2">
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
