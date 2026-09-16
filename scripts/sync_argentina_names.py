#!/usr/bin/env python3
"""Genera el diccionario argentino que consume la interfaz web.

La fuente se consulta durante un despliegue/sincronización, no desde el navegador.
Así la pantalla sigue funcionando si la fuente externa está caída y no expone
la estructura de la fuente a cada visitante.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


DEFAULT_SOURCE = "https://www.coarecs.com.ar/argentina/index_csv_sc.php"


def fetch_source(url: str) -> str:
    request = Request(url, headers={"User-Agent": "avian-visitors/1.0"})
    with urlopen(request, timeout=30) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, errors="replace")


def parse_rows(document: str) -> dict[str, str]:
    """Acepta tanto CSV puro como la tabla HTML que entrega CoaRECS."""
    text = html.unescape(document).replace("\xa0", " ")
    rows: list[list[str]] = []

    table_rows = re.findall(r"<tr[^>]*>(.*?)</tr>", text, flags=re.I | re.S)
    code_blocks = re.findall(r"<code[^>]*>(.*?)</code>", text, flags=re.I | re.S)
    if code_blocks:
        csv_lines = []
        for block in code_blocks:
            block = re.sub(r"<br\s*/?>", "\n", block, flags=re.I)
            csv_lines.extend(re.sub(r"<[^>]+>", "", block).splitlines())
        rows = [list(row) for row in csv.reader(csv_lines, delimiter=";")]
    elif table_rows:
        for row in table_rows:
            cells = re.findall(r"<(?:td|th)[^>]*>(.*?)</(?:td|th)>", row, flags=re.I | re.S)
            values = [re.sub(r"<[^>]+>", "", cell).strip() for cell in cells]
            if values:
                rows.append(values)
    else:
        reader = csv.reader(text.splitlines(), delimiter=";")
        rows = [list(row) for row in reader]

    names: dict[str, str] = {}
    for row in rows:
        values = [re.sub(r"\s+", " ", value).strip() for value in row]
        if len(values) < 3:
            continue
        # El formato publicado es: orden/código; científico; castellano; inglés; familia.
        scientific = values[1]
        common = values[2]
        if (" " not in scientific or ";" in scientific or
                scientific.lower() in {"nombre científico", "nombre cientifico"}):
            continue
        if not common or common.lower() in {"nombre castellano", "nombre común", "nombre comun"}:
            continue
        names[scientific] = common
    return names


def load_overrides(path: Path | None) -> dict[str, str]:
    if not path or not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("El archivo de excepciones debe ser un objeto JSON")
    return {str(key).strip(): str(value).strip() for key, value in payload.items() if str(value).strip()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default=DEFAULT_SOURCE)
    parser.add_argument("--output", default="runtime/argentina-names.json")
    parser.add_argument("--overrides", default="config/names-overrides.json")
    args = parser.parse_args()

    try:
        names = parse_rows(fetch_source(args.source))
        if not names:
            raise ValueError("no se encontraron filas de especies en la fuente")
        names.update(load_overrides(Path(args.overrides)))
    except Exception as error:  # noqa: BLE001 - CLI debe dar un error legible
        print(f"No se pudo sincronizar la lista argentina: {error}", file=sys.stderr)
        return 1

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": {
            "name": "CoaRECS - Lista de Aves de Argentina",
            "url": args.source,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "count": len(names),
        },
        "names": dict(sorted(names.items(), key=lambda item: item[0].lower())),
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Especies sincronizadas: {len(names)} -> {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
