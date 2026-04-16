#!/usr/bin/env python
# -*- coding: utf-8 -*-
import sys
import os

# 将当前目录添加到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 确保中文输出正常
os.environ['PYTHONIOENCODING'] = 'utf-8'

# 导入主分析脚本
import subprocess
result = subprocess.run([sys.executable, 'main.py'], cwd=os.path.dirname(os.path.abspath(__file__)))
sys.exit(result.returncode)

