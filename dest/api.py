# coding=utf-8

import web
import hashlib
import time
import json
import cgi
import types
import urlparse
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
				if i.get('private'):
					if user['_id'] != i['artist']:
						posts_remove.append(i)
						continue
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
				'total': db['posts'].find({'artist': {'$in': follower}}).count(), #���β�ѯ��
				'result': transformPosts(posts,listToHashByArtists(artists))
			})
		else:
			return json.dumps({
				'code': 500,
				'msg': 'not access'
			})
	def POST(self):
		if checkLogin():
			data = web.input(file={},tags=[],assigns=[],captcha=None,music=None) # ��ʲô������������ �� file={}��������
			fileurl = None
			# ���� media
			if isinstance(data.file,types.InstanceType):
				try:
					fileurl = upload(data.file)
				except:
					return '�ļ���С�쳣'
			id = db['users'].find_one({'username': web.cookies().get('pyname')}).get('_id')
			# ���� music
			if data.music:
				music = urlparse.urlparse(urlparse.urlparse(data.music).fragment)
				query = urlparse.parse_qs(music.query,True)
				musicType = music.path[1:]
				musicId = query['id'][0]
				musicAutoPlay = int(query['autoplay'][0])
			post = db['posts'].insert({
				'artist': id,
				'title': web.net.websafe(data.title),
				'content': web.net.websafe(data.content),
				'media': fileurl,
				'postDate': time.time(),
				'tags': ','.join(data['tags']),
				'captcha': web.net.websafe(data.captcha),
				'assigns': None if isTrue(data.private) or isTrue(data.public) else data.assigns,
				'private': True if isTrue(data.private) else False,
				'public': True if isTrue(data.public) else False,
				'music': {'type': musicType,'id': musicId, 'autoplay': musicAutoPlay} if data.music else None
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
				'assigns': None if isTrue(data.private) or isTrue(data.public) else data.assigns,
				'private': data.private,
				'public': data.public
			}})
		else:
			return '�����軹û��½��'
	def PUT(self):
		if checkLogin():
			data = web.input(file={},tags=[],assigns=[],captcha=None,music=None)
			mediaChanged = data.mediaChanged
			# python true,True,false,False string...
			# ���� music
			if data.music:
				music = urlparse.urlparse(urlparse.urlparse(data.music).fragment)
				query = urlparse.parse_qs(music.query,True)
				musicType = music.path[1:]
				musicId = query['id'][0]
				musicAutoPlay = int(query['autoplay'][0])
			setValue = {
				'title': web.net.websafe(data.title),
				'content': web.net.websafe(data.content),
				'tags': ','.join(data['tags']),
				'captcha': web.net.websafe(data.captcha),
				'assigns': None if isTrue(data.private) or isTrue(data.public) else data.assigns,
				'private': True if isTrue(data.private) else False,
				'public': True if isTrue(data.public) else False,
				'music': {'type': musicType,'id': musicId, 'autoplay': musicAutoPlay} if data.music else None,
				'lastModify': time.time()
			}
			if mediaChanged == 'true':
				if isinstance(data.file,types.InstanceType):
					try:
						setValue['media'] = upload(data.file)
					except:
						return json.dumps({
							'code': 500,
							'msg': '�ļ���С�쳣'
						})
				else:
					setValue['media'] = None
			db['posts'].update({'_id': ObjectId(data.id)},{'$set': setValue})
			return json.dumps({
				'code': 200,
				'msg': '�޸ĳɹ�'
			})
		else:
			return '������?'

# ɾ������
class deletePost:
	def POST(self):
		if checkLogin():
			data = web.input()
			try:
				db['posts'].remove({'_id': ObjectId(data.id)})
				return 'ɾ���ɹ�'
			except:
				raise 'ɾ��ʧ��'
		else:
			return '������?'

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
				'msg': '�û�������'
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
						'msg': '�ļ���С�쳣'
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
						# ɾ��
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
				# upsert ����ĵ������ڣ���ô�������������
			return json.dumps({
				'code': 200,
				'msg': ''
			})


api = web.application(urls,locals())
