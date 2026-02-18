"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import {
  getStationsWithSignals,
  getCustomersWithProfiles,
  getDailyKPIs,
  getCalls,
  getHistoricalCalls,
  getStationAnalytics,
  getDocuments,
} from "@/lib/data/queries"
import type {
  DashboardKPIs,
  Call,
  HistoricalCall,
  StationAnalyticsRow,
  Document,
  CustomerWithProfile,
  Station,
  StationOperationalSignal,
} from "@/lib/types"

export type PreloadCacheKey =
  | "stationsDemo"
  | "customersDemo"
  | "dailyKpis"
  | "calls"
  | "historicalCalls"
  | "stationAnalytics"
  | "documents"

export type CachedStationsDemo = (Station & { operational_signals: StationOperationalSignal | null })[]

type CacheState = {
  stationsDemo: CachedStationsDemo | null
  customersDemo: CustomerWithProfile[] | null
  dailyKpis: DashboardKPIs | null
  calls: Call[] | null
  historicalCalls: HistoricalCall[] | null
  stationAnalytics: StationAnalyticsRow[] | null
  documents: Document[] | null
}

const emptyCache: CacheState = {
  stationsDemo: null,
  customersDemo: null,
  dailyKpis: null,
  calls: null,
  historicalCalls: null,
  stationAnalytics: null,
  documents: null,
}

type PreloadContextValue = {
  cache: CacheState
  getCached: <K extends PreloadCacheKey>(key: K) => CacheState[K] | null
  setCache: <K extends PreloadCacheKey>(key: K, data: CacheState[K]) => void
  preloadAll: () => Promise<void>
  preloadStarted: boolean
}

const PreloadContext = createContext<PreloadContextValue | null>(null)

export function PreloadCacheProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth()
  const [cache, setCacheState] = useState<CacheState>(emptyCache)
  const [preloadStarted, setPreloadStarted] = useState(false)
  const preloadDoneRef = useRef(false)

  const getCached = useCallback(
    <K extends PreloadCacheKey>(key: K): CacheState[K] | null => {
      return cache[key] as CacheState[K] | null
    },
    [cache]
  )

  const setCache = useCallback(<K extends PreloadCacheKey>(key: K, data: CacheState[K]) => {
    setCacheState((prev) => ({ ...prev, [key]: data }))
  }, [])

  const preloadAll = useCallback(async () => {
    if (preloadDoneRef.current) return
    preloadDoneRef.current = true
    setPreloadStarted(true)

    try {
      const [
        stationsDemo,
        customersDemo,
        dailyKpis,
        calls,
        historicalCalls,
        stationAnalytics,
        documents,
      ] = await Promise.allSettled([
        getStationsWithSignals(),
        getCustomersWithProfiles(),
        getDailyKPIs(),
        getCalls(),
        getHistoricalCalls(),
        getStationAnalytics(),
        getDocuments(),
      ])

      setCacheState((prev) => ({
        ...prev,
        stationsDemo: stationsDemo.status === "fulfilled" ? stationsDemo.value : prev.stationsDemo,
        customersDemo: customersDemo.status === "fulfilled" ? customersDemo.value : prev.customersDemo,
        dailyKpis: dailyKpis.status === "fulfilled" ? dailyKpis.value : prev.dailyKpis,
        calls: calls.status === "fulfilled" ? calls.value : prev.calls,
        historicalCalls: historicalCalls.status === "fulfilled" ? historicalCalls.value : prev.historicalCalls,
        stationAnalytics: stationAnalytics.status === "fulfilled" ? stationAnalytics.value : prev.stationAnalytics,
        documents: documents.status === "fulfilled" ? documents.value : prev.documents,
      }))
    } catch (e) {
      console.error("[PreloadCache] Preload failed:", e)
    }
  }, [])

  // After auth is ready, wait so current page can load first, then preload the rest
  useEffect(() => {
    if (authLoading) return
    const t = setTimeout(() => {
      void preloadAll()
    }, 800)
    return () => clearTimeout(t)
  }, [authLoading, preloadAll])

  const value: PreloadContextValue = {
    cache,
    getCached,
    setCache,
    preloadAll,
    preloadStarted,
  }

  return (
    <PreloadContext.Provider value={value}>
      {children}
    </PreloadContext.Provider>
  )
}

export function usePreloadCache(): PreloadContextValue {
  const ctx = useContext(PreloadContext)
  if (!ctx) throw new Error("usePreloadCache must be used within PreloadCacheProvider")
  return ctx
}
