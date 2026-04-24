import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
import warnings
warnings.filterwarnings('ignore')

# =========================================
# 1. 配置参数
# =========================================
file_name = '../csv/36500row_Fitness_Health_Tracking_Dataset_with_Missing_Values.xlsx'
target_col_cat = 'Mood'         # 类别型目标
target_col_num = 'Stress_Level (1-10)' # 数值型目标
n_rows_limit = 200

# =========================================
# 2. 数据加载与高级清洗
# =========================================
print("📥 正在加载 36500 行综合运动与健康数据 (可能需要稍等片刻)...")
df = pd.read_excel(file_name)

# 剔除噪音列：ID、姓名。Date列在宏观聚类中暂不使用
cols_to_drop = ['User_ID', 'Full Name', 'Date']
df.drop(columns=[col for col in cols_to_drop if col in df.columns], inplace=True)

# 划分列类型
cat_cols = df.select_dtypes(include=['object']).columns.tolist()
num_cols = df.select_dtypes(include=[np.number]).columns.tolist()

print("🧹 正在处理缺失值...")
# 数值型缺失值：使用中位数填充（抗局部极端值干扰）
for col in num_cols:
    if df[col].isnull().sum() > 0:
        df[col].fillna(df[col].median(), inplace=True)

# 类别型缺失值：填充为 'Unknown' (这也是一种特征)
for col in cat_cols:
    if df[col].isnull().sum() > 0:
        df[col].fillna('Unknown', inplace=True)

# =========================================
# 3. PCA 特征筛选 (针对数值型)
# =========================================
print("🧠 正在进行 PCA 降维分析...")
scaler = StandardScaler()
X_num_scaled = scaler.fit_transform(df[num_cols])

pca = PCA(n_components=0.95)
pca.fit(X_num_scaled)

components = pd.DataFrame(pca.components_, columns=num_cols)
top_features_idx = components.abs().idxmax(axis=1).unique()
important_num_cols = [num_cols[i] for i in range(len(num_cols)) if num_cols[i] in top_features_idx]
print(f"✨ PCA 筛选出的核心生理特征: {important_num_cols}")

# =========================================
# 4. K-Means 数据压缩 (36500 -> 200)
# =========================================
print(f"🗜️ 正在执行 K-Means 聚类压缩至 {n_rows_limit} 行...")
df_temp_encoded = pd.get_dummies(df, drop_first=True)
scaler_all = StandardScaler()
X_all_scaled = scaler_all.fit_transform(df_temp_encoded)

kmeans = KMeans(n_clusters=n_rows_limit, random_state=42)
df['cluster'] = kmeans.fit_predict(X_all_scaled)

# =========================================
# 5. 生成高保真压缩表
# =========================================
agg_dict = {}
for col in num_cols:
    agg_dict[col] = 'mean'
for col in cat_cols:
    agg_dict[col] = lambda x: x.mode()[0]

compressed_df = df.groupby('cluster').agg(agg_dict).reset_index(drop=True)

# 保留 PCA 核心特征与全部分类特征
cols_to_keep = important_num_cols + cat_cols
# 确保目标列不丢失
if target_col_num not in cols_to_keep: cols_to_keep.append(target_col_num)

cols_to_keep = list(dict.fromkeys(cols_to_keep))
final_df = compressed_df[cols_to_keep]

# 保存文件
output_file = '36500row_compressed_fitness_health.csv'
final_df.to_csv(output_file, index=False)
print(f"\n✅ 任务完成！数据已保存至: {output_file}")