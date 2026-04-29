#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path

OUT = Path('/home/azhar/github-projects/yui-hazards-dashboard/public/locations.json')
LEVEL12_URL = 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah_level_1_2.sql'
WILAYAH_URL = 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql'


def fetch_text(url: str) -> str:
    result = subprocess.run(
        ['bash', '-lc', f"curl -sS -L --max-time 60 '{url}'"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def village_type_from_code(code: str) -> str:
    tail = code.split('.')[-1]
    prefix = tail[0]
    if prefix == '1':
        return 'Kelurahan'
    if prefix == '2':
        return 'Desa'
    if prefix == '3':
        return 'Desa Adat'
    return 'Wilayah'


level12 = fetch_text(LEVEL12_URL)
wilayah = fetch_text(WILAYAH_URL)

province_pattern = re.compile(r"\('(?P<code>\d{2})','(?P<name>[^']*)','(?P<capital>[^']*)',")
city_pattern = re.compile(r"\('(?P<code>\d{2}\.\d{2})','(?P<name>[^']*)','(?P<capital>[^']*)',\s*(?P<lat>-?\d+(?:\.\d+)?),\s*(?P<lng>-?\d+(?:\.\d+)?),")
district_pattern = re.compile(r"\('(?P<code>\d{2}\.\d{2}\.\d{2})','(?P<name>[^']*)'\)")
village_pattern = re.compile(r"\('(?P<code>\d{2}\.\d{2}\.\d{2}\.\d{4})','(?P<name>[^']*)'\)")

provinces = {match.group('code'): match.group('name') for match in province_pattern.finditer(level12)}

city_map: dict[str, dict] = {}
for match in city_pattern.finditer(level12):
    code = match.group('code')
    province_code = code.split('.')[0]
    city_map[code] = {
        'code': code,
        'name': match.group('name'),
        'capital': match.group('capital'),
        'province': provinces.get(province_code, province_code),
        'label': f"{match.group('name')} — {provinces.get(province_code, province_code)}",
        'lat': float(match.group('lat')),
        'lon': float(match.group('lng')),
        'districts': [],
    }

for match in district_pattern.finditer(wilayah):
    code = match.group('code')
    city_code = '.'.join(code.split('.')[:2])
    city = city_map.get(city_code)
    if not city:
        continue
    city['districts'].append({
        'code': code,
        'name': match.group('name'),
        'villages': [],
    })

for match in village_pattern.finditer(wilayah):
    code = match.group('code')
    district_code = '.'.join(code.split('.')[:3])
    city_code = '.'.join(code.split('.')[:2])
    city = city_map.get(city_code)
    if not city:
        continue
    district = next((item for item in city['districts'] if item['code'] == district_code), None)
    if not district:
        continue
    village_name = match.group('name')
    village_type = village_type_from_code(code)
    district['villages'].append({
        'code': code,
        'name': village_name,
        'type': village_type,
        'label': f"{village_name} ({village_type})",
    })

locations = []
for city in city_map.values():
    districts = []
    for district in sorted(city['districts'], key=lambda item: item['name']):
        villages = sorted(district['villages'], key=lambda item: item['name'])
        if not villages:
            continue
        districts.append({
            **district,
            'villages': villages,
            'defaultVillageCode': villages[0]['code'],
        })
    if not districts:
        continue
    first_village = districts[0]['villages'][0]
    locations.append({
        **city,
        'districts': districts,
        'defaultDistrictCode': districts[0]['code'],
        'defaultVillageCode': first_village['code'],
        'adm4': first_village['code'],
        'adm4Name': first_village['name'],
    })

locations.sort(key=lambda item: item['label'])
OUT.write_text(json.dumps(locations, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'wrote {len(locations)} hierarchical location entries to {OUT}')
