"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { workflowNodes } from "@/lib/mock-data"
import {
  GitBranch,
  ChevronRight,
  ArrowRight,
  Save,
  Upload,
  Settings,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function WorkflowsPage() {
  const [selectedNode, setSelectedNode] = useState(workflowNodes[0].id)
  const selected = workflowNodes.find((n) => n.id === selectedNode) || workflowNodes[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Visual workflow editor for voice agent conversation flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">v2.1 - Published</Badge>
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Workflow Visual */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Conversation Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-0">
              {workflowNodes.map((node, i) => (
                <div key={node.id} className="flex flex-col items-center">
                  {/* Node */}
                  <button
                    onClick={() => setSelectedNode(node.id)}
                    className={cn(
                      "flex w-full max-w-md items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      selectedNode === node.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        selectedNode === node.id
                          ? "bg-primary text-primary-foreground"
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
                  {i < workflowNodes.length - 1 && (
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
        <Card>
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
      </div>
    </div>
  )
}
