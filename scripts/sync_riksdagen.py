#!/usr/bin/env python3
"""Import *recorded* member votes from Sveriges riksdags public CSV ZIP datasets.

Never converts a vote into a policy stance. A vote is the answer to one specific
proposal point; individual member votes are grouped by party solely for display.

Run: python3 scripts/sync_riksdagen.py
Optional offline test: python3 scripts/sync_riksdagen.py --fixture tests/fixtures/votes.csv
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.parse
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from itertools import chain
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data' / 'riksdag.json'
DATASET_BASE = 'https://data.riksdagen.se/dataset/votering/'
SESSIONS = ('2026/27', '2025/26')
PARTIES = {'S', 'M', 'SD', 'V', 'C', 'KD', 'MP', 'L'}
VOTES = {'Ja', 'Nej', 'Avstår', 'Frånvarande'}
MAX_PER_SESSION = 125


def source_url(session: str, name: str, point: str) -> str:
    params = urllib.parse.urlencode({'rm': session, 'bet': name, 'punkt': point, 'utformat': 'HTML'})
    return 'https://data.riksdagen.se/voteringlista/?' + params


def clean(row: dict) -> dict:
    return {(k or '').strip().lstrip('\ufeff').lower(): (v or '').strip() for k, v in row.items() if k}


def csv_rows(data: bytes, *, session: str = '') -> list[dict]:
    text = data.decode('utf-8-sig', errors='replace')
    if session:
        rows = csv.reader(io.StringIO(text, newline=''), strict=True)
        first = next(rows, [])
        if first and first[0] == session:
            # The official CSV ZIP exports have 14 columns and omit the header.
            records = []
            for line, row in enumerate(chain([first], rows), start=1):
                if not row:
                    continue
                if len(row) != 14 or row[0] != session or row[8] not in VOTES:
                    raise ValueError(f'Unexpected Riksdagen CSV row {line} for {session}')
                records.append({
                    'beteckning': row[1].strip(),
                    'votering_id': row[2].strip(),
                    'punkt': row[3].strip(),
                    'parti': row[6].strip(),
                    'rost': row[8],
                    'datum': row[13].strip(),
                })
            return records
    # Supports semicolon-, tab- and comma-separated files, including quoted fields.
    sample = text[:8192]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=',;\t')
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        records = [clean(r) for r in reader]
    except csv.Error:
        records = [clean(r) for r in csv.DictReader(io.StringIO(text), delimiter=';')]
    if records and not {'parti','rost'}.issubset(records[0]):
        raise ValueError('Unknown Riksdagen CSV headers: ' + ', '.join(sorted(records[0])))
    return records


def fetch_session(session: str) -> list[dict]:
    suffix = session.replace('/', '')
    url = f'{DATASET_BASE}votering-{suffix}.csv.zip'
    print('Downloading', url)
    req = urllib.request.Request(url, headers={'User-Agent':'Politikdata/0.1 (source citation; public data)'})
    with urllib.request.urlopen(req, timeout=55) as response:
        data = response.read(45_000_000)
    if len(data) >= 45_000_000:
        raise ValueError('ZIP download exceeded configured size limit')
    if not zipfile.is_zipfile(io.BytesIO(data)):
        raise ValueError('Invalid ZIP from official dataset: ' + url)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = [m for m in archive.namelist() if m.lower().endswith('.csv') and not m.startswith('__MACOSX/')]
        if not members:
            return []
        result = []
        for member in members:
            raw = archive.read(member)
            if raw.strip():
                result.extend(csv_rows(raw, session=session))
        return result


def aggregate(rows: list[dict], session: str) -> list[dict]:
    # Treat parties as labels from the historical session rather than present-day positions.
    grouped = defaultdict(lambda: {'party_votes':defaultdict(Counter), 'date':'', 'document':'', 'point':'', 'title':''})
    for row in rows:
        party = (row.get('parti') or '').upper()
        ballot = (row.get('rost') or '').strip()
        if party not in PARTIES or ballot not in VOTES:
            continue
        vote_id = row.get('votering_id') or ''
        doc = row.get('beteckning') or ''
        point = row.get('punkt') or ''
        if not vote_id and not (doc and point):
            continue
        key = vote_id or f'{session}|{doc}|{point}|{row.get("datum","")}'
        event = grouped[key]
        event['party_votes'][party][ballot] += 1
        event['date'] = (row.get('datum') or event['date']).split(' ')[0][:10]
        event['document'] = doc or event['document']
        event['point'] = point or event['point']
        # 'avser' normally indicates which proposal is voted on; never use that as
        # a claim that the member supports/opposes the broad underlying policy.
        event['title'] = f'Betänkande {doc or "utan beteckning"} · förslagspunkt {point or "okänd"}'
    output=[]
    for uid,event in grouped.items():
        votes = {p:dict(c) for p,c in sorted(event['party_votes'].items())}
        if not votes:
            continue
        event['party_votes'] = votes
        event['id'] = uid
        event['session'] = session
        event['source_url'] = source_url(session,event['document'],event['point'])
        output.append(event)
    output.sort(key=lambda r:(r['date'],r['document'],str(r['point'])),reverse=True)
    return output[:MAX_PER_SESSION]


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--fixture',type=Path,help='Read a local CSV for offline validation, instead of downloading')
    args=parser.parse_args()
    if args.fixture:
        votes=aggregate(csv_rows(args.fixture.read_bytes()), '2026/27')
        if not votes:
            raise ValueError('Fixture contains no recognizable votes')
        print(json.dumps(votes,ensure_ascii=False,indent=2))
        return
    aggregated=[]
    for session in SESSIONS:
        rows=fetch_session(session)
        subset=aggregate(rows,session)
        print(session, ':',len(rows),'member records →',len(subset),'vote events')
        aggregated.extend(subset)
    aggregated.sort(key=lambda v:(v['date'],v['session']),reverse=True)
    if not aggregated:
        raise ValueError('No actual votes were found; preserving existing data instead of publishing an empty feed')
    result={
        'updated':datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
        'status':'synced',
        'session':', '.join(SESSIONS),
        'source':'https://data.riksdagen.se/dataset/katalog/dataset-votering.html',
        'note':'Endast registrerade ledamotsröster. Urvalet begränsas till de senaste 125 voteringarna per riksmöte.',
        'votes':aggregated,
    }
    tmp=OUTPUT.with_suffix('.tmp')
    tmp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    tmp.replace(OUTPUT)
    print('Wrote',OUTPUT,'with',len(aggregated),'real voting events')

if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('Import failed safely: '+str(exc),file=sys.stderr)
        sys.exit(1)
