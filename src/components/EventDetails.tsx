import type { HazardMarker } from '../types/eonet'
import { formatEventTime } from '../lib/format'

function valueOrFallback(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

export function EventDetails({ event }: { event: HazardMarker | null }) {
  const meta = event?.meta ?? {}
  const sourceUrl = event?.sourceUrl

  return (
    <aside className="details-card">
      <div className="details-header">
        <h2>Selected event</h2>
        <p>Deeper context for the currently highlighted item.</p>
      </div>

      {!event ? (
        <div className="empty-state">Pick an event to inspect its details.</div>
      ) : (
        <div className="details-body">
          <div className="detail-block">
            <span className="detail-label">Title</span>
            <strong>{event.title}</strong>
          </div>

          <div className="detail-grid">
            <div className="detail-block">
              <span className="detail-label">Category</span>
              <span>{event.category}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Time (UTC/browser-local display)</span>
              <span>{formatEventTime(event.date)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Local time</span>
              <span>{valueOrFallback(meta.localTime)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Coordinates</span>
              <span>{event.lat.toFixed(2)}, {event.lon.toFixed(2)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Depth</span>
              <span>{typeof meta.depthKm === 'number' ? `${meta.depthKm} km` : '—'}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Felt / Dirasakan</span>
              <span>{valueOrFallback(meta.felt)}</span>
            </div>
            <div className="detail-block detail-block-wide">
              <span className="detail-label">Potensi / tsunami</span>
              <span>{valueOrFallback(meta.tsunami)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Urgency</span>
              <span>{valueOrFallback(meta.urgency)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Severity</span>
              <span>{valueOrFallback(meta.severity)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Certainty</span>
              <span>{valueOrFallback(meta.certainty)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Area</span>
              <span>{valueOrFallback(meta.area)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">BMKG category</span>
              <span>{valueOrFallback(meta.bmkgCategory)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Event</span>
              <span>{valueOrFallback(meta.event)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Effective</span>
              <span>{valueOrFallback(meta.effective)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Expires</span>
              <span>{valueOrFallback(meta.expires)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Sender</span>
              <span>{valueOrFallback(meta.sender)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Contact</span>
              <span>{valueOrFallback(meta.contact)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Source kind</span>
              <span>{valueOrFallback(meta.sourceKind)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Provider</span>
              <span>{valueOrFallback(meta.provider)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Forecast time</span>
              <span>{valueOrFallback(meta.forecastTime)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Temperature</span>
              <span>{typeof meta.temperatureC === 'number' ? `${meta.temperatureC}°C` : valueOrFallback(meta.temperatureC)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Humidity</span>
              <span>{typeof meta.humidity === 'number' ? `${meta.humidity}%` : valueOrFallback(meta.humidity)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Precipitation</span>
              <span>{typeof meta.precipitationMm === 'number' ? `${meta.precipitationMm} mm` : valueOrFallback(meta.precipitationMm)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Cloud cover</span>
              <span>{typeof meta.cloudCover === 'number' ? `${meta.cloudCover}%` : valueOrFallback(meta.cloudCover)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Wind</span>
              <span>{typeof meta.windSpeed === 'number' ? `${meta.windSpeed} km/h ${valueOrFallback(meta.windDirection, '')}`.trim() : valueOrFallback(meta.windSpeed)}</span>
            </div>
            <div className="detail-block">
              <span className="detail-label">Condition</span>
              <span>{valueOrFallback(meta.condition)}</span>
            </div>
          </div>

          {event.description ? (
            <div className="detail-block detail-block-wide">
              <span className="detail-label">Summary</span>
              <span>{event.description}</span>
            </div>
          ) : null}

          {meta.note ? (
            <div className="detail-block detail-block-wide">
              <span className="detail-label">Note</span>
              <span>{valueOrFallback(meta.note)}</span>
            </div>
          ) : null}

          {sourceUrl ? (
            <div className="detail-block detail-block-wide">
              <span className="detail-label">Shakemap / source</span>
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                Open shakemap ↗
              </a>
              {String(sourceUrl).includes('static.bmkg.go.id/') ? (
                <img className="shakemap-preview" src={sourceUrl} alt={`Shakemap for ${event.title}`} />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </aside>
  )
}
