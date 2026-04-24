
import pandas as pd

def inspect_health_dataset(file_path):
    print("="*60)
    print(f"📊 正在深度探勘数据集: {file_path}")
    print("="*60)
    
    try:
        # 读取数据
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        # [1] 基础维度
        print(f"\n[1] 数据形状 (Shape)")
        print(f"总行数: {df.shape[0]} | 总列数: {df.shape[1]}")
        
        # [2] 列信息与缺失状态
        print(f"\n[2] 列详细信息 (Dtypes & Missing Values)")
        info_df = pd.DataFrame({
            '数据类型 (Dtype)': df.dtypes,
            '缺失值数量 (Null)': df.isnull().sum(),
            '缺失率 (%)': (df.isnull().sum() / len(df) * 100).round(2)
        })
        print(info_df.to_string())
        
        # [3] 数值型特征聚合统计
        num_cols = df.select_dtypes(include=['number']).columns
        if len(num_cols) > 0:
            print(f"\n[3] 数值型特征聚合统计 (Summary Statistics)")
            # 选取核心的统计指标进行展示
            display_cols = ['count', 'mean', 'std', 'min', '50%', 'max']
            print(df[num_cols].describe().T[display_cols].round(2).to_string())
        else:
            print("\n[3] 未检测到数值型特征。")
            
        # [4] 分类型特征概览 (用于寻找潜在的 Target 或分组依据)
        cat_cols = df.select_dtypes(exclude=['number']).columns
        if len(cat_cols) > 0:
            print(f"\n[4] 类别/非数值型特征概览 (Categorical Overview)")
            for col in cat_cols:
                unique_count = df[col].nunique()
                unique_vals = df[col].dropna().unique()[:5] # 预览前5个唯一值
                print(f" - {col}: {unique_count} 个唯一值. 示例: {unique_vals}")
        else:
            print("\n[4] 未检测到类别型特征。")
            
        print("\n" + "-"*60 + "\n")
        
    except FileNotFoundError:
        print(f"❌ 错误: 找不到文件 '{file_path}'，请检查路径。")
    except Exception as e:
        print(f"❌ 读取或分析文件时发生未知错误: {e}")

# ==========================================
# 🚀 运行示例：将下方路径替换为你的实际文件路径
# ==========================================
inspect_health_dataset('../csv/1000row_gym_members_exercise_tracking.csv')
inspect_health_dataset('../csv/1800row_gym_members_exercise_tracking_synthetic_data.csv')
inspect_health_dataset('../csv/36500row_Fitness_Health_Tracking_Dataset_with_Missing_Values.xlsx')