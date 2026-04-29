export type EonetCategory = {
  id: string
  title: string
}

export type EonetSource = {
  id?: string
  url: string
}

export type EonetGeometry = {
  magnitudeValue?: number
  magnitudeUnit?: string
  date: string
  type: 'Point' | 'Polygon' | string
  coordinates: number[] | number[][][]
}

export type EonetEvent = {
  id: string
  title: string
  description?: string
  link?: string
  closed?: string | null
  categories: EonetCategory[]
  sources: EonetSource[]
  geometry: EonetGeometry[]
}

export type HazardMarker = {
  id: string
  title: string
  category: string
  categoryId: string
  date: string
  lat: number
  lon: number
  active: boolean
  sourceUrl?: string
  description?: string
  meta?: Record<string, unknown>
}
