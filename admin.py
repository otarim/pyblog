# coding=utf-8

import web
import hashlib
import time
import json
# import urllib
from markdown import markdown
from sign import sign
from common import *
from config import render,upload_path,app_root
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

#注册
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
			# 如果存在
			return json.dumps({
				'code': 500,
				'msg': '账户已存在'
			})
		else:
			db['regToken'].update({
				'email': email
			},{
				'email': email,
				'token': token
			},True)
			web.sendmail('otarim@icloud.com', email, '注册 pyblog', '点击链接跳转到注册页面<a href="http://112.74.104.132:8080/u/reg?token='+token+'">http://112.74.104.132:8080/u/reg?token='+token+'</a>' ,headers=({'Content-Type': 'text/html; charset=UTF-8'}))
			return json.dumps({
				'code': 200,
				'msg': '邮件已发出，请打开邮箱检查收件箱，如果收件箱找不到邮件，可能在垃圾邮件里面可以找到'
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
				return web.internalerror('非法操作')
		
	def POST(self):
		data = web.input()
		if data.password and data.repassword and data.password == data.repassword:
			# 锁的问题有点操蛋。。。还是用 mongod 维护多一个表存储自增 id 吧
			# findAndModify 会锁定表
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
			web.setcookie('pyname',data.username,36000,path='/')
			web.setcookie('pyconnect',sign(data.username),36000,path='/')
			# 删除 token 表中的 document
			db['regToken'].remove({'email': data['username']})
			return web.redirect('/0') 

# 登陆
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
					# 更新最后登录时间，ip
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
					return '密码错误'
			else:
				return '用户不存在'


class logout:
	def GET(self):
		user = web.cookies().get('pyname')
		if(user):
			web.setcookie('pyname',user,-1,path='/')
			web.setcookie('pyconnect',sign(user),-1,path='/')
			return '你登出了'


# 主页
class dashboard:
	# 循环重定向，cookie 域的问题
	def GET(self):
		if checkLogin():
			artist = db['users'].find_one({'username': web.cookies().get('pyname')})
			posts = list(db['posts'].find({'artist':artist['_id']}).sort('postDate',-1))
			for i in posts:
				if i.get('assigns'):
					if artist['_id'] == i['artist'] or str(artist['_id']) in i.get('assigns'):
						i['assign'] = True
			# 我关注的人
			following = db['follow'].find_one({'master': artist['_id']},{'follower': 1,'_id': 0}) 
			if following:
				following = list(db['users'].find({'_id': {'$in': following['follower']}}))
			else:
				following = None
			# 关注他的人
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


# ObjectId(post_id) 查询 id
# from bson.objectid import ObjectId
# http://blog.csdn.net/iefreer/article/details/9024993 DELETE 方法
