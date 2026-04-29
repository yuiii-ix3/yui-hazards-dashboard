# Yui Hazards Dashboard

A local-first hazard dashboard prototype for Yui.

Current MVP:
- React + Vite + TypeScript
- Leaflet map
- NASA EONET event feed
- BMKG earthquake / felt earthquake sample-backed source modes
- BMKG live weather alerts with CAP detail enrichment and polygon-aware placement
- BMKG forecast cache for Kemayoran/Jakarta (`adm4=31.71.03.1001`)
- Open-Meteo forecast cache for Kemayoran/Jakarta
- region filter (Global / Southeast Asia)
- recent time window filter (7 / 30 / 90 days)
- stable Tailnet-served static build on port `3016`

## Build / serve

Build-time cache generators now produce:
- `public/bmkg-weather.json`
- `public/bmkg-forecast.json`
- `public/openmeteo-forecast.json`

## Current source status

### NASA EONET
Working.

### BMKG earthquakes
Wired with local sample-backed parsing from supplied XML examples.

### BMKG weather alerts
Working via live RSS + CAP detail enrichment at build/runtime cache stage.

### BMKG forecast
Working as a build-time cached feed for Kemayoran/Jakarta using:
- `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001`

Reference parsing docs:
- `https://github.com/infoBMKG/data-cuaca`
- `https://github.com/SlavyanDesu/bmkg-wrapper`

### Open-Meteo forecast
Working as a build-time cached comparison forecast for the same point.

## Notes

This project is currently a prototype / exploration room, not yet a final serious regional monitoring system.
