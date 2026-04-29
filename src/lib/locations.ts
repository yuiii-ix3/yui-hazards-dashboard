export type ForecastVillage = {
  code: string
  name: string
  type: string
  label: string
}

export type ForecastDistrict = {
  code: string
  name: string
  defaultVillageCode: string
  villages: ForecastVillage[]
}

export type ForecastLocation = {
  code: string
  name: string
  capital: string
  province: string
  label: string
  lat: number
  lon: number
  adm4: string
  adm4Name: string
  defaultDistrictCode: string
  defaultVillageCode: string
  districts: ForecastDistrict[]
}

export async function getForecastLocations(): Promise<ForecastLocation[]> {
  const response = await fetch('/api/locations', { cache: 'no-store' })
  if (!response.ok) throw new Error(`locations returned ${response.status}`)
  return (await response.json()) as ForecastLocation[]
}
