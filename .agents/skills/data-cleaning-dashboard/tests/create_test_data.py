"""Create deterministic dirty datasets for pipeline tests and manual acceptance runs."""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Sequence

import pandas as pd

LOGGER = logging.getLogger(__name__)


def build_dirty_frame() -> pd.DataFrame:
    """Return data containing each quality issue required by the skill contract."""
    columns = [
        " Customer ID ", " Name ", " order_date ", " amount ",
        " completion_percent ", " active ", " category ", " score ",
        " business_note ", " completely_empty ",
    ]
    rows = [
        ["001", " Alice ", "2024-01-01", "1,200.50", "10%", "TRUE", "Beijing", "10", "priority", ""],
        ["002", "Bob", "2024/01/02", "800", "25%", "yes", "beijing", "11", "", ""],
        ["003", " Carol", "2024年1月3日", "950.25", "50%", "No", "Shanghai", "999999", "N/A", ""],
        ["002", "Bob", "2024/01/02", "800", "25%", "yes", "beijing", "11", "", ""],
        ["004", "Dana ", "2024-01-04", "1,050", "75%", "0", "ShangHai", "12", "review", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["005", " Eva ", "2024/01/05", "1,100", "100%", "是", "Beijing", "13", "null", ""],
    ]
    return pd.DataFrame(rows, columns=columns)


def create_test_data(output_path: Path) -> Path:
    """Write the dirty CSV in UTF-8-SIG without mutating any other file."""
    output = output_path.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    build_dirty_frame().to_csv(output, index=False, encoding="utf-8-sig")
    LOGGER.info("Created dirty test data: %s", output)
    return output


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a dirty CSV test dataset")
    parser.add_argument(
        "--output", type=Path,
        default=Path(__file__).resolve().parent / "generated" / "dirty_data.csv",
        help="Destination CSV path",
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    try:
        create_test_data(args.output)
    except Exception as exc:
        LOGGER.error("Unable to create test data: %s", exc, exc_info=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
