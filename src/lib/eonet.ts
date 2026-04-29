import type { EonetEvent, HazardMarker } from '../types/eonet'
import { slugCategory } from './categories'

export async function fetchEonetEvents(windowDays: number): Promise<EonetEvent[]> {
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=${windowDays}&limit=300`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`EONET request failed: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data.events) ? data.events : []
}

function extractLatLon(geometry: EonetEvent['geometry'][number]): { lat: number; lon: number } | null {
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2) {
    const [lon, lat] = geometry.coordinates as number[]
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon }
  }

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    const polygon = geometry.coordinates as number[][][]
    const firstRing = polygon[0]
    const firstPoint = firstRing?.[0]
    if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
      const [lon, lat] = firstPoint
      if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon }
    }
  }

  return null
}

export function normalizeMarkers(events: EonetEvent[]): HazardMarker[] {
  return events.flatMap((event) => {
    const primaryCategory = event.categories[0]
    const markers: HazardMarker[] = []

    for (const [index, geometry] of event.geometry.entries()) {
      const coords = extractLatLon(geometry)
      if (!coords || !primaryCategory) continue

      markers.push({
        id: `${event.id}-${index}`,
        title: event.title,
        category: primaryCategory.title,
        categoryId: slugCategory(primaryCategory.title),
        date: geometry.date,
        lat: coords.lat,
        lon: coords.lon,
        active: !event.closed,
        sourceUrl: event.sources[0]?.url,
      })
    }

    return markers
  })
}
