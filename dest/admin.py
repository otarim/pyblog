# coding=utf-8

import web
import hashlib
import time
import json
# import urllib
from markdown import markdown
from sign import sign
from common import *
from config import render,upload_path,app_root,webConfig
from conn import client
from bson.objectid import ObjectId

db = client.pyblog

urls = (
	'/0', 'dashboard', # root!!!!!
	'/login', 'login',
	'/logout', 'logout',
	'/reg', 'reg',
	'/msg', 'msg',
	'/regAccount', 'regAccount'
)


admin = web.application(urls,locals())

#ע��
class regAccount:
	def GET(self):
		# if web.ctx.session.hasLogin:
		# 	raise web.redirect('/')
		# else:
		return render.regAccount()
	def POST(self):
		data = web.input()
		token = randomString()
		email = data['username']
		web.header('Content-Type','application/json')
		if db['users'].find_one({'username': email}):
			# �������
			return json.dumps({
				'code': 500,
				'msg': '�˻��Ѵ���'
			})
		else:
			db['regToken'].update({
				'email': email
			},{
				'email': email,
				'token': token
			},True)
			webName = webConfig['hostname'].encode('utf8')
			web.sendmail('otarim@icloud.com', email, 'ע�� pyblog', '���������ת��ע��ҳ��<a href="'+webName+'/u/reg?token='+token+'">'+webName+'/u/reg?token='+token+'</a>' ,headers=({'Content-Type': 'text/html; charset=UTF-8'}))
			return json.dumps({
				'code': 200,
				'msg': '�ʼ��ѷ���������������ռ��䣬����ռ����Ҳ����ʼ��������������ʼ���������ҵ�'
			})


class reg:
	def GET(self):
		data = web.input()
		if 'token' in data:
			result = db['regToken'].find_one({'token': data['token']})
			if result:
				username = result['email']
				return render.reg({
					'username': username
				})
			else:
				return web.internalerror('�Ƿ�����')
		
	def POST(self):
		data = web.input()
		if data.password and data.repassword and data.password == data.repassword:
			# ���������е�ٵ������������� mongod ά����һ����洢���� id ��
			# findAndModify ��������
			uid = db['ids'].find_and_modify(query={'name':'user'},update={'$inc':{'id':1}},new=True)['id']
			db['users'].insert({
				'uid': uid,
				'username': data.username,
				'nickname': data.nickname,
				'avatar': getAvatar(data.username),
				'password': hashlib.md5(data.password).hexdigest(),
				'regDate': time.time(),
				'regIp': web.ctx.ip,
				'loginIp': web.ctx.ip,
				'lastLoginTime': time.time() 
			})
			writeSession({
				'hasLogin': True,
				'username': data.username
			})
			web.setcookie('pyname',data.username,72000,path='/')
			web.setcookie('pyconnect',sign(data.username),72000,path='/')
			# ɾ�� token ���е� document
			db['regToken'].remove({'email': data['username']})
			return web.redirect('/0') 

# ��½
class login:
	def GET(self):
		if checkLogin():
			return web.redirect('/0')
		else:
			return render.login()
	def POST(self):
		data = web.input()
		if data.username:
			user = db['users'].find_one({'username': data.username})
			if user:	
				if hashlib.md5(data.password).hexdigest() == user.get('password'):
					# success
					# ��������¼ʱ�䣬ip
					db['users'].update({'username': data.username},{
						'$set': {
							'loginIp': web.ctx.ip,
							'lastLoginTime': time.time() 
						}
					})
					writeSession({
						'hasLogin': True,
						'username': data.username
					})
					web.setcookie('pyname',data.username,36000,path='/')
					web.setcookie('pyconnect',sign(data.username),36000,path='/')
					return web.redirect('/0')
				else:
					return '�������'
			else:
				return '�û�������'


class logout:
	def GET(self):
		user = web.cookies().get('pyname')
		if(user):
			web.setcookie('pyname',user,-1,path='/')
			web.setcookie('pyconnect',sign(user),-1,path='/')
			return '��ǳ���'


# ��ҳ
class dashboard:
	# ѭ���ض���cookie �������
	def GET(self):
		if checkLogin():
			artist = db['users'].find_one({'username': web.cookies().get('pyname')})
			posts = list(db['posts'].find({'artist':artist['_id']}).sort('postDate',-1))
			for i in posts:
				if i.get('assigns'):
					if artist['_id'] == i['artist'] or str(artist['_id']) in i.get('assigns'):
						i['assign'] = True
			# �ҹ�ע����
			following = db['follow'].find_one({'master': artist['_id']},{'follower': 1,'_id': 0}) 
			if following:
				following = list(db['users'].find({'_id': {'$in': following['follower']}}))
			else:
				following = None
			# ��ע������
			followers = db['follow'].find({'follower': {'$in': [artist['_id']]}},{'master': 1,'_id': 0})
			if followers.count():
				followers = getArtistByKey(followers,'master')
			else:
				followers = None
			return render.admin({
				'user': artist,
				'posts': posts,
				'count': len(posts),
				'following': following,
				'followers': followers
			})
		else:
			return web.redirect('/login')

def getAvatar(email):
	return 'https://cdn.v2ex.com/gravatar/'+hashlib.md5(email).hexdigest() +'?d=retro';


# ObjectId(post_id) ��ѯ id
# from bson.objectid import ObjectId
# http://blog.csdn.net/iefreer/article/details/9024993 DELETE ����
