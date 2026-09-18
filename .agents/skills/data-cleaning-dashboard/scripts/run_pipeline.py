"""Command-line entry point for the data cleaning and dashboard pipeline."""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Sequence

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from clean_data import clean_all  # noqa: E402
from generate_dashboard import generate_dashboard  # noqa: E402
from generate_excel import write_cleaned_data, write_cleaning_report  # noqa: E402
from load_data import load_data  # noqa: E402

LOGGER = logging.getLogger("data_cleaning_pipeline")
STANDARD_OUTPUTS = {
    "cleaned_data.xlsx", "cleaned_data.csv", "cleaning_report.xlsx",
    "interactive_dashboard.html", "cleaning_log.json",
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Safely clean tabular data and generate Excel and offline HTML reports."
    )
    parser.add_argument("--input", required=True, type=Path, help="CSV, TSV, XLSX, or JSON input file")
    parser.add_argument("--output", required=True, type=Path, help="Output directory")
    parser.add_argument("--mode", choices=("safe", "advanced"), default="safe", help="Cleaning mode")
    return parser


def _guard_source(input_path: Path, output_dir: Path) -> None:
    source = input_path.expanduser().resolve()
    output = output_dir.expanduser().resolve()
    if output == source:
        raise ValueError("Output must be a directory and cannot be the input file")
    if source.parent == output and (
        source.name in STANDARD_OUTPUTS or source.name.startswith("cleaned_data__")
    ):
        raise ValueError(
            "Refusing to overwrite the original input because its name conflicts with a generated output"
        )


def _publish(stage: Path, output_dir: Path, source: Path) -> list[Path]:
    """Publish staged files with rollback of replaced generated artifacts on failure."""
    output_dir.mkdir(parents=True, exist_ok=True)
    artifacts = [path for path in stage.iterdir() if path.is_file()]
    for artifact in artifacts:
        if (output_dir / artifact.name).resolve() == source.resolve():
            raise ValueError(f"Generated output would overwrite the original input: {artifact.name}")
    backup = stage / "_previous_outputs"
    backup.mkdir()
    published: list[Path] = []
    replaced: list[tuple[Path, Path]] = []
    try:
        for artifact in artifacts:
            destination = output_dir / artifact.name
            if destination.exists():
                previous = backup / artifact.name
                os.replace(destination, previous)
                replaced.append((previous, destination))
            os.replace(artifact, destination)
            published.append(destination)
    except Exception:
        for destination in published:
            if destination.exists():
                destination.unlink()
        for previous, destination in replaced:
            if previous.exists():
                os.replace(previous, destination)
        raise
    return published


def run_pipeline(input_path: Path, output_dir: Path, mode: str = "safe") -> list[Path]:
    source = input_path.expanduser().resolve()
    output = output_dir.expanduser().resolve()
    _guard_source(source, output)
    datasets = load_data(source)
    cleaned, logs = clean_all(datasets, mode)

    output.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".data-cleaning-stage-", dir=output.parent))
    try:
        write_cleaned_data(cleaned, stage)
        write_cleaning_report(datasets, cleaned, logs, stage / "cleaning_report.xlsx")
        generate_dashboard(
            datasets,
            cleaned,
            logs,
            stage / "interactive_dashboard.html",
            mode=mode,
        )
        (stage / "cleaning_log.json").write_text(
            json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n"
        )
        published = _publish(stage, output, source)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    return published


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    try:
        published = run_pipeline(args.input, args.output, args.mode)
    except Exception as exc:
        LOGGER.error("Pipeline failed: %s", exc, exc_info=True)
        return 1
    LOGGER.info("Pipeline completed successfully; published %d file(s) to %s", len(published), args.output.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
