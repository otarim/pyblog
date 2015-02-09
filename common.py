# coding=utf-8

import web
import hashlib
import cgi
from sign import sign
from config import upload_path,app_root

cgi.maxlen = 2 * 1024 * 1024 #文件大小限制，需要 try except

def transformPosts(posts,artists):
	for i in posts:
		i['artist'] = artists[str(i['artist'])]
	return posts

def listToHashByArtists(list):
	hash = {}
	for i in list:
		hash[str(i['_id'])] = i
	return hash

#检测登录
def checkLogin():
	user = web.cookies().get('pyname')
	connect = web.cookies().get('pyconnect')
	if user and connect:
		return connect == sign(user)
	else:
		return False

# 上传
def upload(file,path='/'):
	filename = file.filename.replace('\\','/').split('/')[-1]
	fout = open(upload_path+path+filename,'w')
	fout.write(file.file.read())
	fout.close()
	return '/static/upload'+path+filename