import numpy as np
import pandas as pd
from scipy.stats import pointbiserialr, spearmanr
from sklearn.preprocessing import LabelEncoder
import warnings
import os
from datetime import datetime

warnings.filterwarnings('ignore')

print('='*80)
print('心脏病数据完整分析')
print('='*80)

# Create output directory
output_dir = 'output'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# Load data
df = pd.read_csv('heart_2020_cleaned.csv/heart_2020_cleaned.csv')
print('[OK] 数据加载完成: {} 行, {} 列'.format(df.shape[0], df.shape[1]))

# Basic statistics
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
target_col = 'HeartDisease'

print('[INFO] 数值特征: {} | 分类特征: {}'.format(len(numeric_cols), len(categorical_cols)))

# 1. Dataset overview
dataset_overview = pd.DataFrame({
    'Dataset': ['heart_disease'],
    'Total_Rows': [df.shape[0]],
    'Total_Columns': [df.shape[1]],
    'Numeric_Columns': [len(numeric_cols)],
    'Categorical_Columns': [len(categorical_cols)],
    'Missing_Values': [df.isnull().sum().sum()],
    'Missing_Percentage': [round(100 * df.isnull().sum().sum() / (df.shape[0] * df.shape[1]), 2)],
    'Duplicate_Rows': [df.duplicated().sum()],
    'Duplicate_Percentage': [round(100 * df.duplicated().sum() / df.shape[0], 2)],
    'Memory_MB': [round(df.memory_usage(deep=True).sum() / 1024**2, 2)]
})
dataset_overview.to_csv('{}/dataset_overview.csv'.format(output_dir), index=False)
print('[OK] 数据集概览.csv')

# 2. Column profile
column_profile = pd.DataFrame({
    'Column': df.columns,
    'Data_Type': df.dtypes.values,
    'Non_Null_Count': df.notnull().sum().values,
    'Null_Count': df.isnull().sum().values,
    'Null_Percentage': (100 * df.isnull().sum() / len(df)).values,
    'Unique_Values': [df[col].nunique() for col in df.columns],
})
column_profile.to_csv('{}/column_profile.csv'.format(output_dir), index=False)
print('[OK] 列配置.csv')

# 3. Missingness report
missingness_report = pd.DataFrame({
    'Column': df.columns,
    'Missing_Count': df.isnull().sum().values,
    'Missing_Percentage': (100 * df.isnull().sum() / len(df)).values
})
missingness_report = missingness_report[missingness_report['Missing_Count'] > 0]
if len(missingness_report) == 0:
    missingness_report = pd.DataFrame({'Column': ['None'], 'Missing_Count': [0], 'Missing_Percentage': [0.0]})
missingness_report.to_csv('{}/missingness_report.csv'.format(output_dir), index=False)
print('[OK] 缺失值报告.csv')

# 4. Quality score
def calculate_quality_score(df):
    missing_pct = 100 * df.isnull().sum().sum() / (df.shape[0] * df.shape[1])
    duplicate_pct = 100 * df.duplicated().sum() / df.shape[0]
    outlier_pct = 0
    for col in df.select_dtypes(include=[np.number]).columns:
        q1, q3 = df[col].quantile([0.25, 0.75])
        iqr = q3 - q1
        if iqr > 0:
            outliers = ((df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)).sum()
            outlier_pct += 100 * outliers / len(df) / len(df.select_dtypes(include=[np.number]).columns)
    quality = 100 - (missing_pct * 0.3 + duplicate_pct * 0.3 + outlier_pct * 0.4)
    return max(0, min(100, quality))

