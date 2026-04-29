import type { HazardMarker } from '../types/eonet'

const bmkgWeatherAlertSamples: HazardMarker[] = [
  {
    id: 'bmkg-weather-jabar',
    title: 'BMKG Weather Alert — Jawa Barat (sample fallback)',
    category: 'Weather Alerts',
    categoryId: 'weather-alerts',
    date: '2026-04-29T02:30:00+00:00',
    lat: -6.9,
    lon: 107.6,
    active: true,
    description: 'Sample CAP-backed provincial alert slot for severe weather / nowcast integration.',
    meta: {
      localTime: '29 Apr 2026 sample',
      urgency: 'Immediate',
      severity: 'Moderate',
      certainty: 'Likely',
      area: 'Provinsi Jawa Barat',
      language: 'id',
      sourceKind: 'bmkg-cap-sample',
      note: 'Live BMKG CAP fetch fell back to sample data.',
    },
  },
]

export async function getBmkgWeatherMarkers(): Promise<HazardMarker[]> {
  try {
    const response = await fetch('/bmkg-weather.json', { cache: 'no-store' })
    if (!response.ok) throw new Error(`local BMKG weather cache returned ${response.status}`)
    const data = (await response.json()) as HazardMarker[]
    if (Array.isArray(data) && data.length > 0) {
      return data.sort((a, b) => +new Date(b.date) - +new Date(a.date))
    }
    return bmkgWeatherAlertSamples
  } catch {
    return bmkgWeatherAlertSamples
  }
}
