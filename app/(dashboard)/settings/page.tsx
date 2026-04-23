"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import { Settings, Users, Server, Database, Palette, Save } from "lucide-react"

const users = [
  { name: "Mariam K.", email: "mariam.k@adnoc.ae", role: "Admin", status: "Active" },
  { name: "Rashed A.", email: "rashed.a@adnoc.ae", role: "Operator", status: "Active" },
  { name: "James P.", email: "james.p@adnoc.ae", role: "Operator", status: "Active" },
  { name: "Sara T.", email: "sara.t@adnoc.ae", role: "Viewer", status: "Inactive" },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground text-balance">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure organization, users, and system preferences
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="organization" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-3.5 w-3.5" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-3.5 w-3.5" />
            Users & Roles
          </TabsTrigger>
          <TabsTrigger value="environment" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Server className="h-3.5 w-3.5" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="logging" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="h-3.5 w-3.5" />
            Logging
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-3.5 w-3.5" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Organization */}
        <TabsContent value="organization" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Organization Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                <div>
                  <Label className="text-xs">Organization Name</Label>
                  <Input defaultValue="ADNOC Distribution" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Contact Email</Label>
                  <Input defaultValue="ops@adnoc.ae" className="h-9 text-sm mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Region</Label>
                  <Select defaultValue="uae">
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uae">UAE</SelectItem>
                      <SelectItem value="gcc">GCC</SelectItem>
                      <SelectItem value="mena">MENA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Timezone</Label>
                  <Select defaultValue="gst">
                    <SelectTrigger className="h-9 text-sm mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gst">GST (UTC+4)</SelectItem>
                      <SelectItem value="ast">AST (UTC+3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" className="h-8 gap-1 text-xs mt-4">
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users & Roles */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-semibold">Users & Roles</CardTitle>
                <Button size="sm" className="h-7 w-full text-xs sm:w-auto">
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs w-24">Role</TableHead>
                    <TableHead className="text-xs w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.email}>
                      <TableCell className="text-sm font-medium text-foreground">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "Admin" ? "default" : "outline"} className="text-[10px]">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${u.status === "Active" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground"}`}
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment */}
        <TabsContent value="environment" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Environment Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Deployment Mode</Label>
                    <p className="text-xs text-muted-foreground">Cloud or On-Premises infrastructure</p>
                  </div>
                  <Select defaultValue="cloud">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cloud">Cloud</SelectItem>
                      <SelectItem value="on-prem">On-Premises</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Database Connection String</Label>
                  <Input defaultValue="postgresql://adnoc-user:****@db.supabase.co:5432/voice_concierge" className="h-9 text-sm mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Redis Connection String</Label>
                  <Input defaultValue="redis://adnoc-cache:****@redis.internal:6379/0" className="h-9 text-sm mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">RAG Vector Store Endpoint</Label>
                  <Input defaultValue="https://vectors.adnoc-ai.internal/v1" className="h-9 text-sm mt-1 font-mono" />
                </div>
                <Button size="sm" className="h-8 gap-1 text-xs w-fit">
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logging */}
        <TabsContent value="logging" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Logging & Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Retention Period</Label>
                    <p className="text-xs text-muted-foreground">How long to keep call logs and transcripts</p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Log Level</Label>
                    <p className="text-xs text-muted-foreground">Verbosity of system logs</p>
                  </div>
                  <Select defaultValue="info">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Audit Trail</Label>
                    <p className="text-xs text-muted-foreground">Log all operator actions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Export Logs</Label>
                    <p className="text-xs text-muted-foreground">Enable external log forwarding (Syslog/SIEM)</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Theme</Label>
                    <p className="text-xs text-muted-foreground">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {["light", "dark", "system"].map((t) => (
                      <Button
                        key={t}
                        variant={theme === t ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs capitalize"
                        onClick={() => setTheme(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Brand Primary Color</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-10 w-10 rounded-lg bg-primary border border-border" />
                    <div>
                      <p className="text-sm font-medium text-foreground">ADNOC Blue</p>
                      <p className="text-xs text-muted-foreground font-mono">#0047BA / HSL(216, 100%, 36%)</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Compact Mode</Label>
                    <p className="text-xs text-muted-foreground">Reduce spacing for higher information density</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
