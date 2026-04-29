import type { HazardMarker } from '../types/eonet'

const fallback: HazardMarker[] = [
  {
    id: 'forecast-fallback',
    title: 'Forecast data unavailable',
    category: 'Weather Forecasts',
    categoryId: 'weather-forecasts',
    date: new Date().toISOString(),
    lat: -6.1647,
    lon: 106.8454,
    active: true,
    description: 'Forecast data failed to load.',
    meta: { note: 'Forecast endpoint missing.', sourceKind: 'forecast-fallback' },
  },
]

async function load(path: string) {
  const response = await fetch(path, { cache: 'no-store' })
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  const data = await response.json()
  if (Array.isArray(data) && data.length) return data as HazardMarker[]
  if (data && typeof data === 'object' && 'error' in data) throw new Error(String(data.error))
  return fallback
}

export async function getBmkgForecastMarkers(adm4: string, cityCode: string): Promise<HazardMarker[]> {
  try {
    return (await load(`/api/forecast?source=bmkg&adm4=${encodeURIComponent(adm4)}&cityCode=${encodeURIComponent(cityCode)}`)).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  } catch {
    return fallback
  }
}

export async function getOpenMeteoForecastMarkers(adm4: string, cityCode: string): Promise<HazardMarker[]> {
  try {
    return (await load(`/api/forecast?source=openmeteo&adm4=${encodeURIComponent(adm4)}&cityCode=${encodeURIComponent(cityCode)}`)).sort((a, b) => +new Date(a.date) - +new Date(b.date))
  } catch {
    return fallback
  }
}
