"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Headphones, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardNavigationPanel } from "@/components/dashboard-navigation-panel"

export function MobileDashboardNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <TooltipProvider delayDuration={0}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="flex w-full max-w-full flex-col p-0 sm:max-w-sm">
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <DashboardNavigationPanel
              variant="sheet"
              showLogo={false}
              onNavigate={() => setOpen(false)}
              className="pt-10"
            />
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Headphones className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">ADNOC</p>
            <p className="truncate text-xs text-muted-foreground">Voice Concierge</p>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
