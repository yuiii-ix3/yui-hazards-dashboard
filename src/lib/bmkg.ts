import type { HazardMarker } from '../types/eonet'
import { bmkgAutogempaXml, bmkgGempadirasakanXml, bmkgGempaterkiniXml } from './bmkgSamples'

function text(node: Element, tag: string) {
  return node.querySelector(tag)?.textContent?.trim() || ''
}

function parseCoordinates(raw: string) {
  const [latStr, lonStr] = raw.split(',').map((v) => v.trim())
  return { lat: Number(latStr), lon: Number(lonStr) }
}

function parseDepthKm(raw: string) {
  const match = raw.match(/([\d.]+)/)
  return match ? Number(match[1]) : null
}

function toMarker(node: Element, index: number, category: string, titlePrefix: string, sourceKind: string): HazardMarker {
  const coords = parseCoordinates(text(node, 'coordinates'))
  const wilayah = text(node, 'Wilayah')
  const magnitude = text(node, 'Magnitude')
  const felt = text(node, 'Dirasakan')
  const tsunami = text(node, 'Potensi')
  const depth = text(node, 'Kedalaman')
  const shakemap = text(node, 'Shakemap')
  const summaryBits = [`M${magnitude}`, wilayah]
  if (felt) summaryBits.push(`Dirasakan: ${felt}`)
  if (tsunami) summaryBits.push(tsunami)
  return {
    id: `${sourceKind}-${index}`,
    title: `${titlePrefix} M${magnitude} — ${wilayah}`,
    category,
    categoryId: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    date: text(node, 'DateTime'),
    lat: coords.lat,
    lon: coords.lon,
    active: true,
    sourceUrl: shakemap ? `https://static.bmkg.go.id/${shakemap}` : undefined,
    description: summaryBits.join(' • '),
    meta: {
      depthKm: parseDepthKm(depth),
      felt,
      tsunami,
      localTime: `${text(node, 'Tanggal')} ${text(node, 'Jam')}`,
      shakemap,
    },
  } as HazardMarker & { description?: string; meta?: Record<string, unknown> }
}

function parseXml(xml: string) {
  const parser = new DOMParser()
  return parser.parseFromString(xml, 'application/xml')
}

export function getBmkgEarthquakeMarkers(): HazardMarker[] {
  const docs = [
    { xml: bmkgAutogempaXml, titlePrefix: 'BMKG Autoquake', sourceKind: 'bmkg-auto' },
    { xml: bmkgGempaterkiniXml, titlePrefix: 'BMKG Quake', sourceKind: 'bmkg-recent' },
  ]
  return docs.flatMap(({ xml, titlePrefix, sourceKind }) => {
    const doc = parseXml(xml)
    return Array.from(doc.querySelectorAll('gempa')).map((node, index) =>
      toMarker(node, index, 'Earthquakes', titlePrefix, sourceKind),
    )
  }).sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

export function getBmkgFeltMarkers(): HazardMarker[] {
  const doc = parseXml(bmkgGempadirasakanXml)
  return Array.from(doc.querySelectorAll('gempa'))
    .map((node, index) => toMarker(node, index, 'Felt Earthquakes', 'BMKG Felt Quake', 'bmkg-felt'))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
}
