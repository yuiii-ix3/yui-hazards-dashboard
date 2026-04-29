#!/usr/bin/env python3
import json
import subprocess
from datetime import datetime
from pathlib import Path

OUT_BMKG = Path('/home/azhar/github-projects/yui-hazards-dashboard/public/bmkg-forecast.json')
OUT_OPENMETEO = Path('/home/azhar/github-projects/yui-hazards-dashboard/public/openmeteo-forecast.json')
BMKG_URL = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001'
OPENMETEO_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-6.1647214778&longitude=106.8453837867&hourly=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code,wind_speed_10m&timezone=Asia%2FJakarta&forecast_days=3'
MAX_ITEMS = 10


def fetch_json(url):
    result = subprocess.run(
        ['bash', '-lc', f"curl -sS -L --max-time 25 '{url}'"],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def weather_code_desc_openmeteo(code):
    mapping = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
        61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail'
    }
    return mapping.get(code, f'Weather code {code}')


def build_bmkg():
    data = fetch_json(BMKG_URL)
    lokasi = data['lokasi']
    slots = []
    for bucket in data.get('data', []):
        for group in bucket.get('cuaca', []):
            slots.extend(group)
    slots = slots[:MAX_ITEMS]
    items = []
    for i, slot in enumerate(slots):
        items.append({
            'id': f'bmkg-forecast-{i}',
            'title': f"BMKG Forecast — {slot.get('weather_desc_en') or slot.get('weather_desc')}",
            'category': 'Weather Forecasts',
            'categoryId': 'weather-forecasts',
            'date': slot.get('datetime') or slot.get('utc_datetime', '').replace(' ', 'T') + 'Z',
            'lat': lokasi['lat'],
            'lon': lokasi['lon'],
            'active': True,
            'sourceUrl': slot.get('image'),
            'description': f"{slot.get('weather_desc_en') or slot.get('weather_desc')} • {slot.get('t')}°C • rain {slot.get('tp')} mm • humidity {slot.get('hu')}%",
            'meta': {
                'sourceKind': 'bmkg-forecast-live',
                'provider': 'BMKG',
                'area': f"{lokasi['desa']}, {lokasi['kecamatan']}, {lokasi['kotkab']}",
                'localTime': slot.get('local_datetime'),
                'forecastTime': slot.get('local_datetime'),
                'temperatureC': slot.get('t'),
                'humidity': slot.get('hu'),
                'precipitationMm': slot.get('tp'),
                'cloudCover': slot.get('tcc'),
                'windSpeed': slot.get('ws'),
                'windDirection': slot.get('wd'),
                'visibility': slot.get('vs_text'),
                'condition': slot.get('weather_desc_en') or slot.get('weather_desc'),
                'note': 'Live BMKG forecast for Kemayoran (Jakarta) using adm4 sample path.',
            },
        })
    OUT_BMKG.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {len(items)} BMKG forecast entries to {OUT_BMKG}')


def build_openmeteo():
    data = fetch_json(OPENMETEO_URL)
    hourly = data['hourly']
    items = []
    for i, iso in enumerate(hourly['time'][:MAX_ITEMS]):
        code = hourly['weather_code'][i]
        temp = hourly['temperature_2m'][i]
        precip = hourly['precipitation'][i]
        humidity = hourly['relative_humidity_2m'][i]
        cloud = hourly['cloud_cover'][i]
        wind = hourly['wind_speed_10m'][i]
        desc = weather_code_desc_openmeteo(code)
        items.append({
            'id': f'openmeteo-forecast-{i}',
            'title': f'Open-Meteo Forecast — {desc}',
            'category': 'Weather Forecasts',
            'categoryId': 'weather-forecasts',
            'date': datetime.fromisoformat(iso).astimezone().isoformat() if 'T' in iso else iso,
            'lat': data['latitude'],
            'lon': data['longitude'],
            'active': True,
            'description': f'{desc} • {temp}°C • rain {precip} mm • humidity {humidity}% ',
            'meta': {
                'sourceKind': 'openmeteo-forecast-live',
                'provider': 'Open-Meteo',
                'area': 'Kemayoran, Jakarta',
                'localTime': iso,
                'forecastTime': iso,
                'temperatureC': temp,
                'humidity': humidity,
                'precipitationMm': precip,
                'cloudCover': cloud,
                'windSpeed': wind,
                'condition': desc,
                'weatherCode': code,
                'note': 'Live Open-Meteo forecast for Kemayoran/Jakarta reference point.',
            },
        })
    OUT_OPENMETEO.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {len(items)} Open-Meteo forecast entries to {OUT_OPENMETEO}')


build_bmkg()
build_openmeteo()
