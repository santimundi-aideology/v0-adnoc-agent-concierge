"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getDocuments } from "@/lib/data/queries"
import { usePreloadCache } from "@/lib/data/preload-cache"
import { useAuth } from "@/lib/supabase/auth-context"
import type { Document } from "@/lib/types"
import {
  BookOpen,
  Upload,
  RefreshCw,
  FileText,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mockRetrievalResults = [
  {
    chunk: "Coffee + Croissant Bundle: Customers purchasing any coffee beverage with a Zaatar Croissant receive 20% off the combined total. Valid at all stations through March 15, 2026.",
    doc: "ADNOC_Promotions_Guide_2026.pdf",
    page: 12,
    score: 0.94,
  },
  {
    chunk: "Loyalty members earn double points on all bundled purchases during the promotional period. Points are credited within 24 hours of transaction completion.",
    doc: "ADNOC_Promotions_Guide_2026.pdf",
    page: 14,
    score: 0.82,
  },
  {
    chunk: "The Wash & Go Combo provides a 15 AED discount when combining any car wash service with a beverage purchase. Applicable at drive-through enabled stations only.",
    doc: "ADNOC_Promotions_Guide_2026.pdf",
    page: 18,
    score: 0.71,
  },
]

export default function KnowledgeBasePage() {
  const { loading: authLoading } = useAuth()
  const { getCached, setCache } = usePreloadCache()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [testQuery, setTestQuery] = useState("")
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (authLoading) return
    const cached = getCached("documents")
    if (cached != null) {
      setDocuments(cached)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void getDocuments()
      .then((rows) => {
        if (cancelled) return
        setDocuments(rows)
        setCache("documents", rows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to load documents:", err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, getCached, setCache])

  if (authLoading || loading) {
    return <div className="flex items-center justify-center p-12 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">
            Manage RAG documents and test retrieval
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last index: Feb 13, 2026 08:00
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs ml-2">
            <RefreshCw className="h-3 w-3" />
            Re-index All
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/40">
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drop PDF, DOCX, or TXT files here
              </p>
              <p className="text-xs text-muted-foreground">
                Files will be chunked and indexed for RAG retrieval
              </p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">
                Browse Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs w-16">Type</TableHead>
                  <TableHead className="text-xs w-20">Size</TableHead>
                  <TableHead className="text-xs w-20">Chunks</TableHead>
                  <TableHead className="text-xs w-36">Last Indexed</TableHead>
                  <TableHead className="text-xs w-24">Status</TableHead>
                  <TableHead className="text-xs w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium text-foreground">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{doc.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{doc.size}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{doc.chunks || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {doc.lastIndexed !== "-" ? new Date(doc.lastIndexed).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          doc.status === "complete"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : doc.status === "running"
                              ? "border-primary/30 text-primary"
                              : "border-border text-muted-foreground"
                        )}
                      >
                        {doc.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {doc.status === "complete" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-sm">{doc.name}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 md:grid-cols-2 mt-2">
                            <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-center min-h-48">
                              <div className="text-center text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-2" />
                                <p className="text-xs">Document Preview</p>
                                <p className="text-[10px]">{doc.chunks} chunks indexed</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div>
                                <Label className="text-xs">Chunk Size</Label>
                                <Input defaultValue="512" className="h-8 text-sm mt-1" />
                              </div>
                              <div>
                                <Label className="text-xs">Overlap</Label>
                                <Input defaultValue="50" className="h-8 text-sm mt-1" />
                              </div>
                              <div>
                                <Label className="text-xs">Top K</Label>
                                <Input defaultValue="5" className="h-8 text-sm mt-1" />
                              </div>
                              <Button size="sm" className="h-8 text-xs mt-2">
                                Save Settings
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Test Retrieval */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Test Retrieval Playground
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Textarea
                placeholder="Enter a test question, e.g. 'What coffee promotions are currently active?'"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="min-h-16 text-sm resize-none flex-1"
              />
              <Button
                onClick={() => setShowResults(true)}
                className="shrink-0"
                disabled={!testQuery}
              >
                <Search className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
            {showResults && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Retrieved Chunks
                </h3>
                {mockRetrievalResults.map((result, i) => (
                  <div key={i} className="rounded-md border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        Score: {result.score}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{result.doc}</span>
                      <span className="text-xs text-muted-foreground">p.{result.page}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{result.chunk}</p>
                  </div>
                ))}
                <Separator />
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Generated Answer</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Yes, there is an active Coffee + Croissant Bundle promotion offering 20% off when purchasing any coffee with a Zaatar Croissant. This is valid at all stations through March 15, 2026. Additionally, loyalty members earn double points on bundled purchases.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
