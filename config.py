# coding=utf-8
import logging
import os
import time
import json
from web.contrib.template import render_jinja

file = "logs/webpy.log" # 日志文件路径 #
logformat = "[%(asctime)s] %(filename)s:%(lineno)d(%(funcName)s): [%(levelname)s] %(message)s" # 日志格式 #
datefmt = "%Y-%m-%d %H:%M:%S" # 日志中显示的时间格式 #
loglevel = logging.DEBUG
interval = "d" # 每隔一天生成一个日志文件#
backups = 3 # 后台保留3个日志文件 #

app_root = os.path.dirname(__file__)
template_root = os.path.join(app_root,'template')
render = render_jinja(
	template_root,
	encoding = 'utf-8'
)
upload_path = os.path.join(app_root,'static/upload')

webConfig = json.loads(open(os.path.join(app_root,'package.json')).read())

# 时区
os.environ["TZ"] = "Asia/Shanghai"
time.tzset()

