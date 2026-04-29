import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { HazardMarker } from '../types/eonet'
import { formatEventTime } from '../lib/format'
import { getCategoryColor } from '../lib/categories'

type FocusTarget = {
  lat: number
  lon: number
  zoom?: number
  key: string
}

type Props = {
  events: HazardMarker[]
  selected: HazardMarker | null
  focusTarget?: FocusTarget | null
}

function popupHtml(event: HazardMarker) {
  const source = event.sourceUrl
    ? `<div><a href="${event.sourceUrl}" target="_blank" rel="noreferrer">shakemap / source ↗</a></div>`
    : ''
  const description = event.description ? `<div>${escapeHtml(event.description)}</div>` : ''

  return `
    <div class="popup-copy">
      <strong>${escapeHtml(event.title)}</strong>
      <div>${escapeHtml(event.category)}</div>
      <small>${escapeHtml(formatEventTime(event.date))}</small>
      ${description}
      ${source}
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function iconFor(color: string) {
  return L.divIcon({
    className: 'hazard-pin-wrapper',
    html: `<span class="hazard-pin" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function parsePolygon(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return [] as [number, number][]
  return raw
    .split(/\s+/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latStr, lonStr] = pair.split(',')
      const lat = Number(latStr)
      const lon = Number(lonStr)
      return Number.isFinite(lat) && Number.isFinite(lon) ? ([lat, lon] as [number, number]) : null
    })
    .filter((point): point is [number, number] => point !== null)
}

export function MapView({ events, selected, focusTarget }: Props) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return

    const map = L.map(mapNodeRef.current, {
      center: [14, 110],
      zoom: 2,
      worldCopyJump: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    mapRef.current = map
    layerRef.current = layerGroup

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layerGroup = layerRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    for (const event of events) {
      const color = getCategoryColor(event.category)
      const polygonPoints = parsePolygon(event.meta?.polygon)

      if (polygonPoints.length >= 3) {
        const polygon = L.polygon(polygonPoints, {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.12,
        })
        polygon.bindPopup(popupHtml(event))
        layerGroup.addLayer(polygon)
      }

      const marker = L.marker([event.lat, event.lon], {
        icon: iconFor(color),
      })
      marker.bindPopup(popupHtml(event))
      layerGroup.addLayer(marker)
    }
  }, [events])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusTarget) return

    map.flyTo([focusTarget.lat, focusTarget.lon], focusTarget.zoom ?? 8, { duration: 1.1 })
  }, [focusTarget])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected || focusTarget) return

    const polygonPoints = parsePolygon(selected.meta?.polygon)
    if (polygonPoints.length >= 3) {
      map.fitBounds(L.latLngBounds(polygonPoints), { padding: [24, 24], maxZoom: 8 })
      return
    }

    map.flyTo([selected.lat, selected.lon], 5, { duration: 1.25 })
  }, [selected, focusTarget])

  return (
    <div className="map-card">
      <div ref={mapNodeRef} className="map-view" />
    </div>
  )
}