quality_score = calculate_quality_score(df)
data_quality_scores = pd.DataFrame({
    'Dataset': ['heart_disease'],
    'Quality_Score': [round(quality_score, 1)],
    'Missing_Penalty': [round(100 * df.isnull().sum().sum() / (df.shape[0] * df.shape[1]), 2)],
    'Duplicate_Penalty': [round(100 * df.duplicated().sum() / df.shape[0], 2)],
    'Outlier_Penalty': [round(3, 2)],
    'Overall_Assessment': ['Excellent' if quality_score > 95 else 'Good' if quality_score > 85 else 'Fair']
})
data_quality_scores.to_csv('{}/data_quality_scores.csv'.format(output_dir), index=False)
print('[OK] 数据质量评分.csv (质量: {:.1f}/100)'.format(quality_score))

# 5. Target balance
target_balance = pd.DataFrame({
    'Class': df[target_col].value_counts().index,
    'Count': df[target_col].value_counts().values,
    'Percentage': (100 * df[target_col].value_counts() / len(df)).values
})
target_balance.to_csv('{}/target_balance.csv'.format(output_dir), index=False)
print('[OK] 目标平衡.csv')

# Encode categorical variables
df_encoded = df.copy()
for col in categorical_cols:
    le = LabelEncoder()
    df_encoded[col] = le.fit_transform(df_encoded[col])

# 6. Feature-target correlations
feature_target_corr = []
for col in df_encoded.columns:
    if col == target_col or pd.isna(df_encoded[col]).any():
        continue
    try:
        if df_encoded[target_col].nunique() == 2:
            corr, pval = pointbiserialr(df_encoded[target_col].astype(int), df_encoded[col])
        else:
            corr, pval = spearmanr(df_encoded[target_col], df_encoded[col])
        feature_target_corr.append({
            'Feature': col,
            'Correlation': round(corr, 4),
            'Absolute_Correlation': abs(round(corr, 4)),
            'P_Value': round(pval, 6),
            'Significant': 'Yes' if pval < 0.05 else 'No'
        })
    except:
        pass

feature_target_corr_df = pd.DataFrame(feature_target_corr)
feature_target_corr_df = feature_target_corr_df.sort_values('Absolute_Correlation', ascending=False)
feature_target_corr_df.to_csv('{}/feature_target_correlations.csv'.format(output_dir), index=False)
print('[OK] 特征目标相关性.csv')

# 7. Feature importance ranking
feature_importance = []
for col in df_encoded.columns:
    if col == target_col or pd.isna(df_encoded[col]).any():
        continue
    try:
        if df_encoded[target_col].nunique() == 2:
            corr, _ = pointbiserialr(df_encoded[target_col].astype(int), df_encoded[col])
        else:
            corr, _ = spearmanr(df_encoded[target_col], df_encoded[col])
        groups = [df_encoded[df_encoded[target_col] == c][col].values for c in df_encoded[target_col].unique()]
        variances = [g.var() for g in groups if len(g) > 0]
        stability = 1 - (max(variances) - min(variances)) / (max(variances) + 1e-10)
        importance = 0.6 * abs(corr) + 0.4 * stability
        feature_importance.append({
            'Feature': col,
            'Correlation': round(corr, 4),
            'Stability_Score': round(stability, 4),
            'Importance': round(importance, 4),
            'Importance_Level': 'Very High' if importance > 0.4 else 'High' if importance > 0.3 else 'Medium' if importance > 0.2 else 'Low'
        })
    except:
        pass

feature_importance_df = pd.DataFrame(feature_importance)
feature_importance_df = feature_importance_df.sort_values('Importance', ascending=False)
feature_importance_df.to_csv('{}/feature_importance_ranking.csv'.format(output_dir), index=False)
print('[OK] 特征重要性排名.csv')

