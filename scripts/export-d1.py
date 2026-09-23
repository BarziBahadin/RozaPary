"""Read-only local D1 export. Usage: python3 scripts/export-d1.py DB.sqlite backup.private.json"""
import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.parse import quote

if len(sys.argv) != 3:
    raise SystemExit('Usage: python3 scripts/export-d1.py DB.sqlite backup.private.json')
source = Path(sys.argv[1]).resolve()
target = Path(sys.argv[2])
if not target.name.endswith('.private.json'):
    raise SystemExit('Use a .private.json destination; these files are ignored by Git.')
connection = sqlite3.connect('file:' + quote(str(source)) + '?mode=ro', uri=True)
connection.row_factory = sqlite3.Row
try:
    result = {table: [dict(row) for row in connection.execute('SELECT * FROM ' + table)] for table in ('events', 'responses', 'opens')}
    for event in result['events']:
        event['data'] = json.loads(event['data'])
    # Exclusive creation avoids accidentally replacing an existing backup.
    with os.fdopen(os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
    print('Private export created. Keep it out of source control.')
finally:
    connection.close()
