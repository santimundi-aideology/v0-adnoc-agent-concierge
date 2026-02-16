"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
const dbSchemas = [
  {
    table: "inventory",
    columns: [
      { name: "sku", type: "VARCHAR(20)", pk: true },
      { name: "station_id", type: "VARCHAR(10)", pk: false },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "category", type: "VARCHAR(50)", pk: false },
      { name: "price", type: "DECIMAL(10,2)", pk: false },
      { name: "stock", type: "INTEGER", pk: false },
      { name: "updated_at", type: "TIMESTAMP", pk: false },
    ],
  },
  {
    table: "stations",
    columns: [
      { name: "id", type: "VARCHAR(10)", pk: true },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "city", type: "VARCHAR(50)", pk: false },
      { name: "region", type: "VARCHAR(50)", pk: false },
      { name: "lat", type: "DECIMAL(10,6)", pk: false },
      { name: "lng", type: "DECIMAL(10,6)", pk: false },
    ],
  },
  {
    table: "promotions",
    columns: [
      { name: "id", type: "VARCHAR(20)", pk: true },
      { name: "name", type: "VARCHAR(100)", pk: false },
      { name: "discount", type: "VARCHAR(50)", pk: false },
      { name: "valid_until", type: "DATE", pk: false },
      { name: "sku_list", type: "TEXT[]", pk: false },
    ],
  },
  {
    table: "bookings",
    columns: [
      { name: "id", type: "SERIAL", pk: true },
      { name: "station_id", type: "VARCHAR(10)", pk: false },
      { name: "service", type: "VARCHAR(50)", pk: false },
      { name: "time_slot", type: "TIMESTAMP", pk: false },
      { name: "customer_phone", type: "VARCHAR(20)", pk: false },
      { name: "status", type: "VARCHAR(20)", pk: false },
    ],
  },
  {
    table: "loyalty",
    columns: [
      { name: "id", type: "VARCHAR(20)", pk: true },
      { name: "customer_name", type: "VARCHAR(100)", pk: false },
      { name: "phone", type: "VARCHAR(20)", pk: false },
      { name: "points", type: "INTEGER", pk: false },
      { name: "tier", type: "VARCHAR(20)", pk: false },
    ],
  },
]
import {
  Database,
  Play,
  Shield,
  Key,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mockQueryResult = [
  { sku: "COF-001", name: "Arabic Coffee (Large)", price: 12, stock: 45 },
  { sku: "COF-002", name: "Cappuccino (Regular)", price: 15, stock: 32 },
  { sku: "SNK-001", name: "Zaatar Croissant", price: 8, stock: 28 },
]

const savedQueries = [
  { name: "Station Inventory Check", query: "SELECT sku, name, price, stock FROM inventory WHERE station_id = ? AND stock > 0" },
  { name: "Active Promotions", query: "SELECT * FROM promotions WHERE valid_until >= CURRENT_DATE" },
  { name: "Today's Bookings", query: "SELECT * FROM bookings WHERE date(time_slot) = CURRENT_DATE ORDER BY time_slot" },
]

export default function DataSourcesPage() {
  const [selectedTable, setSelectedTable] = useState("inventory")
  const [sqlQuery, setSqlQuery] = useState(
    "SELECT sku, name, price, stock FROM inventory WHERE station_id='STN-001' AND stock > 0"
  )
  const [showResults, setShowResults] = useState(false)

  const selectedSchema = dbSchemas.find((s) => s.table === selectedTable)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground text-balance">Data Sources</h1>
        <p className="text-sm text-muted-foreground">
          Manage SQL connectors, browse schemas, and run queries
        </p>
      </div>

      {/* Connector Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">PostgreSQL</p>
                  <p className="text-xs text-muted-foreground">Supabase Hosted</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Latency: 280ms avg</span>
              <Button variant="outline" size="sm" className="h-6 text-[10px]">
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Redis Cache</p>
                  <p className="text-xs text-muted-foreground">Session & Inventory</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Degraded
              </Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Latency: 890ms avg</span>
              <Button variant="outline" size="sm" className="h-6 text-[10px]">
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schema Browser */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Schema Browser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {/* Table list */}
            <div className="md:col-span-2 flex flex-col gap-1">
              {dbSchemas.map((schema) => (
                <button
                  key={schema.table}
                  onClick={() => setSelectedTable(schema.table)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                    selectedTable === schema.table
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Database className="h-3.5 w-3.5 shrink-0" />
                  {schema.table}
                  <span className={cn(
                    "ml-auto text-xs",
                    selectedTable === schema.table ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {schema.columns.length} cols
                  </span>
                </button>
              ))}
            </div>

            {/* Selected table columns */}
            <div className="md:col-span-3">
              {selectedSchema && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Column</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs w-12">PK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSchema.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-mono text-sm text-foreground">{col.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{col.type}</TableCell>
                        <TableCell>
                          {col.pk && <Key className="h-3.5 w-3.5 text-primary" />}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Query Editor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 flex-wrap">
              {savedQueries.map((sq) => (
                <Button
                  key={sq.name}
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    setSqlQuery(sq.query)
                    setShowResults(false)
                  }}
                >
                  {sq.name}
                </Button>
              ))}
            </div>
            <Textarea
              value={sqlQuery}
              onChange={(e) => {
                setSqlQuery(e.target.value)
                setShowResults(false)
              }}
              className="min-h-20 font-mono text-sm resize-none"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setShowResults(true)}
              >
                <Play className="h-3.5 w-3.5" />
                Run Query
              </Button>
              <span className="text-xs text-muted-foreground">
                Read-only mode. Write actions are disabled.
              </span>
            </div>
            {showResults && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(mockQueryResult[0]).map((k) => (
                        <TableHead key={k} className="text-xs">{k}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockQueryResult.map((row, ri) => (
                      <TableRow key={ri}>
                        {Object.values(row).map((v, vi) => (
                          <TableCell key={vi} className="text-sm text-foreground">{String(v)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-xs text-muted-foreground">
                  3 rows returned in 280ms
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safety Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Safety Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <p className="text-xs font-medium text-muted-foreground w-full mb-1">
                Allowlisted Tables
              </p>
              {["inventory", "stations", "promotions", "bookings", "loyalty"].map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">PII Redaction</Label>
                <p className="text-xs text-muted-foreground">Automatically redact phone numbers and names in logs</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Write Actions Disabled</Label>
                <p className="text-xs text-muted-foreground">Block INSERT, UPDATE, DELETE via voice agent</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Query Timeout</Label>
                <p className="text-xs text-muted-foreground">Max query execution time: 5 seconds</p>
              </div>
              <Badge variant="outline" className="text-xs">5s</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
