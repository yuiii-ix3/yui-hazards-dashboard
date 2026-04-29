type Props = {
  total: number
  visible: number
  lastUpdated: string | null
  lastUpdatedLabel: string
  loading: boolean
  error: string | null
  sourceLabel: string
  locationLabel?: string | null
}

export function StatusBar({ total, visible, lastUpdated, lastUpdatedLabel, loading, error, sourceLabel, locationLabel }: Props) {
  return (
    <div className="status-bar">
      <div>
        <strong>{visible}</strong> visible / <strong>{total}</strong> total events
      </div>
      <div>{loading ? 'Refreshing…' : `Updated ${lastUpdated ? lastUpdatedLabel : 'not yet'}`}</div>
      <div className={error ? 'status-error' : 'status-ok'}>{error ? error : `${sourceLabel}${locationLabel ? ` · ${locationLabel}` : ''} looks okay`}</div>
    </div>
  )
}
