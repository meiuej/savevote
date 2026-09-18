#!/usr/bin/env python3
"""Copy public static assets into a clean deployment directory."""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
if OUTPUT.exists():
    shutil.rmtree(OUTPUT)
OUTPUT.mkdir()
for path in ROOT.iterdir():
    if path.is_file() and (path.suffix in ('.html', '.css', '.js', '.webp', '.otf') or path.name == 'CNAME'):
        shutil.copy2(path, OUTPUT / path.name)
shutil.copytree(ROOT / 'data', OUTPUT / 'data')
(OUTPUT / '.nojekyll').touch()
print(f'Built static site in {OUTPUT}')
