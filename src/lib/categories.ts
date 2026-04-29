export const categoryColors: Record<string, string> = {
  wildfires: '#ef4444',
  severeStorms: '#3b82f6',
  volcanoes: '#f97316',
  floods: '#06b6d4',
  seaLakeIce: '#94a3b8',
  landslides: '#8b5cf6',
  drought: '#eab308',
  earthquakes: '#f59e0b',
  feltEarthquakes: '#fb7185',
  weatherAlerts: '#22c55e',
  weatherForecasts: '#38bdf8',
  default: '#14b8a6',
}

export function slugCategory(title: string) {
  return title.replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, '-').replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^([A-Z])/, (m) => m.toLowerCase()) || 'default'
}

export function getCategoryColor(title: string) {
  const slug = slugCategory(title)
  return categoryColors[slug] || categoryColors.default
}
