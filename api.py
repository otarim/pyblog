# coding=utf-8

import web
import hashlib
import time
import json
import cgi
# import urllib
from markdown import markdown
from sign import sign
from config import render,upload_path,app_root
from conn import client
from bson.objectid import ObjectId
from common import *
from types import *

db = client.pyblog

urls = (
	'/post','post',
	'/post/del', 'deletePost'
)

class post:
	def GET(self):
		query = web.input(pageNum=10,page=1)
		artists = []
		posts = list(db['posts'].find().sort('postDate',-1).skip((int(query.page) - 1) * int(query.pageNum)).limit(int(query.pageNum)))
		for i in posts:
			i['_id'] = str(i['_id'])
			artists.append(i['artist'])
		artists = list(db['users'].find({'_id': {'$in': artists}}))
		for i in artists:
			del(i['password'])
			del(i['loginIp'])
			del(i['lastLoginTime'])
			i['_id'] = str(i['_id'])
		web.header('Content-Type','application/json')
		return json.dumps({
			'code': 200,
			'page': int(query.page),
			'pageNum': int(query.pageNum),
			'total': db['posts'].find().sort('postDate',-1).count(), #二次查询？
			'result': transformPosts(posts,listToHashByArtists(artists))
		})
	def POST(self):
		if checkLogin():
			data = web.input(file={},tags=[]) # 这什么鬼？！！！！！ 无 file={}报错。。擦
			fileurl = None
			if type(data.file) is not StringType:
				try:
					fileurl = upload(data.file)
				except:
					return '文件大小异常'
			id = db['users'].find_one({'username': web.cookies().get('pyname')}).get('_id')
			# print data.keys
			# 处理 media
			# inert([])
			post = db['posts'].insert({
				'artist': id,
				'title': web.net.websafe(data.title),
				'content': web.net.websafe(data.content),
				'media': fileurl,
				'postDate': time.time(),
				'tags': ','.join(data['tags'])
			})
			web.header('Content-Type','application/json')
			return json.dumps({'code':200,'result': {
				'id': str(post),
				'artist': str(id),
				'title': web.net.websafe(data.title),
				'content': markdown(web.net.websafe(data.content)),
				'media': fileurl,
				'tags': ','.join(data['tags'])
			}})
		else:
			return '你他妈还没登陆啊'
	def PUT(self):
		if checkLogin():
			data = web.input(file={},tags=[])
			mediaChanged = data.mediaChanged
			setValue = {
				'title': web.net.websafe(data.title),
				'content': web.net.websafe(data.content),
				'tags': ','.join(data['tags']),
				'lastModify': time.time()
			}
			if mediaChanged == 'true':
				if type(data.file) is not StringType:
					try:
						setValue['media'] = upload(data.file)
					except:
						return json.dumps({
							'code': 500,
							'msg': '文件大小异常'
						})
				else:
					setValue['media'] = None
			db['posts'].update({'_id': ObjectId(data.id)},{'$set': setValue})
			return json.dumps({
				'code': 200,
				'msg': '修改成功'
			})
		else:
			return '干嘛呢?'

# 删除文章
class deletePost:
	def POST(self):
		if checkLogin():
			data = web.input()
			try:
				db['posts'].remove({'_id': ObjectId(data.id)})
				return '删除成功'
			except:
				raise '删除失败'
		else:
			return '干嘛呢?'

api = web.application(urls,locals())