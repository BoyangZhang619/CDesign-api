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
file_name = '../csv/1000row_diet_recommendations_dataset.csv'
target_col = 'Diet_Recommendation' # 设定你的结果列
n_rows_limit = 200 # 结果行数限制

# =========================================
# 2. 数据加载与预处理
# =========================================
print("📥 正在加载数据并进行预处理...")
df = pd.read_csv(file_name)

# 剔除无意义的标识列
if 'Patient_ID' in df.columns:
    df.drop('Patient_ID', axis=1, inplace=True)

# 识别列类型
cat_cols = df.select_dtypes(include=['object']).columns
num_cols = df.select_dtypes(include=[np.number]).columns

# 缺失值填充：类别用众数，数值用中位数
for col in cat_cols:
    if df[col].isnull().sum() > 0:
        df[col].fillna(df[col].mode()[0], inplace=True)
for col in num_cols:
    if df[col].isnull().sum() > 0:
        df[col].fillna(df[col].median(), inplace=True)

# =========================================
# 3. PCA 特征筛选 (降维逻辑)
# =========================================
print("🧠 正在进行 PCA 降维分析，筛选核心特征...")
# 对数值型特征进行标准化并执行 PCA
scaler = StandardScaler()
X_num_scaled = scaler.fit_transform(df[num_cols])

# 设定保留 95% 的信息量 (方差)
pca = PCA(n_components=0.95)
pca.fit(X_num_scaled)

# 获取对主成分贡献最大的原始特征，从而"限制无效列"
components = pd.DataFrame(pca.components_, columns=num_cols)
# 提取绝对值贡献最大的特征，去重
top_features_idx = components.abs().idxmax(axis=1).unique()
important_num_cols = [num_cols[i] for i in range(len(num_cols)) if num_cols[i] in top_features_idx]

print(f"✨ PCA 筛选出的核心数值特征: {important_num_cols}")

# =========================================
# 4. K-Means 高效数据压缩 (行压缩)
# =========================================
print(f"🗜️ 正在使用 K-Means 将数据压缩至 {n_rows_limit} 行...")
# 这里我们使用所有清洗后的特征进行聚类，以保证压缩后的样本能代表整体分布
# 为了 K-Means，我们需要对类别特征进行临时编码
df_temp_encoded = pd.get_dummies(df, drop_first=True)
scaler_all = StandardScaler()
X_all_scaled = scaler_all.fit_transform(df_temp_encoded)

kmeans = KMeans(n_clusters=n_rows_limit, random_state=42)
df['cluster'] = kmeans.fit_predict(X_all_scaled)

# =========================================
# 5. 生成最终压缩数据表
# =========================================
# 制定聚合策略：只保留 PCA 筛选出的核心数值特征和所有类别特征
agg_dict = {}
# 核心数值特征取该簇的均值
for col in num_cols:
    agg_dict[col] = 'mean'

# 类别特征（包含 Target）取该簇的众数（代表性属性）
for col in cat_cols:
    agg_dict[col] = lambda x: x.mode()[0]

compressed_df = df.groupby('cluster').agg(agg_dict).reset_index(drop=True)

# 仅保留被 PCA 认定为重要的数值特征，加上目标列和其他分类特征
# 这一步实现了"限制无效列"的要求
cols_to_keep = important_num_cols + list(cat_cols)
final_df = compressed_df[cols_to_keep]

# 保存文件
output_file = '../out/1000row_compressed_diet_recommendations.csv'
final_df.to_csv(output_file, index=False)
print(f"\n✅ 任务完成！压缩后的数据已保存至: {output_file}")
print(f"📊 最终数据形状: {final_df.shape}")




# import pandas as pd

# def inspect_health_dataset(file_path):
#     print("="*60)
#     print(f"📊 正在深度探勘数据集: {file_path}")
#     print("="*60)
    
#     try:
#         # 读取数据
#         df = pd.read_csv(file_path)
        
#         # [1] 基础维度
#         print(f"\n[1] 数据形状 (Shape)")
#         print(f"总行数: {df.shape[0]} | 总列数: {df.shape[1]}")
        
#         # [2] 列信息与缺失状态
#         print(f"\n[2] 列详细信息 (Dtypes & Missing Values)")
#         info_df = pd.DataFrame({
#             '数据类型 (Dtype)': df.dtypes,
#             '缺失值数量 (Null)': df.isnull().sum(),
#             '缺失率 (%)': (df.isnull().sum() / len(df) * 100).round(2)
#         })
#         print(info_df.to_string())
        
#         # [3] 数值型特征聚合统计
#         num_cols = df.select_dtypes(include=['number']).columns
#         if len(num_cols) > 0:
#             print(f"\n[3] 数值型特征聚合统计 (Summary Statistics)")
#             # 选取核心的统计指标进行展示
#             display_cols = ['count', 'mean', 'std', 'min', '50%', 'max']
#             print(df[num_cols].describe().T[display_cols].round(2).to_string())
#         else:
#             print("\n[3] 未检测到数值型特征。")
            
#         # [4] 分类型特征概览 (用于寻找潜在的 Target 或分组依据)
#         cat_cols = df.select_dtypes(exclude=['number']).columns
#         if len(cat_cols) > 0:
#             print(f"\n[4] 类别/非数值型特征概览 (Categorical Overview)")
#             for col in cat_cols:
#                 unique_count = df[col].nunique()
#                 unique_vals = df[col].dropna().unique()[:5] # 预览前5个唯一值
#                 print(f" - {col}: {unique_count} 个唯一值. 示例: {unique_vals}")
#         else:
#             print("\n[4] 未检测到类别型特征。")
            
#         print("\n" + "-"*60 + "\n")
        
#     except FileNotFoundError:
#         print(f"❌ 错误: 找不到文件 '{file_path}'，请检查路径。")
#     except Exception as e:
#         print(f"❌ 读取或分析文件时发生未知错误: {e}")

# # ==========================================
# # 🚀 运行示例：将下方路径替换为你的实际文件路径
# # ==========================================
# inspect_health_dataset('../csv/1000row_diet_recommendations_dataset.csv')
# inspect_health_dataset('../csv/100000row_health_lifestyle_dataset.csv')