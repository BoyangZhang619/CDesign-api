import pandas as pd
import numpy as np
from datetime import datetime
import warnings

# 忽略一些pandas的常规警告，保持控制台整洁
warnings.filterwarnings('ignore')

class SleepDataMiner:
    """
    睡眠数据深度分析类 (工业级复用版)
    功能：自动加载数据、切割对照组(有无咖啡因)、执行深度统计与相关性挖掘，并生成TXT报告。
    """
    def __init__(self, file_path, target_col='Sleep_Quality_Score'):
        self.file_path = file_path
        self.target_col = target_col
        self.df = None
        self.report_content = [] # 用于缓存最终写入 txt 的内容

    def load_data(self):
        """加载并校验数据"""
        try:
            self.df = pd.read_csv(self.file_path)
            self._log(f"✅ 数据加载成功: {self.file_path} | 总样本量: {self.df.shape[0]}")
        except Exception as e:
            self._log(f"❌ 数据加载失败: {e}")
            raise

    def split_by_caffeine(self, threshold=0):
        """
        核心逻辑：根据咖啡因摄入量将数据切分为两个对照组。
        默认 threshold=0，即 >0 为有咖啡因组，==0 为无咖啡因组。
        """
        if 'Caffeine_Intake_mg' not in self.df.columns:
            raise ValueError("数据中缺失核心字段: Caffeine_Intake_mg")

        group_caffeine = self.df[self.df['Caffeine_Intake_mg'] > threshold]
        group_no_caffeine = self.df[self.df['Caffeine_Intake_mg'] <= threshold]
        
        self._log(f"📊 分组完成: 有咖啡因组 ({len(group_caffeine)} 样本) VS 无咖啡因组 ({len(group_no_caffeine)} 样本)")
        return group_caffeine, group_no_caffeine

    def extract_deep_insights(self, data_subset, group_name):
        """对传入的数据子集进行深度特征提取和相关性分析"""
        self._log(f"\n{'='*20} [{group_name}] 深度数据分析 {'='*20}")
        
        if data_subset.empty:
            self._log("⚠️ 该组数据为空，跳过分析。")
            return
            
        # 1. 目标变量的客观分布
        target_mean = data_subset[self.target_col].mean()
        target_std = data_subset[self.target_col].std()
        self._log(f"➤ 目标指标 [{self.target_col}] 概况:")
        self._log(f"   - 均值: {target_mean:.2f} | 标准差: {target_std:.2f}")
        
        # 2. 特征相关性计算 (与睡眠质量的关联度)
        self._log(f"➤ 各特征对 [{self.target_col}] 的线性影响系数 (Pearson):")
        correlations = data_subset.corr()[self.target_col].drop(self.target_col).sort_values(ascending=False)
        
        # 提取正负相关Top3
        for feature, corr_val in correlations.items():
            strength = "强" if abs(corr_val) > 0.5 else ("中" if abs(corr_val) > 0.3 else "弱")
            direction = "正相关" if corr_val > 0 else "负相关"
            self._log(f"   - {feature:<25}: {corr_val:>6.2f} ({strength}{direction})")

        # 3. 核心统计学极值特征提取
        self._log("➤ 核心变量的客观表现 (均值/波动范围):")
        features_to_check = ['Stress_Level', 'Sleep_Duration_Hours', 'Heart_Rate_Variability']
        for col in features_to_check:
            if col in data_subset.columns:
                mean_val = data_subset[col].mean()
                min_val, max_val = data_subset[col].min(), data_subset[col].max()
                self._log(f"   - {col:<25}: 均值 {mean_val:.2f} [极值: {min_val:.1f} ~ {max_val:.1f}]")

    def _log(self, message):
        """内部日志方法，同时打印到控制台并缓存以写入文件"""
        print(message)
        self.report_content.append(message)

    def export_to_txt(self, output_filename=None):
        """将积累的分析结论打包输出为TXT"""
        if not output_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"Sleep_Analysis_Report_{timestamp}.txt"
            
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write("\n".join(self.report_content))
            
        print(f"\n💾 恭喜！深度分析报告已成功打包保存至: {output_filename}")

    def run_pipeline(self):
        """执行完整的数据挖掘与报告生成流水线"""
        self._log("🚀 启动数据分析流水线...")
        self.load_data()
        
        # 将数据分为有无咖啡因两大类
        group_caf, group_none_caf = self.split_by_caffeine()
        
        # 分别对两大类进行深度切片分析
        self.extract_deep_insights(group_caf, "【实验组】摄入咖啡因人群 (>0mg)")
        self.extract_deep_insights(group_none_caf, "【对照组】零咖啡因人群 (0mg)")
        
        # 输出最终报告
        self.export_to_txt()


# ==========================================
# 🚀 实例化调用与执行 (复用入口)
# ==========================================
if __name__ == "__main__":
    # 你只需要修改这里的文件名
    DATA_FILE = './csv/wearable_tech_sleep_quality.csv'  

    # 实例化大类并执行流水线
    miner = SleepDataMiner(file_path=DATA_FILE)
    miner.run_pipeline()