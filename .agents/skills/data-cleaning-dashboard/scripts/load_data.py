"""Input loading for CSV, TSV, XLSX, and JSON datasets."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import pandas as pd
from charset_normalizer import from_bytes

LOGGER = logging.getLogger(__name__)
TEXT_ENCODINGS = ("utf-8-sig", "utf-8", "gb18030", "gbk")
SUPPORTED_SUFFIXES = {".csv", ".tsv", ".xlsx", ".json"}


class DataLoadError(RuntimeError):
    """Raised when a supported input cannot be decoded or parsed."""


def _read_delimited(path: Path, separator: str) -> pd.DataFrame:
    errors: list[str] = []
    tried: list[str] = []
    for encoding in TEXT_ENCODINGS:
        tried.append(encoding)
        try:
            frame = pd.read_csv(
                path, sep=separator, encoding=encoding, keep_default_na=False, na_filter=False
            )
            LOGGER.info("Loaded %s with encoding %s", path.name, encoding)
            return frame
        except UnicodeDecodeError as exc:
            errors.append(f"{encoding}: {exc}")
        except pd.errors.ParserError as exc:
            raise DataLoadError(f"Unable to parse {path}: {exc}") from exc

    detected = from_bytes(path.read_bytes()).best()
    if detected and detected.encoding and detected.encoding.lower() not in tried:
        try:
            return pd.read_csv(
                path, sep=separator, encoding=detected.encoding, keep_default_na=False, na_filter=False
            )
        except (UnicodeDecodeError, pd.errors.ParserError) as exc:
            errors.append(f"{detected.encoding}: {exc}")
    raise DataLoadError(
        f"Unable to decode {path.name}; attempted UTF-8, UTF-8-SIG, GB18030, and GBK. "
        + " | ".join(errors)
    )


def _decode_json(path: Path) -> Any:
    raw = path.read_bytes()
    errors: list[str] = []
    for encoding in TEXT_ENCODINGS:
        try:
            return json.loads(raw.decode(encoding))
        except UnicodeDecodeError as exc:
            errors.append(f"{encoding}: {exc}")
        except json.JSONDecodeError as exc:
            raise DataLoadError(f"Invalid JSON in {path.name}: {exc}") from exc
    raise DataLoadError(f"Unable to decode JSON {path.name}: {' | '.join(errors)}")


def _json_to_frame(payload: Any, path: Path) -> pd.DataFrame:
    try:
        if isinstance(payload, list):
            return pd.json_normalize(payload)
        if isinstance(payload, dict):
            if payload and all(isinstance(value, list) for value in payload.values()):
                lengths = {len(value) for value in payload.values()}
                if len(lengths) == 1:
                    return pd.DataFrame(payload)
            return pd.json_normalize(payload)
    except (TypeError, ValueError) as exc:
        raise DataLoadError(f"JSON structure in {path.name} is not tabular: {exc}") from exc
    raise DataLoadError(
        f"JSON root in {path.name} must be an object or an array of records, not {type(payload).__name__}"
    )


def load_data(input_path: str | Path) -> dict[str, pd.DataFrame]:
    """Load an input file into one or more named, independent datasets."""
    path = Path(input_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Input file does not exist: {path}")
    if not path.is_file():
        raise DataLoadError(f"Input path is not a file: {path}")
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise DataLoadError(
            f"Unsupported input type {suffix or '<none>'}; expected CSV, TSV, XLSX, or JSON"
        )

    if suffix == ".csv":
        return {path.stem: _read_delimited(path, ",")}
    if suffix == ".tsv":
        return {path.stem: _read_delimited(path, "\t")}
    if suffix == ".json":
        return {path.stem: _json_to_frame(_decode_json(path), path)}

    try:
        workbook = pd.ExcelFile(path, engine="openpyxl")
        datasets = {
            sheet: pd.read_excel(
                workbook, sheet_name=sheet, keep_default_na=False, na_filter=False
            )
            for sheet in workbook.sheet_names
        }
    except Exception as exc:
        raise DataLoadError(f"Unable to read Excel workbook {path.name}: {exc}") from exc
    if not datasets:
        raise DataLoadError(f"Excel workbook contains no worksheets: {path.name}")
    LOGGER.info("Loaded %d worksheet(s) from %s", len(datasets), path.name)
    return datasets
