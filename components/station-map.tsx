"use client"

import { useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export interface MapStation {
  id: string
  name: string
  city: string
  region: string
  lat: number
  lng: number
  revenue?: number
  calls?: number
  station_number?: number
  ev_charging?: boolean
  services?: string[]
}

interface StationMapProps {
  stations: MapStation[]
  selectedIds: Set<string>
  onToggleStation: (id: string) => void
}

/* ── Custom marker icons ── */

function createIcon(selected: boolean) {
  const color = selected ? "#0047BA" : "#94a3b8"
  const glow = selected ? "drop-shadow(0 0 6px rgba(0,71,186,0.5))" : "none"
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z"
            fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="14" cy="14" r="6" fill="#fff"/>
    </svg>
  `
  return L.divIcon({
    html: `<div style="filter:${glow};width:28px;height:40px">${svg}</div>`,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  })
}

const selectedIcon = createIcon(true)
const defaultIcon = createIcon(false)

/* ── Main map component using vanilla Leaflet (handles React Strict Mode) ── */

function StationMapInner({
  stations,
  selectedIds,
  onToggleStation,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const onToggleRef = useRef(onToggleStation)

  // Keep callback ref up to date
  onToggleRef.current = onToggleStation

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [24.5, 55.0],
      zoom: 8,
      zoomControl: true,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  // Sync markers when stations or selection changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const existingMarkers = markersRef.current
    const currentIds = new Set(stations.map((s) => s.id))

    // Remove markers for stations no longer present
    for (const [id, marker] of existingMarkers) {
      if (!currentIds.has(id)) {
        marker.remove()
        existingMarkers.delete(id)
      }
    }

    // Add or update markers
    for (const station of stations) {
      const isSelected = selectedIds.has(station.id)
      const icon = isSelected ? selectedIcon : defaultIcon

      let marker = existingMarkers.get(station.id)

      if (marker) {
        // Update existing marker icon
        marker.setIcon(icon)
      } else {
        // Create new marker
        marker = L.marker([station.lat, station.lng], { icon })

        const stationNum = station.station_number ? ` (${station.station_number})` : ""
        const evBadge = station.ev_charging ? `<span style="display:inline-block;background:#10b981;color:#fff;padding:1px 6px;border-radius:9px;font-size:10px;margin-left:4px">⚡ EV</span>` : ""
        const servicesTags = station.services?.length
          ? `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">${station.services.map(s => `<span style="display:inline-block;background:#f1f5f9;color:#475569;padding:1px 6px;border-radius:9px;font-size:9px">${s}</span>`).join("")}</div>`
          : ""
        const popupHtml = `
          <div style="min-width:180px;font-size:13px">
            <p style="font-weight:600;margin:0 0 2px">${station.name}${stationNum}${evBadge}</p>
            <p style="color:#888;font-size:11px;margin:0">${station.city} · ${station.region}</p>
            ${station.revenue !== undefined ? `<p style="font-size:11px;margin:4px 0 0">Revenue: <strong>${station.revenue.toLocaleString()} AED</strong></p>` : ""}
            ${station.calls !== undefined ? `<p style="font-size:11px;margin:2px 0 0">Calls: <strong>${station.calls}</strong></p>` : ""}
            ${servicesTags}
          </div>
        `
        marker.bindPopup(popupHtml)

        // Use closure to capture station.id
        const stationId = station.id
        marker.on("click", () => {
          onToggleRef.current(stationId)
        })

        marker.addTo(map)
        existingMarkers.set(station.id, marker)
      }
    }

    // Fit bounds
    if (stations.length > 0) {
      const bounds = L.latLngBounds(stations.map((s) => [s.lat, s.lng]))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
    }
  }, [stations, selectedIds])

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg"
      style={{ minHeight: "100%" }}
    />
  )
}

export default StationMapInner