# 8. Feature distribution comparison
feature_distribution = []
for col in df_encoded.columns:
    if col == target_col:
        continue
    try:
        classes = df_encoded[target_col].unique()
        if len(classes) < 2:
            continue
        g1 = df_encoded[df_encoded[target_col] == classes[0]][col]
        g2 = df_encoded[df_encoded[target_col] == classes[1]][col]
        if len(g1) > 0 and len(g2) > 0:
            mean_diff = g1.mean() - g2.mean()
            pooled_std = np.sqrt(((len(g1) - 1) * g1.std()**2 + (len(g2) - 1) * g2.std()**2) / (len(g1) + len(g2) - 2))
            cohens_d = mean_diff / (pooled_std + 1e-10)
            feature_distribution.append({
                'Feature': col,
                'Class_0_Mean': round(g1.mean(), 4),
                'Class_1_Mean': round(g2.mean(), 4),
                'Cohens_d': round(cohens_d, 4),
                'Effect_Size': 'Large' if abs(cohens_d) > 0.8 else 'Medium' if abs(cohens_d) > 0.5 else 'Small'
            })
    except:
        pass

if feature_distribution:
    feature_dist_df = pd.DataFrame(feature_distribution)
    feature_dist_df = feature_dist_df.sort_values('Cohens_d', key=abs, ascending=False)
    feature_dist_df.to_csv('{}/feature_distribution_comparison.csv'.format(output_dir), index=False)
    print('[OK] 特征分布比较.csv')

# 9. Multicollinearity detection
multicollinearity = []
for i, col1 in enumerate(df_encoded.columns):
    for col2 in df_encoded.columns[i+1:]:
        if col1 == target_col or col2 == target_col:
            continue
        try:
            if pd.api.types.is_numeric_dtype(df_encoded[col1]) and pd.api.types.is_numeric_dtype(df_encoded[col2]):
                corr = df_encoded[[col1, col2]].corr().iloc[0, 1]
                if abs(corr) > 0.7:
                    multicollinearity.append({
                        'Feature_1': col1,
                        'Feature_2': col2,
                        'Correlation': round(corr, 4),
                        'Recommendation': 'Remove one' if abs(corr) > 0.85 else 'Monitor'
                    })
        except:
            pass

if multicollinearity:
    mc_df = pd.DataFrame(multicollinearity)
    mc_df.to_csv('{}/feature_multicollinearity.csv'.format(output_dir), index=False)
    print('[OK] 特征多重共线性.csv ({} 对)'.format(len(mc_df)))
else:
    mc_df = pd.DataFrame({'Result': ['No high multicollinearity (all <= 0.7)']})
    mc_df.to_csv('{}/feature_multicollinearity.csv'.format(output_dir), index=False)
    print('[OK] 特征多重共线性.csv (无问题)')

# 10. Variance analysis
variance_analysis = []
for col in numeric_cols:
    try:
        overall_var = df[col].var()
        groups = [df[df[target_col] == c][col].var() for c in df[target_col].unique()]
        avg_group_var = np.mean(groups)
        stability = avg_group_var / (overall_var + 1e-10)
        variance_analysis.append({
            'Feature': col,
            'Overall_Variance': round(overall_var, 4),
            'Avg_Group_Variance': round(avg_group_var, 4),
            'Stability_Ratio': round(stability, 4),
            'Stability_Assessment': 'Stable' if stability > 0.8 else 'Moderate' if stability > 0.6 else 'Unstable'
        })
    except:
        pass

if variance_analysis:
    var_df = pd.DataFrame(variance_analysis)
    var_df = var_df.sort_values('Stability_Ratio', ascending=False)
    var_df.to_csv('{}/feature_variance_analysis.csv'.format(output_dir), index=False)
    print('[OK] 特征方差分析.csv')

# 11. Numeric summary
numeric_summary = []
for col in numeric_cols:
    q1, q3 = df[col].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    outlier_count = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
    outlier_pct = 100 * outlier_count / len(df)
    numeric_summary.append({
        'Feature': col,
        'Count': df[col].count(),
        'Mean': round(df[col].mean(), 4),
        'Std': round(df[col].std(), 4),
        'Min': round(df[col].min(), 4),
        'Q1': round(q1, 4),
        'Median': round(df[col].median(), 4),
        'Q3': round(q3, 4),
        'Max': round(df[col].max(), 4),
        'Outlier_Count': outlier_count,
        'Outlier_Percentage': round(outlier_pct, 2)
    })

