import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import os
import numpy as np

cur_path = os.path.dirname(os.path.abspath(__file__))

# 1. 加载数据
df = pd.read_csv(os.path.join(cur_path, './csv/wearable_tech_sleep_quality.csv'))

# 2. 数据标准化 (非常重要！)
scaler = StandardScaler()
scaled_data = scaler.fit_transform(df)
print(scaled_data[:20])

# 3. 使用肘部法（Elbow Method）找最佳聚类数 K
xLimit = 20
wcss = []
for i in range(1, xLimit + 1):
    kmeans = KMeans(n_clusters=i, init='k-means++')
    kmeans.fit(scaled_data)
    wcss.append(kmeans.inertia_)
    
diff = np.gradient(wcss)
# 可视化肘部图
plt.plot(range(1, xLimit + 1), wcss)
plt.plot(range(1, xLimit + 1), diff, marker='o', label='Gradient of Within-Cluster Sum of Squares')
plt.axvline(x=3, color='r', linestyle='--', label='Elbow Point')
plt.title('Elbow Method')
plt.xlabel('Number of clusters')
plt.ylabel('Within-Cluster Sum of Squares')
plt.savefig(os.path.join(cur_path, './img/elbow_method.png'))

# 4. 假设选定 K=3 进行聚类
kmeans = KMeans(n_clusters=3)
df['Cluster'] = kmeans.fit_predict(scaled_data)

# 5. 查看各组特征均值，分析每一类人的特点
print("\n各聚类群组特征均值:")
feature_means = df.groupby('Cluster').mean()
print(feature_means)
pd.DataFrame(feature_means).to_csv(os.path.join(cur_path, './csv/cluster_feature_means.csv'))