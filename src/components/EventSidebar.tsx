import type { HazardMarker } from '../types/eonet'
import { formatEventTime } from '../lib/format'
import { getCategoryColor } from '../lib/categories'

type Props = {
  events: HazardMarker[]
  selectedId: string | null
  onSelect: (event: HazardMarker) => void
}

export function EventSidebar({ events, selectedId, onSelect }: Props) {
  return (
    <aside className="sidebar-card">
      <div className="sidebar-header">
        <h2>Recent Events</h2>
        <p>Latest items from the currently selected source.</p>
      </div>
      <div className="event-list">
        {events.length === 0 ? (
          <div className="empty-state">No events match the current filter.</div>
        ) : (
          events.slice(0, 80).map((event) => (
            <button
              key={event.id}
              className={`event-card ${selectedId === event.id ? 'selected' : ''}`}
              onClick={() => onSelect(event)}
              type="button"
            >
              <span className="event-dot" style={{ backgroundColor: getCategoryColor(event.category) }} />
              <div className="event-copy">
                <strong>{event.title}</strong>
                <span>{event.category}</span>
                <small>{formatEventTime(event.date)}</small>
                {event.description ? <small>{event.description}</small> : null}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
