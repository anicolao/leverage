from __future__ import annotations

import json
import sys
from pathlib import Path

from leverage_backtester.data import RawSymbolData, build_synthetic_xaw_proxy


def main() -> None:
    if len(sys.argv) not in {2, 3}:
        raise SystemExit(
            "usage: python_synthetic_xaw.py <market-history.json> "
            "[distribution-tax-drag]"
        )

    payload = json.loads(Path(sys.argv[1]).read_text())
    distribution_tax_drag = float(sys.argv[2]) if len(sys.argv) == 3 else 0.0
    symbols = {
        symbol: RawSymbolData.from_rows(rows)
        for symbol, rows in payload["symbols"].items()
        if symbol in {"SPY", "EFA", "EEM"}
    }
    usdcad = RawSymbolData.from_rows(payload["symbols"]["CAD=X"]).close
    synthetic = build_synthetic_xaw_proxy(
        symbols,
        usdcad,
        distribution_tax_drag=distribution_tax_drag,
    )

    rows = [
        {
            "date": index.strftime("%Y-%m-%d"),
            "close": row.close,
            "dividends": row.dividends,
        }
        for index, row in synthetic.iterrows()
    ]
    json.dump(rows, sys.stdout, separators=(",", ":"))


if __name__ == "__main__":
    main()
