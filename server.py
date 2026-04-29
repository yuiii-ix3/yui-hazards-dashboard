#!/usr/bin/env python3
import json
import mimetypes
import subprocess
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path('/home/azhar/github-projects/yui-hazards-dashboard')
DIST = ROOT / 'dist'
PUBLIC = ROOT / 'public'
LOCATIONS_PATH = PUBLIC / 'locations.json'
MAX_ITEMS = 10
DEFAULT_CITY = '31.71'
DEFAULT_ADM4 = '31.71.01.1001'


def run_curl_json(url: str):
    result = subprocess.run(
        ['bash', '-lc', f"curl -sS -L --max-time 25 '{url}'"],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def load_locations():
    return json.loads(LOCATIONS_PATH.read_text(encoding='utf-8'))


def get_city(city_code: str):
    locations = load_locations()
    for location in locations:
        if location['code'] == city_code:
            return location
    return next((item for item in locations if item['code'] == DEFAULT_CITY), locations[0] if locations else None)


def get_village(adm4: str, city_code: str):
    city = get_city(city_code)
    if not city:
        return None, None, None
    for district in city['districts']:
        for village in district['villages']:
            if village['code'] == adm4:
                return city, district, village
    fallback_district = next((item for item in city['districts'] if item['code'] == city['defaultDistrictCode']), city['districts'][0] if city['districts'] else None)
    fallback_village = None
    if fallback_district:
        fallback_village = next((item for item in fallback_district['villages'] if item['code'] == city['defaultVillageCode']), fallback_district['villages'][0] if fallback_district['villages'] else None)
    return city, fallback_district, fallback_village


def weather_code_desc_openmeteo(code):
    mapping = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
        61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm with hail'
    }
    return mapping.get(code, f'Weather code {code}')


def build_bmkg(city_code: str, adm4: str):
    city, district, village = get_village(adm4, city_code)
    if not city or not district or not village:
        raise ValueError('Selected location could not be resolved')
    data = run_curl_json(f"https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={village['code']}")
    lokasi = data['lokasi']
    slots = []
    for bucket in data.get('data', []):
        for group in bucket.get('cuaca', []):
            slots.extend(group)
    items = []
    for i, slot in enumerate(slots[:MAX_ITEMS]):
        items.append({
            'id': f"bmkg-forecast-{village['code']}-{i}",
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
                'area': f"{lokasi.get('desa')}, {lokasi.get('kecamatan')}, {lokasi.get('kotkab')}",
                'selectedCity': city['name'],
                'selectedProvince': city['province'],
                'selectedDistrict': district['name'],
                'selectedVillage': village['name'],
                'selectedVillageType': village['type'],
                'selectedAdm4': village['code'],
                'selectedAdm4Name': village['name'],
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
                'note': f"Live BMKG forecast for {village['name']} ({village['type']}), {district['name']}, {city['name']}.",
            },
        })
    return items


def build_openmeteo(city_code: str, adm4: str):
    city, district, village = get_village(adm4, city_code)
    if not city:
        raise ValueError('Selected city could not be resolved')
    url = (
        'https://api.open-meteo.com/v1/forecast'
        f"?latitude={city['lat']}&longitude={city['lon']}"
        '&hourly=temperature_2m,relative_humidity_2m,precipitation,cloud_cover,weather_code,wind_speed_10m'
        '&timezone=Asia%2FJakarta&forecast_days=3'
    )
    data = run_curl_json(url)
    hourly = data['hourly']
    items = []
    area_label = f"{village['name']}, {district['name']}, {city['name']}" if district and village else f"{city['name']}, {city['province']}"
    for i, iso in enumerate(hourly['time'][:MAX_ITEMS]):
        code = hourly['weather_code'][i]
        temp = hourly['temperature_2m'][i]
        precip = hourly['precipitation'][i]
        humidity = hourly['relative_humidity_2m'][i]
        cloud = hourly['cloud_cover'][i]
        wind = hourly['wind_speed_10m'][i]
        desc = weather_code_desc_openmeteo(code)
        items.append({
            'id': f"openmeteo-forecast-{city['code']}-{village['code'] if village else DEFAULT_ADM4}-{i}",
            'title': f'Open-Meteo Forecast — {desc}',
            'category': 'Weather Forecasts',
            'categoryId': 'weather-forecasts',
            'date': datetime.fromisoformat(iso).astimezone().isoformat() if 'T' in iso else iso,
            'lat': city['lat'],
            'lon': city['lon'],
            'active': True,
            'description': f'{desc} • {temp}°C • rain {precip} mm • humidity {humidity}%',
            'meta': {
                'sourceKind': 'openmeteo-forecast-live',
                'provider': 'Open-Meteo',
                'area': area_label,
                'selectedCity': city['name'],
                'selectedProvince': city['province'],
                'selectedDistrict': district['name'] if district else None,
                'selectedVillage': village['name'] if village else None,
                'selectedVillageType': village['type'] if village else None,
                'selectedAdm4': village['code'] if village else None,
                'localTime': iso,
                'forecastTime': iso,
                'temperatureC': temp,
                'humidity': humidity,
                'precipitationMm': precip,
                'cloudCover': cloud,
                'windSpeed': wind,
                'condition': desc,
                'weatherCode': code,
                'note': f"Live Open-Meteo forecast using {city['name']} city centroid for selected {village['type'].lower() if village else 'location'}.",
            },
        })
    return items


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def _serve_file(self, path: Path):
        if path.is_dir():
            path = path / 'index.html'
        if not path.exists():
            path = DIST / 'index.html'
        data = path.read_bytes()
        mime, _ = mimetypes.guess_type(str(path))
        self.send_response(200)
        self.send_header('Content-Type', mime or 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/locations':
            return self._send_json(load_locations())
        if parsed.path == '/api/forecast':
            query = parse_qs(parsed.query)
            source = query.get('source', ['bmkg'])[0]
            city_code = query.get('cityCode', [DEFAULT_CITY])[0]
            adm4 = query.get('adm4', [DEFAULT_ADM4])[0]
            try:
                payload = build_bmkg(city_code, adm4) if source == 'bmkg' else build_openmeteo(city_code, adm4)
                return self._send_json(payload)
            except Exception as exc:
                return self._send_json({'error': str(exc)}, status=500)
        target = parsed.path.lstrip('/') or 'index.html'
        self._serve_file(DIST / target)


if __name__ == '__main__':
    HTTPServer(('0.0.0.0', 3016), Handler).serve_forever()
