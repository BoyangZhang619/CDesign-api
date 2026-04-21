import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import os

# ==========================================
# 1. 数据加载与基础信息设置
# ==========================================
# 请将 'your_sleep_data.csv' 替换为你实际的文件路径
file_path = 'csv/wearable_tech_sleep_quality.csv' 

# 设定我们在分析中关注的特征列
columns_of_interest = [
    'Heart_Rate_Variability', 'Body_Temperature', 'Movement_During_Sleep',
    'Sleep_Duration_Hours', 'Sleep_Quality_Score', 'Caffeine_Intake_mg',
    'Stress_Level', 'Bedtime_Consistency', 'Light_Exposure_hours'
]

# 读取CSV数据
try:
    df = pd.read_csv(os.path.join(os.path.dirname(__file__), file_path))
    print("✅ 数据加载成功！\n")
except FileNotFoundError:
    print(f"❌ 找不到文件，请检查路径: {os.path.join(os.path.dirname(__file__), file_path)}")
    exit()

# 如果原始数据包含其他列，我们只提取需要的列进行分析
df = df[columns_of_interest]

# 设置可视化的默认风格（可选）
sns.set_theme(style="whitegrid")
plt.rcParams['font.sans-serif'] = ['SimHei'] # 用来正常显示中文标签（如果你用的是Windows）
plt.rcParams['axes.unicode_minus'] = False   # 用来正常显示负号

# ==========================================
# 2. 基础数据结构与缺失值检查
# ==========================================
print("-" * 50)
print("【1】数据维度与基础信息")
print("-" * 50)
print(f"数据总行数 (样本数): {df.shape[0]}")
print(f"数据总列数 (特征数): {df.shape[1]}\n")

print("各列缺失值统计:")
missing_data = df.isnull().sum()
print(missing_data[missing_data > 0] if missing_data.sum() > 0 else "完美！没有任何缺失值。")
print("\n")

# ==========================================
# 3. 详细的数值统计（分布、极值）
# ==========================================
print("-" * 50)
print("【2】核心描述性统计指标")
print("-" * 50)
# 描述性统计包含：均值、标准差、最小值、25%分位数、中位数(50%)、75%分位数、最大值
desc_stats = df.describe().T

# 添加偏度(Skewness)和峰度(Kurtosis)以观察分布形态
# 偏度衡量分布的不对称性，峰度衡量尾部的厚度
desc_stats['偏度 (Skewness)'] = df.skew()
desc_stats['峰度 (Kurtosis)'] = df.kurt()

# 格式化输出，保留两位小数
print(desc_stats.round(2).to_string())
print("\n")

# ==========================================
# 4. 异常值/极值检测 (基于IQR原则)
# ==========================================
print("-" * 50)
print("【3】极值与潜在异常值检测 (基于1.5 * IQR)")
print("-" * 50)
for col in df.columns:
    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    
    outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)][col]
    if not outliers.empty:
        print(f"[{col}] 检测到 {len(outliers)} 个潜在异常值。极值范围: ({outliers.min():.2f} ~ {outliers.max():.2f})")
    else:
        print(f"[{col}] 未检测到明显异常值。")
print("\n")

# ==========================================
# 5. 相关性矩阵分析
# ==========================================
print("-" * 50)
print("【4】特征相关性矩阵 (Pearson)")
print("-" * 50)
corr_matrix = df.corr()
print(corr_matrix.round(2).to_string())
print("\n")

# ==========================================
# 6. 数据可视化分布图 (直方图 & 箱线图)
# ==========================================
print("正在生成可视化图表...")

# 创建一个大图布，绘制所有变量的直方图（看分布）和箱线图（看极值）
fig, axes = plt.subplots(nrows=len(columns_of_interest), ncols=2, figsize=(12, 4 * len(columns_of_interest)))

for i, col in enumerate(columns_of_interest):
    # 绘制直方图（附带KDE核密度估计曲线）
    sns.histplot(df[col], kde=True, ax=axes[i, 0], color='skyblue')
    axes[i, 0].set_title(f'{col} - 分布(Histogram)', fontsize=12)
    axes[i, 0].set_ylabel('频数')
    
    # 绘制箱线图
    sns.boxplot(x=df[col], ax=axes[i, 1], color='lightgreen')
    axes[i, 1].set_title(f'{col} - 箱线图(Boxplot)', fontsize=12)

plt.tight_layout()
plt.savefig('sleep_data_distributions.png', dpi=300)
print("✅ 分布与极值可视化已保存为 'sleep_data_distributions.png'")

# 绘制相关性热力图
plt.figure(figsize=(10, 8))
sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap='coolwarm', vmin=-1, vmax=1, square=True)
plt.title('睡眠数据特征相关性热力图', fontsize=16)
plt.tight_layout()
plt.savefig('sleep_data_correlation.png', dpi=300)
print("✅ 相关性热力图已保存为 'sleep_data_correlation.png'")

print("基础数据探索完毕！")