"""Conservative, auditable data cleaning operations."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any

import pandas as pd

from profile_data import series_summary

LOGGER = logging.getLogger(__name__)
NULL_TOKENS = {"", "na", "n/a", "null", "none", "nan", "<na>"}
TRUE_TOKENS = {"true", "t", "yes", "y", "1", "是", "真"}
FALSE_TOKENS = {"false", "f", "no", "n", "0", "否", "假"}
NUMBER_PATTERN = re.compile(r"^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$")
YEAR_FIRST_DATE = re.compile(
    r"^\d{4}(?:[-/.]\d{1,2}[-/.]\d{1,2}|年\d{1,2}月\d{1,2}日)(?:[ T].*)?$"
)


def _frame_summary(frame: pd.DataFrame) -> dict[str, Any]:
    return {"rows": int(len(frame)), "columns": int(len(frame.columns)),
            "missing_cells": int(frame.isna().sum().sum()),
            "duplicate_rows": int(frame.duplicated(keep=False).sum()) if len(frame) else 0}


def _log(
    entries: list[dict[str, Any]], *, dataset: str, column: str, action: str,
    reason: str, affected_rows: int, before_summary: dict[str, Any],
    after_summary: dict[str, Any], mode: str,
) -> None:
    entries.append(
        {"timestamp": datetime.now(timezone.utc).isoformat(), "dataset": dataset,
         "column": column, "action": action, "reason": reason,
         "affected_rows": int(affected_rows), "before_summary": before_summary,
         "after_summary": after_summary, "automatic": True, "mode": mode}
    )


def _unique_trimmed_columns(columns: pd.Index) -> list[str]:
    used: dict[str, int] = {}
    result: list[str] = []
    for original in columns:
        base = str(original).strip() or "unnamed_column"
        used[base] = used.get(base, 0) + 1
        result.append(base if used[base] == 1 else f"{base}__{used[base]}")
    return result


def _normalize_text(series: pd.Series) -> tuple[pd.Series, int, int]:
    stripped_count = 0
    null_count = 0

    def normalize(value: Any) -> Any:
        nonlocal stripped_count, null_count
        if value is None or value is pd.NA:
            return pd.NA
        if isinstance(value, str):
            stripped = value.strip()
            if stripped != value:
                stripped_count += 1
            if stripped.casefold() in NULL_TOKENS:
                null_count += 1
                return pd.NA
            return stripped
        return value

    return series.map(normalize), stripped_count, null_count


def _can_convert_boolean(series: pd.Series) -> bool:
    values = {str(value).strip().casefold() for value in series.dropna()}
    # Bare 0/1 values are also valid numeric data. Without a textual boolean
    # signal, preserve that interpretation instead of guessing business meaning.
    return (
        bool(values)
        and values.issubset(TRUE_TOKENS | FALSE_TOKENS)
        and not values.issubset({"0", "1"})
    )


def _convert_boolean(series: pd.Series) -> pd.Series:
    def convert(value: Any) -> Any:
        if pd.isna(value):
            return pd.NA
        return str(value).strip().casefold() in TRUE_TOKENS

    return series.map(convert).astype("boolean")


def _can_convert_numeric(series: pd.Series) -> bool:
    values = [str(value).strip() for value in series.dropna()]
    if not values or not all(NUMBER_PATTERN.fullmatch(value) for value in values):
        return False
    return not any(re.fullmatch(r"[+-]?0\d+", value.replace(",", "")) for value in values)


def _convert_numeric(series: pd.Series) -> pd.Series:
    converted = pd.to_numeric(
        series.map(lambda value: value.replace(",", "") if isinstance(value, str) else value)
    )
    numeric_non_null = converted.dropna().astype(float)
    if len(numeric_non_null) and numeric_non_null.map(float.is_integer).all():
        return converted.astype("Int64")
    return converted.astype("Float64")


def _can_convert_date(series: pd.Series) -> bool:
    values = [str(value).strip() for value in series.dropna()]
    if not values or not all(YEAR_FIRST_DATE.fullmatch(value) for value in values):
        return False
    normalized = [value.replace("年", "-").replace("月", "-").replace("日", "") for value in values]
    try:
        parsed = pd.to_datetime(normalized, errors="raise", format="mixed", yearfirst=True)
    except (TypeError, ValueError):
        return False
    return bool(parsed.notna().all())


def _convert_date(series: pd.Series) -> pd.Series:
    def normalize(value: Any) -> Any:
        if pd.isna(value):
            return None
        return str(value).replace("年", "-").replace("月", "-").replace("日", "")

    return pd.to_datetime(series.map(normalize), errors="raise", format="mixed", yearfirst=True)


def clean_dataset(
    dataset: str, source: pd.DataFrame, mode: str = "safe"
) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    """Apply safe automatic operations to a copy of one dataset."""
    if mode not in {"safe", "advanced"}:
        raise ValueError(f"Unsupported cleaning mode: {mode}")
    frame = source.copy(deep=True)
    logs: list[dict[str, Any]] = []

    old_columns = [str(column) for column in frame.columns]
    new_columns = _unique_trimmed_columns(frame.columns)
    frame.columns = new_columns
    for old, new in zip(old_columns, new_columns):
        if old != new:
            _log(logs, dataset=dataset, column=new, action="rename_column",
                 reason="Trim surrounding whitespace and preserve unique column names", affected_rows=0,
                 before_summary={"name": old}, after_summary={"name": new}, mode=mode)

    for column in list(frame.columns):
        if frame[column].dtype == object or isinstance(frame[column].dtype, pd.StringDtype):
            before = series_summary(frame[column])
            normalized, stripped, nulled = _normalize_text(frame[column])
            frame[column] = normalized
            if stripped:
                _log(logs, dataset=dataset, column=column, action="trim_text",
                     reason="Remove leading and trailing whitespace from text values",
                     affected_rows=stripped, before_summary=before,
                     after_summary=series_summary(frame[column]), mode=mode)
            if nulled:
                _log(logs, dataset=dataset, column=column, action="normalize_missing",
                     reason="Normalize empty and explicit missing-value tokens", affected_rows=nulled,
                     before_summary=before, after_summary=series_summary(frame[column]), mode=mode)

    empty_rows = frame.isna().all(axis=1)
    if int(empty_rows.sum()):
        before_frame = _frame_summary(frame)
        affected = int(empty_rows.sum())
        frame = frame.loc[~empty_rows].copy()
        _log(logs, dataset=dataset, column="*", action="remove_empty_rows",
             reason="Rows contain no information after missing-value normalization",
             affected_rows=affected, before_summary=before_frame,
             after_summary=_frame_summary(frame), mode=mode)

    empty_columns = [column for column in frame.columns if frame[column].isna().all()]
    for column in empty_columns:
        before = series_summary(frame[column])
        frame = frame.drop(columns=[column])
        _log(logs, dataset=dataset, column=column, action="remove_empty_column",
             reason="Column is completely empty and contains no information",
             affected_rows=int(before["count"]), before_summary=before,
             after_summary={"removed": True}, mode=mode)

    for column in list(frame.columns):
        series = frame[column]
        if not (series.dtype == object or isinstance(series.dtype, pd.StringDtype)):
            continue
        before = series_summary(series)
        action: str | None = None
        reason: str | None = None
        converted: pd.Series | None = None
        if _can_convert_boolean(series):
            action, reason = "convert_boolean", "All non-missing values use an explicit boolean token"
            converted = _convert_boolean(series)
        elif _can_convert_date(series):
            action, reason = "convert_datetime", "All non-missing values use unambiguous year-first dates"
            converted = _convert_date(series)
        elif _can_convert_numeric(series):
            action, reason = "convert_numeric", "All non-missing values use unambiguous numeric syntax"
            converted = _convert_numeric(series)
        if converted is not None and action and reason:
            frame[column] = converted
            _log(logs, dataset=dataset, column=column, action=action, reason=reason,
                 affected_rows=int(series.notna().sum()), before_summary=before,
                 after_summary=series_summary(frame[column]), mode=mode)

    duplicate_mask = frame.duplicated(keep="first")
    if int(duplicate_mask.sum()):
        before_frame = _frame_summary(frame)
        affected = int(duplicate_mask.sum())
        frame = frame.loc[~duplicate_mask].copy()
        _log(logs, dataset=dataset, column="*", action="remove_duplicate_rows",
             reason="Remove records that are fully identical across all retained columns",
             affected_rows=affected, before_summary=before_frame,
             after_summary=_frame_summary(frame), mode=mode)

    frame = frame.reset_index(drop=True)
    LOGGER.info("Cleaned dataset %s: %d rows x %d columns", dataset, len(frame), len(frame.columns))
    return frame, logs


def clean_all(
    datasets: dict[str, pd.DataFrame], mode: str = "safe"
) -> tuple[dict[str, pd.DataFrame], list[dict[str, Any]]]:
    cleaned: dict[str, pd.DataFrame] = {}
    logs: list[dict[str, Any]] = []
    for name, frame in datasets.items():
        cleaned[name], entries = clean_dataset(name, frame, mode)
        logs.extend(entries)
    return cleaned, logs
