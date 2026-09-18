# Data cleaning policy

## Safe mode

Apply only deterministic, reversible-in-principle normalizations whose meaning is clear from the values themselves:

1. Trim column names while preserving every column. If trimming creates a collision, add a deterministic `__2`, `__3`, and so on suffix and log it.
2. Trim leading and trailing whitespace from text cells.
3. Normalize empty strings and the case-insensitive tokens `NA`, `N/A`, `null`, `None`, `nan`, and `<NA>` to missing values.
4. Remove rows that are entirely missing after normalization.
5. Remove columns that are entirely missing after normalization.
6. Convert a text column to numeric only when every non-missing value matches an unambiguous numeric syntax. Thousands separators are removed; apparent identifiers with leading zeroes are preserved.
7. Convert a text column to datetime only when every non-missing value uses an unambiguous year-first date syntax and every value parses successfully.
8. Convert a text column to boolean only when every non-missing value belongs to the explicit true/false token map.
   Preserve a column containing only `0` and `1` as numeric because those values are ambiguous without a textual boolean signal.
9. Remove fully duplicate rows after the preceding deterministic normalizations.
10. Preserve anything uncertain and add it to the report.

Every applied operation must create a log entry with `timestamp`, `dataset`, `column`, `action`, `reason`, `affected_rows`, `before_summary`, `after_summary`, `automatic`, and `mode`.

## Prohibited automatic actions

Do not automatically:

- delete IQR, z-score, or domain outliers;
- impute business missing values with a mean, median, mode, zero, or forward fill;
- merge similar-looking category labels or correct their spelling;
- alter identifiers or primary keys;
- infer a column's business meaning from its name;
- coerce ambiguous day/month dates or invalid dates;
- rescale currencies, percentages, or other measurement units;
- discard a high-missingness field that might have business value.

Flag these issues in the Excel and HTML reports. Category labels that differ only by case or spacing after required trimming may be highlighted but must not be merged.

## Advanced mode

`advanced` is accepted by the CLI for forward-compatible workflows, but it grants no implicit permission for destructive or semantic edits. Add a reviewed, explicit business rule before implementing any action beyond safe mode. Log the rule and retain source values needed for auditability.

## Reporting conventions

- Calculate numeric outlier hints with the 1.5 IQR rule and never treat them as deletion instructions.
- Limit category charts to the 15 most frequent values.
- Keep full cleaned data in Excel and CSV outputs. The offline HTML may embed only a labeled preview.
- For multi-sheet workbooks, profile, clean, report, export, and visualize each sheet independently.
