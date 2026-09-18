"""Data profiling and report-table construction."""

from __future__ import annotations

import json
import math
from typing import Any, Iterable

import numpy as np
import pandas as pd
from pandas.api import types as ptypes


def json_safe(value: Any) -> Any:
    """Convert pandas/numpy values to JSON-safe Python values."""
    if value is None or value is pd.NA:
        return None
    if isinstance(value, (pd.Timestamp, np.datetime64)):
        return pd.Timestamp(value).isoformat()
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return None if math.isnan(float(value)) or math.isinf(float(value)) else float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return str(value) if not isinstance(value, (str, int)) else value


def series_summary(series: pd.Series) -> dict[str, Any]:
    """Create a compact audit summary for a series."""
    non_null = series.dropna()
    return {
        "dtype": str(series.dtype),
        "count": int(len(series)),
        "missing": int(series.isna().sum()),
        "unique": int(non_null.nunique(dropna=True)),
        "sample": [json_safe(value) for value in non_null.head(3).tolist()],
    }


def infer_kind(series: pd.Series) -> str:
    """Classify a cleaned series for report and chart selection."""
    if ptypes.is_bool_dtype(series.dtype):
        return "boolean"
    if ptypes.is_numeric_dtype(series.dtype):
        return "numeric"
    if ptypes.is_datetime64_any_dtype(series.dtype):
        return "datetime"
    non_null = series.dropna()
    unique = int(non_null.nunique(dropna=True))
    threshold = max(15, min(50, int(math.sqrt(max(len(series), 1)) * 2)))
    return "category" if unique <= threshold else "text"


def _top_values(series: pd.Series, limit: int = 15) -> list[dict[str, Any]]:
    counts = series.dropna().astype(str).value_counts().head(limit)
    return [
        {"value": str(value), "count": int(count), "ratio": float(count / max(len(series), 1))}
        for value, count in counts.items()
    ]


def profile_dataset(name: str, frame: pd.DataFrame) -> dict[str, Any]:
    """Profile one independent dataset without mutating it."""
    missing_cells = int(frame.isna().sum().sum())
    duplicate_rows = int(frame.duplicated(keep=False).sum()) if len(frame) else 0
    fields: list[dict[str, Any]] = []
    outliers: list[dict[str, Any]] = []
    categories: list[dict[str, Any]] = []

    for column in frame.columns:
        series = frame[column]
        kind = infer_kind(series)
        non_null = series.dropna()
        field: dict[str, Any] = {
            "dataset": name,
            "column": str(column),
            "dtype": str(series.dtype),
            "kind": kind,
            "rows": int(len(series)),
            "non_null": int(series.notna().sum()),
            "missing_count": int(series.isna().sum()),
            "missing_ratio": float(series.isna().mean()) if len(series) else 0.0,
            "unique_count": int(non_null.nunique(dropna=True)),
            "sample_values": [json_safe(value) for value in non_null.head(5).tolist()],
            "top_values": _top_values(series),
        }
        if kind == "numeric" and len(non_null):
            numeric = pd.to_numeric(non_null, errors="coerce").dropna().astype(float)
            if len(numeric):
                field.update(
                    {"min": json_safe(numeric.min()), "max": json_safe(numeric.max()),
                     "mean": json_safe(numeric.mean()), "median": json_safe(numeric.median())}
                )
                q1 = float(numeric.quantile(0.25))
                q3 = float(numeric.quantile(0.75))
                iqr = q3 - q1
                lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
                count = int(((numeric < lower) | (numeric > upper)).sum())
                outliers.append(
                    {"dataset": name, "column": str(column), "method": "1.5 IQR hint (not removed)",
                     "lower_bound": lower, "upper_bound": upper, "suspected_count": count,
                     "automatic_action": "none"}
                )
        fields.append(field)
        if kind in {"category", "boolean"}:
            for item in field["top_values"]:
                categories.append(
                    {"dataset": name, "column": str(column), "value": item["value"],
                     "count": item["count"], "ratio": item["ratio"]}
                )

    return {
        "dataset": name,
        "overview": {"dataset": name, "row_count": int(len(frame)),
                     "column_count": int(len(frame.columns)), "missing_cells": missing_cells,
                     "missing_ratio": float(missing_cells / max(frame.size, 1)),
                     "duplicate_rows": duplicate_rows},
        "fields": fields,
        "outliers": outliers,
        "categories": categories,
    }


def profile_all(datasets: dict[str, pd.DataFrame]) -> dict[str, dict[str, Any]]:
    return {name: profile_dataset(name, frame) for name, frame in datasets.items()}


def build_report_tables(
    before: dict[str, pd.DataFrame],
    after: dict[str, pd.DataFrame],
    logs: Iterable[dict[str, Any]],
) -> dict[str, pd.DataFrame]:
    """Build the eight required report sections as DataFrames."""
    before_profiles = profile_all(before)
    after_profiles = profile_all(after)
    overviews = [profile["overview"] for profile in after_profiles.values()]
    fields = [field for profile in after_profiles.values() for field in profile["fields"]]
    missing = [
        {"dataset": field["dataset"], "column": field["column"],
         "missing_count": field["missing_count"], "missing_ratio": field["missing_ratio"],
         "automatic_action": "none" if field["missing_count"] else "not needed"}
        for field in fields
    ]
    duplicates = [
        {"dataset": name,
         "before_duplicate_rows": before_profiles[name]["overview"]["duplicate_rows"],
         "after_duplicate_rows": after_profiles[name]["overview"]["duplicate_rows"],
         "safe_action": "remove fully duplicate records"}
        for name in after
    ]
    outliers = [item for profile in after_profiles.values() for item in profile["outliers"]]
    categories = [item for profile in after_profiles.values() for item in profile["categories"]]
    comparison = []
    for name in after:
        left = before_profiles[name]["overview"]
        right = after_profiles[name]["overview"]
        comparison.append(
            {"dataset": name, "before_rows": left["row_count"], "after_rows": right["row_count"],
             "row_change": right["row_count"] - left["row_count"],
             "before_columns": left["column_count"], "after_columns": right["column_count"],
             "column_change": right["column_count"] - left["column_count"],
             "before_missing_cells": left["missing_cells"],
             "after_missing_cells": right["missing_cells"],
             "missing_change": right["missing_cells"] - left["missing_cells"]}
        )

    field_rows = [
        {"dataset": field["dataset"], "column": field["column"], "dtype": field["dtype"],
         "semantic_type": field["kind"], "non_null": field["non_null"],
         "unique_count": field["unique_count"],
         "min": field.get("min"), "max": field.get("max"),
         "mean": field.get("mean"), "median": field.get("median"),
         "sample_values": json.dumps(field["sample_values"], ensure_ascii=False)}
        for field in fields
    ]
    log_rows = []
    for entry in logs:
        row = dict(entry)
        row["before_summary"] = json.dumps(row.get("before_summary", {}), ensure_ascii=False)
        row["after_summary"] = json.dumps(row.get("after_summary", {}), ensure_ascii=False)
        log_rows.append(row)

    return {
        "数据概览": pd.DataFrame(overviews), "字段字典": pd.DataFrame(field_rows),
        "缺失值分析": pd.DataFrame(missing), "重复值分析": pd.DataFrame(duplicates),
        "异常值提示": pd.DataFrame(outliers), "类别字段分析": pd.DataFrame(categories),
        "清洗前后对比": pd.DataFrame(comparison), "清洗日志": pd.DataFrame(log_rows),
    }