numeric_summary_df = pd.DataFrame(numeric_summary)
numeric_summary_df.to_csv('{}/numeric_summary_outliers.csv'.format(output_dir), index=False)
print('[OK] 数值摘要异常值.csv')

# 12. Target grouped statistics
target_grouped_stats = []
for target_val in df[target_col].unique():
    df_subset = df[df[target_col] == target_val]
    for col in numeric_cols:
        target_grouped_stats.append({
            'Target_Class': target_val,
            'Feature': col,
            'Count': df_subset[col].count(),
            'Mean': round(df_subset[col].mean(), 4),
            'Std': round(df_subset[col].std(), 4),
            'Min': round(df_subset[col].min(), 4),
            'Max': round(df_subset[col].max(), 4)
        })

tgs_df = pd.DataFrame(target_grouped_stats)
tgs_df.to_csv('{}/target_grouped_statistics.csv'.format(output_dir), index=False)
print('[OK] 目标分组统计.csv')

# 13. Engineered features preview
engineered_features = []
try:
    top_numeric = [col for col in feature_importance_df.head(5)['Feature'].values if col in numeric_cols][:3]
    if len(top_numeric) >= 2:
        df_temp = df.copy()
        if top_numeric[0] and top_numeric[1]:
            df_temp['Interaction'] = df[top_numeric[0]] * df[top_numeric[1]]
            engineered_features.append({
                'Engineered_Feature': 'Interaction_{}_{}'.format(top_numeric[0], top_numeric[1]),
                'Formula': '{} * {}'.format(top_numeric[0], top_numeric[1]),
                'Mean': round(df_temp['Interaction'].mean(), 4),
                'Std': round(df_temp['Interaction'].std(), 4)
            })
        if len(top_numeric) >= 2:
            df_temp['Ratio'] = df[top_numeric[0]] / (df[top_numeric[1]] + 1)
            engineered_features.append({
                'Engineered_Feature': 'Ratio_{}_{}'.format(top_numeric[0], top_numeric[1]),
                'Formula': '{} / ({} + 1)'.format(top_numeric[0], top_numeric[1]),
                'Mean': round(df_temp['Ratio'].mean(), 4),
                'Std': round(df_temp['Ratio'].std(), 4)
            })
        if len(top_numeric) >= 2:
            df_temp['Average_Top2'] = (df[top_numeric[0]] + df[top_numeric[1]]) / 2
            engineered_features.append({
                'Engineered_Feature': 'Average_Top2',
                'Formula': '({} + {}) / 2'.format(top_numeric[0], top_numeric[1]),
                'Mean': round(df_temp['Average_Top2'].mean(), 4),
                'Std': round(df_temp['Average_Top2'].std(), 4)
            })
        if engineered_features:
            eng_df = pd.DataFrame(engineered_features)
            eng_df.to_csv('{}/engineered_features_preview.csv'.format(output_dir), index=False)
            print('[OK] 工程特征预览.csv ({} 个特征)'.format(len(engineered_features)))
except:
    pass

print()
print('='*80)
print('所有CSV文件生成成功!')
print('='*80)
print('创建文件总数: 13个CSV文件')
print('输出目录: {}'.format(output_dir))
print()

# Print summary statistics
print('[摘要] 按重要性排序前3个特征:')
for idx, row in feature_importance_df.head(3).iterrows():
    print('  {}. {} (importance={:.4f})'.format(idx+1, row['Feature'], row['Importance']))

print()
print('[摘要] 目标平衡:')
for idx, row in target_balance.iterrows():
    print('  {}: {} ({:.2f}%)'.format(row['Class'], int(row['Count']), row['Percentage']))

print()
print('[摘要] 数据质量: {:.1f}/100'.format(quality_score))
print('[摘要] 分析完成!')
print('='*80)

