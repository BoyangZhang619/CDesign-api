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
file_name = '../csv/100000row_health_lifestyle_dataset.csv'
target_col = 'disease_risk' # 核心结果列
n_rows_limit = 200 # 目标压缩行数

# =========================================
# 2. 数据加载与预处理
# =========================================
print("📥 正在加载十万级生活方式数据...")
df = pd.read_csv(file_name)

# 坚决剔除无意义的自增 id 列，否则会严重干扰 PCA 和聚类
if 'id' in df.columns:
    df.drop('id', axis=1, inplace=True)

# 划分列类型
cat_cols = df.select_dtypes(include=['object']).columns
num_cols = df.select_dtypes(include=[np.number]).columns

# =========================================
# 3. PCA 特征筛选 (降维逻辑)
# =========================================
print("🧠 正在进行 PCA 降维分析，剔除冗余变量...")
scaler = StandardScaler()
X_num_scaled = scaler.fit_transform(df[num_cols])

# 设定保留 95% 的信息量
pca = PCA(n_components=0.95)
pca.fit(X_num_scaled)

components = pd.DataFrame(pca.components_, columns=num_cols)
top_features_idx = components.abs().idxmax(axis=1).unique()
important_num_cols = [num_cols[i] for i in range(len(num_cols)) if num_cols[i] in top_features_idx]

print(f"✨ PCA 筛选出的核心数值特征: {important_num_cols}")

# =========================================
# 4. K-Means 高效数据压缩 (100,000 -> 200)
# =========================================
print(f"🗜️ 正在使用 K-Means 将数据压缩至 {n_rows_limit} 行 (十万级运算可能需要几秒钟)...")

# One-hot 编码以便聚类
df_temp_encoded = pd.get_dummies(df, drop_first=True)
scaler_all = StandardScaler()
X_all_scaled = scaler_all.fit_transform(df_temp_encoded)

kmeans = KMeans(n_clusters=n_rows_limit, random_state=42)
df['cluster'] = kmeans.fit_predict(X_all_scaled)

# =========================================
# 5. 生成最终压缩数据表
# =========================================
agg_dict = {}
for col in num_cols:
    if col == target_col:
        # 对于 disease_risk，取均值能反映这个“聚类代表”的患病概率 (例如 0.8 表示高危聚类)
        agg_dict[col] = 'mean'
    elif col in ['smoker', 'alcohol', 'family_history']:
        # 二分类特征取均值可以体现浓度
        agg_dict[col] = 'mean'
    else:
        agg_dict[col] = 'mean'

for col in cat_cols:
    agg_dict[col] = lambda x: x.mode()[0]

compressed_df = df.groupby('cluster').agg(agg_dict).reset_index(drop=True)

# 组装最终需要保留的列 (PCA重要特征 + 类别特征 + Target)
cols_to_keep = important_num_cols + list(cat_cols)
if target_col not in cols_to_keep:
    cols_to_keep.append(target_col)

# 确保列名不重复且维持原有顺序
cols_to_keep = list(dict.fromkeys(cols_to_keep))
final_df = compressed_df[cols_to_keep]

# 保存文件
output_file = '../out/100000row_compressed_health_lifestyle.csv'
final_df.to_csv(output_file, index=False)
print(f"\n✅ 任务完成！极致压缩后的数据已保存至: {output_file}")
print(f"📊 最终数据形状: {final_df.shape}")