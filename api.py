# coding=utf-8

import web
import hashlib
import time
import json
import cgi
import types
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
	'/post/del', 'deletePost',
	'/user','user',
	'/msg', 'getMsg',
	'/msg/read', 'changeMsgStatus',
	'/follow', 'follow'
)

class post:
	def GET(self):
		if checkLogin():
			query = web.input(pageNum=10,page=1)
			artists = []
			user = db['users'].find_one({'username': web.cookies().get('pyname')})
			master = db['follow'].find_one({'master': user['_id']},{'follower': 1})
			follower = []
			if master:
				follower = master['follower']
			follower.append(user['_id'])
			posts = list(db['posts'].find({'artist': {'$in': follower}},{'artist': 1,'captcha': 1,'title': 1,'postDate': 1,'media': 1,'assigns': 1}).sort('postDate',-1).skip((int(query.page) - 1) * int(query.pageNum)).limit(int(query.pageNum)))
			posts_remove = []
			for i in posts:
				if i.get('assigns'):
					if user['_id'] != i['artist'] and str(user['_id']) not in i.get('assigns'):
						posts_remove.append(i)
						continue
					del(i['assigns'])
					i['assign'] = True
				if i.get('captcha'):
					del(i['captcha'])
					i['hasCaptcha'] = True
					if i.get('media'):
						i['media'] = True
				i['_id'] = str(i['_id'])
				artists.append(i['artist'])
			artists = list(db['users'].find({'_id': {'$in': artists}},{'password': 0,'loginIp': 0,'regIp': 0,'lastLoginTime': 0}))
			for i in artists:
				i['_id'] = str(i['_id'])
			web.header('Content-Type','application/json')
			for i in posts_remove:
				posts.remove(i)
			return json.dumps({
				'code': 200,
				'page': int(query.page),
				'pageNum': int(query.pageNum),
				'total': db['posts'].find({'artist': {'$in': follower}}).count(), #二次查询？
				'result': transformPosts(posts,listToHashByArtists(artists))
			})
		else:
			return json.dumps({
				'code': 500,
				'msg': 'not access'
			})
	def POST(self):
		if checkLogin():
			data = web.input(file={},tags=[],assigns=[],captcha=None) # 这什么鬼？！！！！！ 无 file={}报错。。擦
			fileurl = None
			if isinstance(data.file,types.InstanceType):
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
				'tags': ','.join(data['tags']),
				'captcha': web.net.websafe(data.captcha),
				'assigns': data.assigns
			})
			web.header('Content-Type','application/json')
			return json.dumps({'code':200,'result': {
				'id': str(post),
				'artist': str(id),
				'title': web.net.websafe(data.title),
				'content': markdown(web.net.websafe(data.content)),
				'media': fileurl,
				'tags': ','.join(data['tags']),
				'captcha': web.net.websafe(data.captcha),
				'assigns': data.assigns
			}})
		else:
			return '你他妈还没登陆啊'
	def PUT(self):
		if checkLogin():
			data = web.input(file={},tags=[],assigns=[],captcha=None)
			mediaChanged = data.mediaChanged
			setValue = {
				'title': web.net.websafe(data.title),
				'content': web.net.websafe(data.content),
				'tags': ','.join(data['tags']),
				'captcha': web.net.websafe(data.captcha),
				'assigns': data.assigns,
				'lastModify': time.time()
			}
			if mediaChanged == 'true':
				if isinstance(data.file,types.InstanceType):
					try:
-						setValue['media'] = upload(data.file)
-					except:
-						return json.dumps({
-							'code': 500,
-							'msg': '文件大小异常'
-						})
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

class user:
	def GET(self,username):
		user = db['users'].find_one({'username': username},{'password': 0,'loginIp': 0,'regIp': 0,'lastLoginTime': 0})
		web.header('Content-Type','application/json')
		if user:
			user['_id'] = str(user['_id'])
			return json.dumps({
				'code': 200,
				'result': [user]
			})
		else:
			return json.dumps({
				'code': 500,
				'msg': '用户不存在'
			})
	def PUT(self):
		if checkLogin():
			user = web.cookies().get('pyname')
			setValue = {}
			data = web.input(avatar={})
			for i in data:
				if i is not 'avatar':
					setValue[i] = web.net.websafe(data[i])
			if isinstance(data.avatar,types.InstanceType):
				try:
					setValue['avatar'] = upload(data.avatar,'/avatars/',mediaType='avatar')
				except:
					return json.dumps({
						'code': 500,
						'msg': '文件大小异常'
					})

			db['users'].update({'username': user},{'$set': setValue})
			return json.dumps({
				'code': 200
			})

class getMsg:
	def __fineUser(self,val):
		user = db['users'].find_one({'username': val},{'username': 1,'nickname': 1,'_id': 1,'avatar': 1})
		if(user):
			user['_id'] = str(user['_id'])
		return user
	def __transformUser(self,msgs):
		hash = {}
		for msg in msgs:
			msg['_id'] = str(msg['_id'])
			if msg['from'] in hash:
				msg['from'] = hash[msg['from']]
			else:
				username = msg['from']
				msg['from'] = hash[username] = self.__fineUser(username)
		return msgs
	def GET(self):
		if checkLogin():
			user = web.cookies().get('pyname')
			msgs = list(db['msg'].find({'to': user,'read': False},{'to': 0}).sort('date',-1))
			msgs = self.__transformUser(msgs)
			web.header('Content-Type','application/json')
			return json.dumps({
				'code': 200,
				'count': len(msgs),
				'to': self.__fineUser(user),
				'result': msgs
			})
	def POST(self):
		if checkLogin():
			data = web.input()

class changeMsgStatus:
	def GET(self):
		data = web.input()
		db['msg'].update({'_id': ObjectId(data['id'])},{'$set': {
			'read': True
		}}) 

class follow:
	def GET(self):
		pass
	def POST(self):
		if checkLogin():
			data = web.input()
			followerId = ObjectId(data.id)
			userId = db['users'].find_one({'username': web.cookies().get('pyname')})['_id']
			if db['follow'].find_one({'master': userId,'follower': {'$in': [followerId]}}):
				db['follow'].update({
					'master': userId
				},{
					'$pull': {
						# 删除
						'follower': followerId
					}
				})
			else:
				db['follow'].update({
					'master': userId
				},{
					'$push': {
						'follower': followerId
					}
				},True)
				# upsert 如果文档不存在，那么创建，否则更新
			return json.dumps({
				'code': 200,
				'msg': ''
			})


api = web.application(urls,locals())
