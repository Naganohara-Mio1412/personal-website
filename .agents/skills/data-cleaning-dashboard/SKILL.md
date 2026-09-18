---
name: data-cleaning-dashboard
description: Safely inspect, profile, clean, summarize, and report tabular data from CSV, TSV, XLSX, or JSON files. Use when Codex is asked to perform data-quality checks; analyze missing, duplicate, anomalous, categorical, numeric, boolean, or date values; infer data types conservatively; generate descriptive statistics or a traceable cleaning report; build an offline interactive dashboard; or let a user click fields to explore distributions and charts.
---

# Data Cleaning Dashboard

## Scope

Run the bundled pipeline for reproducible data cleaning and reporting. Keep every Excel worksheet as an independent dataset. Do not use this skill for live databases, streaming dashboards, unstructured documents, or requests that only need a hand-written chart with no data-quality or cleaning work.

## Find the input

1. Prefer the exact file attached or named by the user.
2. Otherwise search the current project for `*.csv`, `*.tsv`, `*.xlsx`, and `*.json`; ignore generated output directories and temporary files.
3. If exactly one plausible source exists, use it. If several unrelated sources exist, ask the user which one to process rather than merging or guessing.
4. Resolve the input and output paths before running. Never set the output path to the original file and never overwrite the original.

## Prepare

Use Python 3.10 or newer. From this skill directory, create an isolated environment and install dependencies:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Read [references/cleaning_policy.md](references/cleaning_policy.md) before changing policy or interpreting an `advanced` request.

## Run

Default to `safe` mode unless the user explicitly requests `advanced`:

```powershell
python scripts/run_pipeline.py --input ".\input\source.xlsx" --output ".\output" --mode safe
```

The scripts resolve their own imports, so the command may be invoked from any working directory. Treat `advanced` as an explicit policy hook: this implementation still performs only safe automatic changes and reports uncertain issues unless a reviewed business rule is added.

## Check the result

Require a zero exit code and inspect:

- `cleaned_data.xlsx` for complete cleaned datasets and preserved worksheets.
- `cleaned_data.csv` for a single dataset, or one `cleaned_data__<sheet>.csv` per worksheet.
- `cleaning_report.xlsx` for the eight report sections.
- `interactive_dashboard.html` for offline field selection, filtering, pagination, and charts.
- `cleaning_log.json` for a traceable record of every automatic modification.

Confirm that the HTML contains no remote script or stylesheet dependency and clearly labels any preview-row limit. Confirm the original file's hash and timestamp are unchanged when practical.

## Handle failure

Treat any nonzero exit code as a failed run. Surface the logged error, do not claim success, and do not substitute empty or fabricated artifacts. The pipeline stages outputs in a temporary directory and publishes them only after all generators succeed. Fix the cause and rerun into a clean output location; never modify the source to make a run pass.

## Non-negotiable rules

- Use safe mode by default.
- Preserve uncertain values and report unsafe suggestions instead of applying them.
- Never overwrite or edit the original data file.
- Keep multiple worksheets separate; never silently merge them or retain only the first.
- Record every deletion, replacement, normalization, and conversion in `cleaning_log.json`.
- Run `tests/create_test_data.py` and `pytest` before declaring changes to this skill complete.
