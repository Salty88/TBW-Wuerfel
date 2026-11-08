#!/usr/bin/env python3
"""Package the static app as one HTML file; no third-party dependencies."""
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='Destination HTML file')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + (root / 'styles.css').read_text(encoding='utf-8') + '\n</style>')
for name in ('data.js', 'sync-model.js', 'github-sync.js', 'app.js'):
    html = html.replace(f'<script src="{name}" defer></script>', '')
scripts = '\n'.join('<script>\n' + (root / name).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>' for name in ('data.js', 'sync-model.js', 'github-sync.js', 'app.js'))
html = html.replace('</body>', scripts + '\n</body>')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(html, encoding='utf-8')
print(args.output.resolve())
