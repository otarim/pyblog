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
)


admin = web.application(urls,locals())

def writeSession(arg):
	for i in arg:
		web.ctx.session[i] = arg[i]

#注册
class reg:
	def GET(self):
		# if web.ctx.session.hasLogin:
		# 	raise web.redirect('/')
		# else:
		return render.reg()
	def POST(self):
		data = web.input()
		# 检测
		if db['users'].find_one({'username': data.username}):
			# return None 
			return '被注册了'
		if data.username and data.password:
			# 怎么搞？全局变量不能 from import?
			# if not service.LOCK:
			# 	service.LOCK = True
			# r+ 使用r+ 模式不会先清空，但是会替换掉原先的文件
			# w+ 消除文件内容，然后以读写方式打开文件。
			# r+ 先读取，然后 write 可以实现 append 操作
			fout = open(app_root+'/uid','r')
			uid = int(fout.read()) + 1
			fout.close()
			fout = open(app_root+'/uid','w')
			fout.write(str(uid))
			fout.close()
			service.LOCK = False
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
			raise web.redirect('/0') 
		

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
					raise web.redirect('/0')
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
			return render.admin({
				'user': artist,
				'posts': posts,
				'count': len(posts)
			})
		else:
			raise web.redirect('/login')


def getAvatar(email):
	return 'http://cdn.v2ex.com/gravatar/'+hashlib.md5(email).hexdigest() +'?d='+web.net.urlquote('http://www2.warwick.ac.uk/services/sport/about-us/blank.jpg');


# ObjectId(post_id) 查询 id
# from bson.objectid import ObjectId
# http://blog.csdn.net/iefreer/article/details/9024993 DELETE 方法
