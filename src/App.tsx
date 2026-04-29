import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { EventSidebar } from './components/EventSidebar'
import { FilterBar } from './components/FilterBar'
import { MapView } from './components/MapView'
import { StatusBar } from './components/StatusBar'
import { EventDetails } from './components/EventDetails'
import { fetchEonetEvents, normalizeMarkers } from './lib/eonet'
import { formatRelativeUpdate } from './lib/format'
import { getBmkgEarthquakeMarkers, getBmkgFeltMarkers } from './lib/bmkg'
import { getBmkgWeatherMarkers } from './lib/bmkgWeather'
import { getBmkgForecastMarkers, getOpenMeteoForecastMarkers } from './lib/forecast'
import { getForecastLocations, type ForecastDistrict, type ForecastLocation, type ForecastVillage } from './lib/locations'
import type { HazardMarker } from './types/eonet'

type RegionOption = 'global' | 'sea'
type SourceOption = 'eonet' | 'bmkg-earthquake' | 'bmkg-felt' | 'bmkg-weather' | 'bmkg-forecast' | 'openmeteo-forecast'

const forecastSelectionStorageKey = 'yui-hazards-forecast-selection-v1'

const southeastAsiaBounds = {
  minLat: -11,
  maxLat: 24,
  minLon: 92,
  maxLon: 141,
}

function isInSoutheastAsia(event: HazardMarker) {
  return (
    event.lat >= southeastAsiaBounds.minLat &&
    event.lat <= southeastAsiaBounds.maxLat &&
    event.lon >= southeastAsiaBounds.minLon &&
    event.lon <= southeastAsiaBounds.maxLon
  )
}

