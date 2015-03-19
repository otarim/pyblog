# coding=utf-8
import logging
import os
import time
import json
from web.contrib.template import render_jinja

file = "logs/webpy.log" # ��־�ļ�·�� #
logformat = "[%(asctime)s] %(filename)s:%(lineno)d(%(funcName)s): [%(levelname)s] %(message)s" # ��־��ʽ #
datefmt = "%Y-%m-%d %H:%M:%S" # ��־����ʾ��ʱ���ʽ #
loglevel = logging.DEBUG
interval = "d" # ÿ��һ������һ����־�ļ�#
backups = 3 # ��̨����3����־�ļ� #

app_root = os.path.dirname(__file__)
template_root = os.path.join(app_root,'template')
render = render_jinja(
	template_root,
	encoding = 'utf-8'
)
upload_path = os.path.join(app_root,'static/upload')

webConfig = json.loads(open(os.path.join(app_root,'package.json')).read())

# ʱ��
os.environ["TZ"] = "Asia/Shanghai"
time.tzset()

