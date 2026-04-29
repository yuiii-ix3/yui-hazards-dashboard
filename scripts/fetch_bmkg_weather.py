#!/usr/bin/env python3
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

RSS_URL = 'https://www.bmkg.go.id/alerts/nowcast/id'
OUTPUT = Path('/home/azhar/github-projects/yui-hazards-dashboard/public/bmkg-weather.json')
MAX_ITEMS = 8

PROVINCE_CENTERS = [
    (re.compile(r'sumatera barat', re.I), (-0.95, 100.35), 'Sumatera Barat'),
    (re.compile(r'kalimantan utara', re.I), (3.0, 116.6), 'Kalimantan Utara'),
    (re.compile(r'jawa barat', re.I), (-6.9, 107.6), 'Jawa Barat'),
    (re.compile(r'nusa tenggara timur|ntt', re.I), (-10.17, 123.58), 'Nusa Tenggara Timur'),
    (re.compile(r'banten', re.I), (-6.12, 106.15), 'Banten'),
    (re.compile(r'jawa tengah', re.I), (-7.15, 110.14), 'Jawa Tengah'),
    (re.compile(r'papua', re.I), (-2.53, 140.72), 'Papua'),
]

SAMPLE = [{
    'id': 'bmkg-weather-jabar',
    'title': 'BMKG Weather Alert — Jawa Barat (sample fallback)',
    'category': 'Weather Alerts',
    'categoryId': 'weather-alerts',
    'date': '2026-04-29T02:30:00+00:00',
    'lat': -6.9,
    'lon': 107.6,
    'active': True,
    'description': 'Sample CAP-backed provincial alert slot for severe weather / nowcast integration.',
    'meta': {
        'localTime': '29 Apr 2026 sample',
        'urgency': 'Immediate',
        'severity': 'Moderate',
        'certainty': 'Likely',
        'area': 'Provinsi Jawa Barat',
        'language': 'id',
        'sourceKind': 'bmkg-cap-sample',
        'note': 'Live BMKG CAP fetch fell back to sample data.',
    },
}]


def clean(text):
    return re.sub(r'\s+', ' ', text or '').strip()


def fetch_text(url):
    result = subprocess.run(
        ['bash', '-lc', f"curl -sS -L --max-time 20 '{url}'"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def province_from_text(text):
    for pattern, (lat, lon), area in PROVINCE_CENTERS:
        if pattern.search(text):
            return lat, lon, area
    return -2.5, 118.0, 'Indonesia (province not mapped yet)'


def parse_polygon_centroid(raw):
    pts = []
    for pair in raw.split():
        if ',' not in pair:
            continue
        lat_s, lon_s = pair.split(',', 1)
        try:
            pts.append((float(lat_s), float(lon_s)))
        except ValueError:
            pass
    if not pts:
        return None
    lat = sum(p[0] for p in pts) / len(pts)
    lon = sum(p[1] for p in pts) / len(pts)
    return {'lat': lat, 'lon': lon, 'pointCount': len(pts)}


def local_name(tag):
    return tag.split('}', 1)[-1]


def child_text(parent, name):
    if parent is None:
        return ''
    for child in parent:
        if local_name(child.tag) == name:
            return clean(''.join(child.itertext()))
    return ''


def find_child(parent, name):
    if parent is None:
        return None
    for child in parent:
        if local_name(child.tag) == name:
            return child
    return None


try:
    rss_xml = fetch_text(RSS_URL)
    rss_root = ET.fromstring(rss_xml)
    channel = rss_root.find('channel')
    items = channel.findall('item')[:MAX_ITEMS] if channel is not None else []
    results = []
    for idx, item in enumerate(items):
        title = clean(item.findtext('title', 'BMKG Weather Alert'))
        description = clean(item.findtext('description', ''))
        link = clean(item.findtext('link', ''))
        pub_date = clean(item.findtext('pubDate', ''))
        category = clean(item.findtext('category', 'Met'))
        lat, lon, area = province_from_text(f'{title} {description}')
        try:
            iso_date = parsedate_to_datetime(pub_date).astimezone().isoformat()
        except Exception:
            iso_date = '2026-04-29T00:00:00+00:00'

        marker = {
            'id': f'bmkg-weather-live-{idx}',
            'title': title,
            'category': 'Weather Alerts',
            'categoryId': 'weather-alerts',
            'date': iso_date,
            'lat': lat,
            'lon': lon,
            'active': True,
            'sourceUrl': link or None,
            'description': description,
            'meta': {
                'localTime': pub_date or '—',
                'area': area,
                'language': 'id',
                'sourceKind': 'bmkg-rss-live',
                'note': 'Live RSS item from BMKG weather alerts feed.',
                'bmkgCategory': category,
            },
        }

        if link:
            try:
                cap_xml = fetch_text(link)
                cap_root = ET.fromstring(cap_xml)
                info = None
                for child in cap_root:
                    if local_name(child.tag) == 'info':
                        info = child
                        break
                area_node = find_child(info, 'area') if info is not None else None
                polygon = child_text(area_node, 'polygon') if area_node is not None else ''
                web = child_text(info, 'web')
                centroid = parse_polygon_centroid(polygon) if polygon else None
                if centroid:
                    marker['lat'] = centroid['lat']
                    marker['lon'] = centroid['lon']
                marker['title'] = child_text(info, 'headline') or marker['title']
                marker['description'] = child_text(info, 'description') or marker['description']
                if web:
                    marker['sourceUrl'] = web
                marker['meta'].update({
                    'urgency': child_text(info, 'urgency'),
                    'severity': child_text(info, 'severity'),
                    'certainty': child_text(info, 'certainty'),
                    'localTime': child_text(cap_root, 'sent') or marker['meta']['localTime'],
                    'effective': child_text(info, 'effective'),
                    'expires': child_text(info, 'expires'),
                    'event': child_text(info, 'event'),
                    'area': child_text(area_node, 'areaDesc') or marker['meta']['area'],
                    'polygon': polygon or None,
                    'polygonPointCount': centroid['pointCount'] if centroid else None,
                    'bmkgCategory': child_text(info, 'category') or marker['meta']['bmkgCategory'],
                    'contact': child_text(info, 'contact'),
                    'sender': child_text(info, 'senderName') or child_text(cap_root, 'sender'),
                    'sourceKind': 'bmkg-cap-live',
                    'note': 'Live RSS + CAP detail parsed from BMKG.',
                })
            except Exception:
                pass

        results.append(marker)

    if not results:
        results = SAMPLE
except Exception:
    results = SAMPLE

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'wrote {len(results)} weather alerts to {OUTPUT}')