function App() {
  const [events, setEvents] = useState<HazardMarker[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRegion, setSelectedRegion] = useState<RegionOption>('sea')
  const [selectedWindowDays, setSelectedWindowDays] = useState<7 | 30 | 90>(30)
  const [selectedSource, setSelectedSource] = useState<SourceOption>('bmkg-weather')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locations, setLocations] = useState<ForecastLocation[]>([])
  const [selectedCityCode, setSelectedCityCode] = useState('31.71')
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('31.71.01')
  const [selectedVillageCode, setSelectedVillageCode] = useState('31.71.01.1001')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedCity = useMemo(
    () => locations.find((location) => location.code === selectedCityCode) ?? null,
    [locations, selectedCityCode],
  )

  const districts: ForecastDistrict[] = selectedCity?.districts ?? []
  const selectedDistrict = useMemo(
    () => districts.find((district) => district.code === selectedDistrictCode) ?? districts[0] ?? null,
    [districts, selectedDistrictCode],
  )

  const villages: ForecastVillage[] = selectedDistrict?.villages ?? []
  const selectedVillage = useMemo(
    () => villages.find((village) => village.code === selectedVillageCode) ?? villages[0] ?? null,
    [villages, selectedVillageCode],
  )

  useEffect(() => {
    let mounted = true

    async function loadLocations() {
      try {
        const options = await getForecastLocations()
        if (!mounted) return
        setLocations(options)

        let preferredCityCode = selectedCityCode
        let preferredDistrictCode = selectedDistrictCode
        let preferredVillageCode = selectedVillageCode

        if (typeof window !== 'undefined') {
          const saved = window.localStorage.getItem(forecastSelectionStorageKey)
          if (saved) {
            try {
              const parsed = JSON.parse(saved) as { cityCode?: string; districtCode?: string; villageCode?: string }
              preferredCityCode = parsed.cityCode ?? preferredCityCode
              preferredDistrictCode = parsed.districtCode ?? preferredDistrictCode
              preferredVillageCode = parsed.villageCode ?? preferredVillageCode
            } catch {
              window.localStorage.removeItem(forecastSelectionStorageKey)
            }
          }
        }

        const city = options.find((item) => item.code === preferredCityCode) ?? options[0]
        if (!city) return
        setSelectedCityCode(city.code)
        const district = city.districts.find((item) => item.code === preferredDistrictCode) ?? city.districts[0]
        if (!district) return
        setSelectedDistrictCode(district.code)
        const village = district.villages.find((item) => item.code === preferredVillageCode) ?? district.villages[0]
        if (!village) return
        setSelectedVillageCode(village.code)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Location load failed')
      }
    }

    loadLocations()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedCity) return
    const nextDistrict = selectedCity.districts.find((item) => item.code === selectedDistrictCode) ?? selectedCity.districts[0]
    if (nextDistrict && nextDistrict.code !== selectedDistrictCode) {
      setSelectedDistrictCode(nextDistrict.code)
      return
    }
    if (!nextDistrict) return
    const nextVillage = nextDistrict.villages.find((item) => item.code === selectedVillageCode) ?? nextDistrict.villages[0]
    if (nextVillage && nextVillage.code !== selectedVillageCode) {
      setSelectedVillageCode(nextVillage.code)
    }
  }, [selectedCity, selectedDistrictCode, selectedVillageCode])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      forecastSelectionStorageKey,
      JSON.stringify({
        cityCode: selectedCityCode,
        districtCode: selectedDistrictCode,
        villageCode: selectedVillageCode,
      }),
    )
  }, [selectedCityCode, selectedDistrictCode, selectedVillageCode])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        let markers: HazardMarker[] = []

        if (selectedSource === 'eonet') {
          const raw = await fetchEonetEvents(selectedWindowDays)
          markers = normalizeMarkers(raw).sort((a, b) => +new Date(b.date) - +new Date(a.date))
        } else if (selectedSource === 'bmkg-earthquake') {
          markers = getBmkgEarthquakeMarkers()
        } else if (selectedSource === 'bmkg-felt') {
          markers = getBmkgFeltMarkers()
        } else if (selectedSource === 'bmkg-weather') {
          markers = await getBmkgWeatherMarkers()
        } else if (selectedSource === 'bmkg-forecast') {
          markers = await getBmkgForecastMarkers(selectedVillageCode, selectedCityCode)
        } else if (selectedSource === 'openmeteo-forecast') {
          markers = await getOpenMeteoForecastMarkers(selectedVillageCode, selectedCityCode)
        }
        if (!mounted) return
        setEvents(markers)
        setSelectedId(markers[0]?.id ?? null)
        setLastUpdated(new Date().toISOString())
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Unknown fetch error')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    const timer = window.setInterval(load, 1000 * 60 * 10)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [selectedWindowDays, selectedSource, selectedCityCode, selectedVillageCode])

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category))).sort(),
    [events],
  )

  const filteredEvents = useMemo(() => {
    let scoped = events

    if (selectedRegion === 'sea') {
      scoped = scoped.filter(isInSoutheastAsia)
    }

    if (selectedCategory !== 'all') {
      scoped = scoped.filter((event) => event.category === selectedCategory)
    }

    return scoped
  }, [events, selectedCategory, selectedRegion])

  const selectedEvent = useMemo(
    () => filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedId],
  )

  const sourceLabel =
    selectedSource === 'bmkg-earthquake'
      ? 'BMKG earthquake feed'
      : selectedSource === 'bmkg-felt'
        ? 'BMKG felt earthquake feed'
        : selectedSource === 'bmkg-weather'
          ? 'BMKG weather alerts'
          : selectedSource === 'bmkg-forecast'
            ? 'BMKG forecast'
            : selectedSource === 'openmeteo-forecast'
              ? 'Open-Meteo forecast'
              : 'NASA EONET feed'

  const locationLabel =
    selectedSource === 'bmkg-forecast' || selectedSource === 'openmeteo-forecast'
      ? [selectedVillage?.name, selectedDistrict?.name, selectedCity?.name].filter(Boolean).join(', ')
      : null

  const focusTarget =
    selectedSource === 'bmkg-forecast' || selectedSource === 'openmeteo-forecast'
      ? {
          lat: selectedEvent?.lat ?? selectedCity?.lat ?? -6.2,
          lon: selectedEvent?.lon ?? selectedCity?.lon ?? 106.8,
          zoom: selectedSource === 'bmkg-forecast' ? 9 : 8,
          key: `${selectedSource}:${selectedCityCode}:${selectedDistrictCode}:${selectedVillageCode}:${selectedEvent?.id ?? 'none'}`,
        }
      : null

  return (
    <div className="app-shell">
      <header className="top-shell">
        <div>
          <p className="eyebrow">🌍 yui hazards dashboard</p>
          <h1>Natural hazard watch room</h1>
          <p className="subcopy">
            A live-ish hazard room with BMKG earthquake sample wiring plus NASA EONET fallback — useful first, pretty second, and less cursed than before.
          </p>
        </div>
      </header>

      <StatusBar
        total={events.length}
        visible={filteredEvents.length}
        lastUpdated={lastUpdated}
        lastUpdatedLabel={formatRelativeUpdate(lastUpdated)}
        loading={loading}
        error={error}
        sourceLabel={sourceLabel}
        locationLabel={locationLabel}
      />

      <FilterBar
        categories={categories}
        selectedCategory={selectedCategory}
        selectedRegion={selectedRegion}
        selectedWindowDays={selectedWindowDays}
        selectedSource={selectedSource}
        locations={locations}
        districts={districts}
        villages={villages}
        selectedCityCode={selectedCityCode}
        selectedDistrictCode={selectedDistrictCode}
        selectedVillageCode={selectedVillageCode}
        onCategoryChange={setSelectedCategory}
        onRegionChange={setSelectedRegion}
        onWindowChange={setSelectedWindowDays}
        onSourceChange={setSelectedSource}
        onCityChange={setSelectedCityCode}
        onDistrictChange={setSelectedDistrictCode}
        onVillageChange={setSelectedVillageCode}
        onSearchSelect={(cityCode, districtCode, villageCode) => {
          setSelectedCityCode(cityCode)
          setSelectedDistrictCode(districtCode)
          setSelectedVillageCode(villageCode)
        }}
      />

      <main className="dashboard-grid dashboard-grid-triple">
        <EventSidebar
          events={filteredEvents}
          selectedId={selectedEvent?.id ?? null}
          onSelect={(event) => setSelectedId(event.id)}
        />
        <MapView events={filteredEvents} selected={selectedEvent} focusTarget={focusTarget} />
        <EventDetails event={selectedEvent} />
      </main>

      <footer className="app-footer">
        Data rights reserved to EONET NASA and BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).
      </footer>
    </div>
  )
}

export default App
