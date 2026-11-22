"""Computes the EcoIndex of the site with the official package (ecoindex_compute, cnumr).

Reads the measurement of scripts/measure-ecoindex.mjs and writes dist/ecoindex.json for the
desktop widget: grade, score and the three measured values. The greenhouse gas and water
estimates are left out on purpose.

    python scripts/ecoindex.py measurement.json dist/ecoindex.json
"""
import asyncio
import json
import sys
from datetime import datetime, timezone

from ecoindex.compute import compute_ecoindex


async def main(measurement_path: str, output_path: str) -> None:
    with open(measurement_path, encoding="utf-8") as measurement_file:
        measurement = json.load(measurement_file)
    result = await compute_ecoindex(nodes=measurement["nodes"], size=measurement["size"], requests=measurement["requests"])
    grade = result.grade.value if hasattr(result.grade, "value") else str(result.grade)
    widget = {
        "grade": grade,
        "score": result.score,
        "nodes": measurement["nodes"],
        "requests": measurement["requests"],
        "sizeKb": round(measurement["size"], 1),
        "measuredAt": datetime.now(timezone.utc).isoformat(),
    }
    with open(output_path, "w", encoding="utf-8") as output_file:
        json.dump(widget, output_file)
        output_file.write("\n")
    print(f"EcoIndex {grade} · {result.score}/100 ({measurement['nodes']} éléments, {measurement['requests']} requêtes, {widget['sizeKb']} Ko)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage : python scripts/ecoindex.py <mesure.json> <sortie.json>")
    asyncio.run(main(sys.argv[1], sys.argv[2]))
