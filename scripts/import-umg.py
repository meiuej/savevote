"""Export only the Кандидаты sheet: python3 scripts/import-umg.py source.xlsx."""
import hashlib
import json
from pathlib import Path
import sys

import openpyxl


def convert(source):
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=False)
    try:
        rows = workbook["Кандидаты"].iter_rows()
        headers = [cell.value for cell in next(rows)]
        expected = ["Регион", "Округ №", "Избирательный округ", "Кандидат", "Партия"]
        if headers != expected:
            raise ValueError(f"Unexpected headers: {headers}")
        records = {}
        for row_number, cells in enumerate(rows, 2):
            values = [cell.value for cell in cells]
            if all(value is None for value in values):
                continue
            if any(cell.data_type == "f" for cell in cells):
                raise ValueError(f"Formula in source row {row_number}")
            region, number, district, candidate, party = values
            if type(number) is not int or number <= 0:
                raise ValueError(f"Invalid district number in row {row_number}")
            if str(number) in records:
                raise ValueError(f"Duplicate district number: {number}")
            if any(not isinstance(v, str) or not v.strip() for v in (region, district, candidate)):
                raise ValueError(f"Missing required text in row {row_number}")
            if party is not None and not isinstance(party, str):
                raise ValueError(f"Invalid party in row {row_number}")
            records[str(number)] = dict(region=region, district_number=number,
                                        district_name=district, candidate=candidate, party=party)
        if not records:
            raise ValueError("No district records")
        return dict(sorted(records.items(), key=lambda item: int(item[0])))
    finally:
        workbook.close()


if __name__ == "__main__":
    source = Path(sys.argv[1])
    records = convert(source)
    destination = Path(__file__).resolve().parent.parent / "data"
    destination.mkdir(exist_ok=True)
    (destination / "umg-2026.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (destination / "umg-2026-source.json").write_text(json.dumps({
        "file": source.name, "sheet": "Кандидаты", "records": len(records),
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(records)} districts")
