import os
from pathlib import Path
from scipy.stats import pointbiserialr, spearmanr

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "diabetes_data"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

INPUT_FILES = {
    "diabetes_012": "diabetes_012_health_indicators_BRFSS2015.csv",
    "diabetes_binary_5050": "diabetes_binary_5050split_health_indicators_BRFSS2015.csv",
    "diabetes_binary_full": "diabetes_binary_health_indicators_BRFSS2015.csv",
}


def load_datasets() -> dict[str, pd.DataFrame]:
    datasets: dict[str, pd.DataFrame] = {}
    for name, filename in INPUT_FILES.items():
        file_path = DATA_DIR / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Missing input file: {file_path}")
        df = pd.read_csv(file_path)
        df["__dataset_name"] = name
        datasets[name] = df
    return datasets


def dataset_overview(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = []
    for name, df in datasets.items():
        base_cols = [c for c in df.columns if c != "__dataset_name"]
        duplicated_rows = int(df[base_cols].duplicated().sum()) if base_cols else 0
        rows.append(
            {
                "dataset": name,
                "rows": int(df.shape[0]),
                "columns": int(len(base_cols)),
                "total_missing_values": int(df[base_cols].isna().sum().sum()) if base_cols else 0,
                "duplicate_rows": duplicated_rows,
            }
        )
    return pd.DataFrame(rows).sort_values("dataset")


def column_profile(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    frames = []
    for name, df in datasets.items():
        cols = [c for c in df.columns if c != "__dataset_name"]
        prof = pd.DataFrame(
            {
                "dataset": name,
                "column": cols,
                "dtype": [str(df[c].dtype) for c in cols],
                "non_null_count": [int(df[c].notna().sum()) for c in cols],
                "missing_count": [int(df[c].isna().sum()) for c in cols],
                "missing_ratio": [float(df[c].isna().mean()) for c in cols],
                "n_unique": [int(df[c].nunique(dropna=True)) for c in cols],
            }
        )
        frames.append(prof)
    if not frames:
        return pd.DataFrame(
            columns=[
                "dataset",
                "column",
                "dtype",
                "non_null_count",
                "missing_count",
                "missing_ratio",
                "n_unique",
            ]
        )
    return pd.concat(frames, ignore_index=True)


def missingness_report(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = []
    for name, df in datasets.items():
        cols = [c for c in df.columns if c != "__dataset_name"]
        for c in cols:
            miss = int(df[c].isna().sum())
            if miss > 0:
                rows.append(
                    {
                        "dataset": name,
                        "column": c,
                        "missing_count": miss,
                        "missing_ratio": float(df[c].isna().mean()),
                    }
                )
    return pd.DataFrame(rows).sort_values(["dataset", "missing_count"], ascending=[True, False]) if rows else pd.DataFrame(columns=["dataset", "column", "missing_count", "missing_ratio"])


def target_balance(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue
        counts = df[target].value_counts(dropna=False).sort_index()
        total = max(int(df.shape[0]), 1)
        for cls, cnt in counts.items():
            rows.append(
                {
                    "dataset": name,
                    "target_column": target,
                    "class": cls,
                    "count": int(cnt),
                    "ratio": float(cnt / total),
                }
            )
    return pd.DataFrame(rows)


def schema_comparison(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    all_cols = set()
    for df in datasets.values():
        all_cols.update([c for c in df.columns if c != "__dataset_name"])
    rows = []
    for col in sorted(all_cols):
        row = {"column": col}
        for name, df in datasets.items():
            row[name] = int(col in df.columns)
        rows.append(row)
    return pd.DataFrame(rows)


def target_grouped_stats(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Compute per-target-class feature statistics."""
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue
        feature_cols = [c for c in df.columns if c not in [target, "__dataset_name"]]
        for cls in sorted(df[target].unique()):
            subset = df[df[target] == cls]
            for feat in feature_cols:
                if pd.api.types.is_numeric_dtype(subset[feat]):
                    val = subset[feat].dropna()
                    if not val.empty:
                        rows.append({
                            "dataset": name,
                            "target_class": cls,
                            "feature": feat,
                            "count": int(len(val)),
                            "mean": float(val.mean()),
                            "std": float(val.std(ddof=1)) if len(val) > 1 else 0.0,
                            "median": float(val.median()),
                            "min": float(val.min()),
                            "max": float(val.max()),
                        })
    return pd.DataFrame(rows)


def feature_correlation(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Compute feature-target correlation for each dataset."""
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue
        feature_cols = [c for c in df.columns if c not in [target, "__dataset_name"]]
        target_vals = df[target].values
        for feat in feature_cols:
            if pd.api.types.is_numeric_dtype(df[feat]):
                feat_vals = df[feat].dropna()
                if feat_vals.empty or len(feat_vals) < 2:
                    continue
                try:
                    if df[target].nunique() <= 3:
                        corr, pval = pointbiserialr(df[target], df[feat].fillna(df[feat].mean()))
                    else:
                        corr, pval = spearmanr(df[target], df[feat].fillna(df[feat].mean()))
                    rows.append({
                        "dataset": name,
                        "feature": feat,
                        "correlation": float(corr),
                        "p_value": float(pval),
                        "abs_correlation": float(abs(corr)),
                    })
                except Exception:
                    pass
    result = pd.DataFrame(rows).sort_values("abs_correlation", ascending=False)
    return result


def feature_variance_analysis(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Analyze feature variance/stability across classes."""
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue
        feature_cols = [c for c in df.columns if c not in [target, "__dataset_name"]]
        for feat in feature_cols:
            if pd.api.types.is_numeric_dtype(df[feat]):
                overall = df[feat].dropna()
                if overall.empty:
                    continue
                var_by_class = []
                for cls in sorted(df[target].unique()):
                    subset_vals = df[df[target] == cls][feat].dropna()
                    if not subset_vals.empty and len(subset_vals) > 1:
                        var_by_class.append(float(subset_vals.var(ddof=1)))
                if var_by_class:
                    rows.append({
                        "dataset": name,
                        "feature": feat,
                        "overall_variance": float(overall.var(ddof=1)) if len(overall) > 1 else 0.0,
                        "mean_class_variance": float(np.mean(var_by_class)),
                        "max_class_variance": float(np.max(var_by_class)),
                        "variance_stability_ratio": float(np.mean(var_by_class) / max(float(overall.var(ddof=1)), 0.001)) if len(overall) > 1 else 1.0,
                    })
    return pd.DataFrame(rows)


def data_quality_score(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Compute overall data quality score per dataset."""
    rows = []
    for name, df in datasets.items():
        base_cols = [c for c in df.columns if c != "__dataset_name"]
        missing_ratio = float(df[base_cols].isna().sum().sum() / (df.shape[0] * len(base_cols))) if base_cols else 0.0
        duplicate_ratio = float(df[base_cols].duplicated().sum() / df.shape[0]) if base_cols else 0.0
        numeric_cols = [c for c in base_cols if pd.api.types.is_numeric_dtype(df[c])]
        outlier_ratio = 0.0
        if numeric_cols:
            total_outliers = 0
            for c in numeric_cols:
                vals = df[c].dropna()
                if len(vals) > 1:
                    q1, q3 = vals.quantile([0.25, 0.75])
                    iqr = q3 - q1
                    if iqr > 0:
                        total_outliers += ((vals < q1 - 1.5 * iqr) | (vals > q3 + 1.5 * iqr)).sum()
            outlier_ratio = float(total_outliers / (len(numeric_cols) * df.shape[0])) if numeric_cols else 0.0

        quality = 100.0
        quality -= missing_ratio * 30
        quality -= duplicate_ratio * 20
        quality -= outlier_ratio * 10
        quality = max(0.0, min(100.0, quality))

        rows.append({
            "dataset": name,
            "rows": int(df.shape[0]),
            "columns": int(len(base_cols)),
            "missing_ratio": float(missing_ratio),
            "duplicate_ratio": float(duplicate_ratio),
            "outlier_ratio": float(outlier_ratio),
            "quality_score": float(quality),
        })
    return pd.DataFrame(rows)


def numeric_summary(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    rows = []
    for name, df in datasets.items():
        for c in [x for x in df.columns if x != "__dataset_name"]:
            if pd.api.types.is_numeric_dtype(df[c]):
                series = df[c].dropna()
                if series.empty:
                    continue
                q1 = float(series.quantile(0.25))
                q3 = float(series.quantile(0.75))
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outliers = int(((series < lower) | (series > upper)).sum())
                rows.append(
                    {
                        "dataset": name,
                        "column": c,
                        "mean": float(series.mean()),
                        "std": float(series.std(ddof=1)) if len(series) > 1 else 0.0,
                        "min": float(series.min()),
                        "q25": q1,
                        "median": float(series.median()),
                        "q75": q3,
                        "max": float(series.max()),
                        "outlier_count_iqr": outliers,
                        "outlier_ratio_iqr": float(outliers / max(len(series), 1)),
                    }
                )
    return pd.DataFrame(rows)


def feature_importance_ranking(corr_df: pd.DataFrame, variance_df: pd.DataFrame, grouped_stats_df: pd.DataFrame) -> pd.DataFrame:
    """Compute composite feature importance score combining correlation and stability."""
    rows = []

    for ds in corr_df["dataset"].unique():
        corr_sub = corr_df[corr_df["dataset"] == ds]
        var_sub = variance_df[variance_df["dataset"] == ds]

        for feat in corr_sub["feature"].unique():
            feat_corr = corr_sub[corr_sub["feature"] == feat]
            if feat_corr.empty:
                continue

            corr_score = float(feat_corr["abs_correlation"].iloc[0])

            feat_var = var_sub[var_sub["feature"] == feat]
            if not feat_var.empty:
                stability_score = 1.0 / max(float(feat_var["variance_stability_ratio"].iloc[0]), 0.1)
            else:
                stability_score = 0.5

            importance = (corr_score * 0.7 + stability_score * 0.3)

            rows.append({
                "dataset": ds,
                "feature": feat,
                "correlation_score": corr_score,
                "stability_score": stability_score,
                "composite_importance": float(importance),
                "recommendation": "HIGH" if importance > 0.3 else "MEDIUM" if importance > 0.1 else "LOW"
            })

    return pd.DataFrame(rows).sort_values("composite_importance", ascending=False)


def feature_distribution_comparison(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Compare feature distributions across positive/negative cases."""
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue

        feature_cols = [c for c in df.columns if c not in [target, "__dataset_name"]]

        if df[target].nunique() < 2:
            continue

        unique_classes = sorted(df[target].unique())
        class_0 = df[df[target] == unique_classes[0]]
        class_1 = df[df[target] == unique_classes[-1]]

        for feat in feature_cols:
            if not pd.api.types.is_numeric_dtype(df[feat]):
                continue

            val_0 = class_0[feat].dropna()
            val_1 = class_1[feat].dropna()

            if val_0.empty or val_1.empty:
                continue

            mean_diff = float(val_1.mean() - val_0.mean())
            std_pool = float(np.sqrt((val_0.std(ddof=1)**2 + val_1.std(ddof=1)**2) / 2))
            cohens_d = mean_diff / max(std_pool, 0.001)

            rows.append({
                "dataset": name,
                "feature": feat,
                "class_0_mean": float(val_0.mean()),
                "class_1_mean": float(val_1.mean()),
                "mean_difference": mean_diff,
                "cohens_d": float(cohens_d),
                "effect_size": "LARGE" if abs(cohens_d) > 0.8 else "MEDIUM" if abs(cohens_d) > 0.5 else "SMALL"
            })

    return pd.DataFrame(rows).sort_values("cohens_d", ascending=False, key=abs)


def feature_multicollinearity_check(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Identify highly correlated feature pairs (multicollinearity warning)."""
    rows = []
    for name, df in datasets.items():
        numeric_cols = [c for c in df.columns if c not in ["__dataset_name", "Diabetes_012", "Diabetes_binary"] and pd.api.types.is_numeric_dtype(df[c])]
        if len(numeric_cols) < 2:
            continue

        corr_matrix = df[numeric_cols].corr(method="pearson")

        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                corr_val = float(corr_matrix.iloc[i, j])
                if abs(corr_val) > 0.7:
                    rows.append({
                        "dataset": name,
                        "feature_1": corr_matrix.columns[i],
                        "feature_2": corr_matrix.columns[j],
                        "correlation": corr_val,
                        "abs_correlation": abs(corr_val),
                    })

    return pd.DataFrame(rows).sort_values("abs_correlation", ascending=False) if rows else pd.DataFrame(columns=["dataset", "feature_1", "feature_2", "correlation", "abs_correlation"])


def engineered_features_preview(datasets: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Generate preview of engineered features (interactions & composites)."""
    rows = []
    for name, df in datasets.items():
        target = "Diabetes_012" if "012" in name else "Diabetes_binary"
        if target not in df.columns:
            continue

        if "Age" in df.columns and "HighBP" in df.columns:
            age_bp = (df["Age"] * df["HighBP"]).dropna()
            if not age_bp.empty:
                rows.append({
                    "dataset": name,
                    "feature": "Age_x_HighBP",
                    "mean": float(age_bp.mean()),
                    "std": float(age_bp.std(ddof=1)) if len(age_bp) > 1 else 0.0,
                    "min": float(age_bp.min()),
                    "max": float(age_bp.max()),
                })

        if "BMI" in df.columns and "PhysActivity" in df.columns:
            bmi_pa = (df["BMI"] * df["PhysActivity"]).dropna()
            if not bmi_pa.empty:
                rows.append({
                    "dataset": name,
                    "feature": "BMI_x_PhysActivity",
                    "mean": float(bmi_pa.mean()),
                    "std": float(bmi_pa.std(ddof=1)) if len(bmi_pa) > 1 else 0.0,
                    "min": float(bmi_pa.min()),
                    "max": float(bmi_pa.max()),
                })

        if all(c in df.columns for c in ["GenHlth", "MentHlth", "PhysHlth"]):
            health = (df["GenHlth"] + df["MentHlth"] + df["PhysHlth"]).dropna()
            if not health.empty:
                rows.append({
                    "dataset": name,
                    "feature": "HealthBurden_Index",
                    "mean": float(health.mean()),
                    "std": float(health.std(ddof=1)) if len(health) > 1 else 0.0,
                    "min": float(health.min()),
                    "max": float(health.max()),
                })

    return pd.DataFrame(rows)


def write_report(
    overview_df: pd.DataFrame,
    quality_df: pd.DataFrame,
    missing_df: pd.DataFrame,
    target_df: pd.DataFrame,
    numeric_df: pd.DataFrame,
    corr_df: pd.DataFrame,
    variance_df: pd.DataFrame,
    path: Path,
) -> None:
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("DIABETES DATASET ANALYSIS REPORT")
    lines.append("=" * 60)
    lines.append("")

    lines.append("1) DATASET OVERVIEW & QUALITY SCORES")
    lines.append("-" * 60)
    for _, r in quality_df.iterrows():
        lines.append(f"\nDataset: {r['dataset']}")
        lines.append(f"  Rows: {int(r['rows'])}, Columns: {int(r['columns'])}")
        lines.append(f"  Missing Ratio: {r['missing_ratio']:.2%}, Duplicate Ratio: {r['duplicate_ratio']:.2%}")
        lines.append(f"  Outlier Ratio: {r['outlier_ratio']:.2%}")
        lines.append(f"  QUALITY SCORE: {r['quality_score']:.1f}/100")
    lines.append("")

    lines.append("2) TARGET DISTRIBUTION & CLASS BALANCE")
    lines.append("-" * 60)
    if target_df.empty:
        lines.append("No recognized target columns found.")
    else:
        for ds in sorted(target_df["dataset"].unique()):
            lines.append(f"\n{ds}:")
            sub = target_df[target_df["dataset"] == ds].sort_values("class")
            for _, r in sub.iterrows():
                lines.append(f"  Class {r['class']:>3} → {int(r['count']):>8} samples ({r['ratio']:>6.2%})")
    lines.append("")

    lines.append("3) FEATURE-TARGET CORRELATION (Top 15)")
    lines.append("-" * 60)
    if corr_df.empty:
        lines.append("No correlations computed.")
    else:
        for ds in sorted(corr_df["dataset"].unique()):
            lines.append(f"\n{ds}:")
            sub = corr_df[corr_df["dataset"] == ds].head(15)
            for _, r in sub.iterrows():
                sig = "***" if r['p_value'] < 0.001 else "**" if r['p_value'] < 0.01 else "*" if r['p_value'] < 0.05 else ""
                lines.append(f"  {r['feature']:>20} corr={r['correlation']:>7.4f} (p={r['p_value']:.2e}) {sig}")
    lines.append("")

    lines.append("4) FEATURE VARIANCE STABILITY (Top 10 unstable)")
    lines.append("-" * 60)
    if variance_df.empty:
        lines.append("No variance analysis available.")
    else:
        for ds in sorted(variance_df["dataset"].unique()):
            lines.append(f"\n{ds}:")
            sub = variance_df[variance_df["dataset"] == ds].sort_values("variance_stability_ratio", ascending=False).head(10)
            for _, r in sub.iterrows():
                lines.append(f"  {r['feature']:>20} stability_ratio={r['variance_stability_ratio']:.4f}, max_class_var={r['max_class_variance']:.4f}")
    lines.append("")

    lines.append("5) MISSING VALUES (if any)")
    lines.append("-" * 60)
    if missing_df.empty:
        lines.append("No missing values detected in any dataset.")
    else:
        top_missing = missing_df.sort_values("missing_count", ascending=False).head(10)
        for _, r in top_missing.iterrows():
            lines.append(f"  {r['dataset']}.{r['column']}: {int(r['missing_count'])} ({r['missing_ratio']:.2%})")
    lines.append("")

    lines.append("6) OUTLIER DETECTION (IQR Method, Top 10)")
    lines.append("-" * 60)
    if numeric_df.empty:
        lines.append("No numeric columns for analysis.")
    else:
        top_outliers = numeric_df.sort_values("outlier_ratio_iqr", ascending=False).head(10)
        for _, r in top_outliers.iterrows():
            lines.append(f"  {r['dataset']}.{r['column']:>20} outlier_ratio={r['outlier_ratio_iqr']:.2%}, mean={r['mean']:.4f}, std={r['std']:.4f}")
    lines.append("")

    lines.append("7) KEY INSIGHTS & RECOMMENDATIONS")
    lines.append("-" * 60)
    best_quality = quality_df.loc[quality_df['quality_score'].idxmax()] if not quality_df.empty else None
    if best_quality is not None:
        lines.append(f"Best quality dataset: {best_quality['dataset']} (score: {best_quality['quality_score']:.1f}/100)")

    lines.append("- Use binary_5050 split for balanced model training (addresses class imbalance).")
    lines.append("- Apply feature scaling (StandardScaler/RobustScaler) for models sensitive to magnitude.")
    lines.append("- Consider feature engineering for high-outlier columns.")
    lines.append("- Validate correlation findings with domain expertise before feature selection.")
    lines.append("- Monitor variance stability across folds in cross-validation.")
    lines.append("")

    lines.append("=" * 60)

    path.write_text("\n".join(lines), encoding="utf-8")


def generate_engineering_recommendations(
    corr_df: pd.DataFrame,
    importance_df: pd.DataFrame,
    numeric_df: pd.DataFrame,
    path: Path
) -> None:
    """Generate detailed feature engineering recommendations."""
    lines = []
    lines.append("=" * 70)
    lines.append("FEATURE ENGINEERING & SELECTION RECOMMENDATIONS")
    lines.append("=" * 70)
    lines.append("")

    lines.append("PHASE 1: Feature Selection Strategy")
    lines.append("-" * 70)
    lines.append("")

    high_importance = importance_df[importance_df["recommendation"] == "HIGH"]
    if not high_importance.empty:
        lines.append(f"TOP FEATURES FOR INCLUSION ({len(high_importance)} features):")
        for ds in high_importance["dataset"].unique():
            lines.append(f"\n  {ds}:")
            top_feats = high_importance[high_importance["dataset"] == ds].head(8)
            for idx, (_, r) in enumerate(top_feats.iterrows(), 1):
                lines.append(f"    {idx}. {r['feature']:>20} importance={r['composite_importance']:.4f}")

    lines.append("")
    lines.append("PHASE 2: Scaling & Normalization")
    lines.append("-" * 70)
    lines.append("")

    high_var = numeric_df[numeric_df["std"] > 1].sort_values("std", ascending=False)
    if not high_var.empty:
        lines.append(f"FEATURES REQUIRING SCALING ({len(high_var)} columns with high variance):")
        for _, r in high_var.head(8).iterrows():
            lines.append(f"  - {r['column']:>20} std={r['std']:.4f}, range=[{r['min']:.2f}, {r['max']:.2f}]")

    lines.append("")
    lines.append("PHASE 3: Outlier Handling")
    lines.append("-" * 70)
    lines.append("")

    high_outliers = numeric_df[numeric_df["outlier_ratio_iqr"] > 0.05].sort_values("outlier_ratio_iqr", ascending=False)
    if not high_outliers.empty:
        lines.append(f"OUTLIER-PRONE FEATURES ({len(high_outliers)} columns > 5% outliers):")
        for _, r in high_outliers.head(8).iterrows():
            lines.append(f"  - {r['column']:>20} outlier_ratio={r['outlier_ratio_iqr']:.2%}")

    lines.append("")
    lines.append("PHASE 4: Feature Interactions & Creation")
    lines.append("-" * 70)
    lines.append("")
    lines.append("Recommended composite features:")
    lines.append("  - Age × HighBP interaction (age-stratified hypertension risk)")
    lines.append("  - BMI × PhysActivity interaction (fitness impact on obesity)")
    lines.append("  - GenHlth + MentHlth + PhysHlth (total health burden index)")
    lines.append("  - Income × Education (SES proxy)")
    lines.append("")

    lines.append("PHASE 5: Model Training Strategy")
    lines.append("-" * 70)
    lines.append("")
    lines.append("- Use diabetes_binary_5050 for balanced training (50/50 class split)")
    lines.append("- Apply StandardScaler post-split (fit on train, transform on test/val)")
    lines.append("- Enable class_weight='balanced' in tree-based models for binary_full data")
    lines.append("- Use stratified cross-validation with folds=5 minimum")
    lines.append("- Monitor for multicollinearity if using linear models")
    lines.append("")

    lines.append("=" * 70)

    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    datasets = load_datasets()

    # Run all analyses
    overview_df = dataset_overview(datasets)
    col_profile_df = column_profile(datasets)
    missing_df = missingness_report(datasets)
    target_df = target_balance(datasets)
    schema_df = schema_comparison(datasets)
    numeric_df = numeric_summary(datasets)

    # Enhanced analyses
    quality_df = data_quality_score(datasets)
    grouped_stats_df = target_grouped_stats(datasets)
    corr_df = feature_correlation(datasets)
    variance_df = feature_variance_analysis(datasets)
    importance_df = feature_importance_ranking(corr_df, variance_df, grouped_stats_df)
    distribution_df = feature_distribution_comparison(datasets)
    multicollinearity_df = feature_multicollinearity_check(datasets)
    engineered_features_df = engineered_features_preview(datasets)

    # Save all result CSVs
    overview_df.to_csv(OUTPUT_DIR / "dataset_overview.csv", index=False)
    col_profile_df.to_csv(OUTPUT_DIR / "column_profile.csv", index=False)
    missing_df.to_csv(OUTPUT_DIR / "missingness_report.csv", index=False)
    target_df.to_csv(OUTPUT_DIR / "target_balance.csv", index=False)
    schema_df.to_csv(OUTPUT_DIR / "dataset_comparison.csv", index=False)
    numeric_df.to_csv(OUTPUT_DIR / "numeric_summary_outliers.csv", index=False)
    quality_df.to_csv(OUTPUT_DIR / "data_quality_scores.csv", index=False)
    grouped_stats_df.to_csv(OUTPUT_DIR / "target_grouped_statistics.csv", index=False)
    corr_df.to_csv(OUTPUT_DIR / "feature_target_correlations.csv", index=False)
    variance_df.to_csv(OUTPUT_DIR / "feature_variance_analysis.csv", index=False)
    importance_df.to_csv(OUTPUT_DIR / "feature_importance_ranking.csv", index=False)
    distribution_df.to_csv(OUTPUT_DIR / "feature_distribution_comparison.csv", index=False)
    multicollinearity_df.to_csv(OUTPUT_DIR / "feature_multicollinearity.csv", index=False)
    engineered_features_df.to_csv(OUTPUT_DIR / "engineered_features_preview.csv", index=False)

    # Generate reports
    write_report(
        overview_df=overview_df,
        quality_df=quality_df,
        missing_df=missing_df,
        target_df=target_df,
        numeric_df=numeric_df,
        corr_df=corr_df,
        variance_df=variance_df,
        path=OUTPUT_DIR / "final_result.txt",
    )

    generate_engineering_recommendations(
        corr_df=corr_df,
        importance_df=importance_df,
        numeric_df=numeric_df,
        path=OUTPUT_DIR / "feature_engineering_recommendations.txt"
    )

    print("✓ Analysis completed. Outputs saved to:", OUTPUT_DIR)
    print(f"\nGenerated CSV files:")
    for csv_file in sorted(OUTPUT_DIR.glob("*.csv")):
        print(f"  - {csv_file.name}")
    print(f"\nGenerated Report Files:")
    for txt_file in sorted(OUTPUT_DIR.glob("*.txt")):
        print(f"  - {txt_file.name}")


if __name__ == "__main__":
    main()

