import { useMemo, useState } from 'react'
import type { ForecastDistrict, ForecastLocation, ForecastVillage } from '../lib/locations'

type SearchOption = {
  key: string
  label: string
  cityCode: string
  districtCode: string
  villageCode: string
}

type Props = {
  categories: string[]
  selectedCategory: string
  selectedRegion: 'global' | 'sea'
  selectedWindowDays: 7 | 30 | 90
  selectedSource: 'eonet' | 'bmkg-earthquake' | 'bmkg-felt' | 'bmkg-weather' | 'bmkg-forecast' | 'openmeteo-forecast'
  locations: ForecastLocation[]
  districts: ForecastDistrict[]
  villages: ForecastVillage[]
  selectedCityCode: string
  selectedDistrictCode: string
  selectedVillageCode: string
  onCategoryChange: (value: string) => void
  onRegionChange: (value: 'global' | 'sea') => void
  onWindowChange: (value: 7 | 30 | 90) => void
  onSourceChange: (value: 'eonet' | 'bmkg-earthquake' | 'bmkg-felt' | 'bmkg-weather' | 'bmkg-forecast' | 'openmeteo-forecast') => void
  onCityChange: (value: string) => void
  onDistrictChange: (value: string) => void
  onVillageChange: (value: string) => void
  onSearchSelect: (cityCode: string, districtCode: string, villageCode: string) => void
}

export function FilterBar({ categories, selectedCategory, selectedRegion, selectedWindowDays, selectedSource, locations, districts, villages, selectedCityCode, selectedDistrictCode, selectedVillageCode, onCategoryChange, onRegionChange, onWindowChange, onSourceChange, onCityChange, onDistrictChange, onVillageChange, onSearchSelect }: Props) {
  const isForecastSource = selectedSource === 'bmkg-forecast' || selectedSource === 'openmeteo-forecast'
  const [searchQuery, setSearchQuery] = useState('')

  const searchOptions = useMemo<SearchOption[]>(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []

    const matches: SearchOption[] = []
    for (const location of locations) {
      for (const district of location.districts) {
        for (const village of district.villages) {
          const haystack = `${location.name} ${location.province} ${district.name} ${village.name} ${village.type}`.toLowerCase()
          if (!haystack.includes(query)) continue
          matches.push({
            key: `${location.code}:${district.code}:${village.code}`,
            label: `${village.name} (${village.type}) — ${district.name} — ${location.name}`,
            cityCode: location.code,
            districtCode: district.code,
            villageCode: village.code,
          })
          if (matches.length >= 60) return matches
        }
      }
    }
    return matches
  }, [locations, searchQuery])

  const handleSelect = (option: SearchOption) => {
    onSearchSelect(option.cityCode, option.districtCode, option.villageCode)
    setSearchQuery('')
  }

  return (
    <div className="filter-bar filter-grid">
      <label>
        <span>Region</span>
        <select value={selectedRegion} onChange={(e) => onRegionChange(e.target.value as 'global' | 'sea')}>
          <option value="sea">Southeast Asia</option>
          <option value="global">Global</option>
        </select>
      </label>

      <label>
        <span>Window</span>
        <select value={selectedWindowDays} onChange={(e) => onWindowChange(Number(e.target.value) as 7 | 30 | 90)}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </label>

      <label>
        <span>Source</span>
        <select value={selectedSource} onChange={(e) => onSourceChange(e.target.value as 'eonet' | 'bmkg-earthquake' | 'bmkg-felt' | 'bmkg-weather' | 'bmkg-forecast' | 'openmeteo-forecast')}>
          <option value="bmkg-earthquake">BMKG Earthquake</option>
          <option value="bmkg-felt">BMKG Felt Earthquakes</option>
          <option value="bmkg-weather">BMKG Weather Alerts</option>
          <option value="bmkg-forecast">BMKG Forecast</option>
          <option value="openmeteo-forecast">Open-Meteo Forecast</option>
          <option value="eonet">NASA EONET</option>
        </select>
      </label>

      {isForecastSource ? (
        <>
          <label className="search-select-group search-select-group-wide">
            <span>Search location</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search and pick a location result..."
            />
            {searchQuery ? (
              <div className="search-results-panel">
                {searchOptions.length ? (
                  <div className="search-results-list">
                    {searchOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className="search-result-item"
                        onClick={() => handleSelect(option)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="search-results-empty">No matching locations yet.</div>
                )}
              </div>
            ) : null}
            <small>
              Type to search, then tap a result below.
            </small>
          </label>

          <label>
            <span>Kota / Kabupaten</span>
            <select value={selectedCityCode} onChange={(e) => onCityChange(e.target.value)}>
              {locations.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Kecamatan</span>
            <select value={selectedDistrictCode} onChange={(e) => onDistrictChange(e.target.value)}>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Kelurahan / Desa</span>
            <select value={selectedVillageCode} onChange={(e) => onVillageChange(e.target.value)}>
              {villages.map((village) => (
                <option key={village.code} value={village.code}>
                  {village.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label>
        <span>Category</span>
        <select value={selectedCategory} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
