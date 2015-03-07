# coding=utf-8

import web
import hashlib
import time
import os
from markdown import markdown
from config import render,upload_path,app_root,webConfig
from conn import client
from admin import admin
from api import api
from common import *
from bson.objectid import ObjectId

web.config.debug = False

db = client.pyblog

urls = (
	'/(.*)/', 'redirect',
	'/', 'index',
	'/posts/(.*)', 'showPost',
	'/users','getAllUsers',
	'/users/(.*)', 'showUser',
	'/u', admin,
	'/api',api,
	'/tags/(.*)','tag',
	'/search', 'search',
	'/post/edit/(.*)', 'editPost',
	'/postAccess', 'postAccess',
	'/install', 'install'
)

render._lookup.globals.update(
	ROOT = app_root,
	IP = get_my_ip(),
	HOSTNAME = webConfig['hostname']
)

def datetimeformat(value, format='%Y-%m-%d %H:%M:%S'):
    return time.strftime(format,time.localtime(value))

def markdownOutput(value):
	return markdown(value)

def wrapTags(value,path='/tags/'):
	values = value.split(',')
	ret = []
	for i in values:
		ret.append('<a href="' + (path + i) + '">' + i + '</a>')
	return ','.join(ret)

# https://groups.google.com/forum/#!topic/webpy/yvn6TeL1NWA
# webpy 中使用自定义 filter
render._lookup.filters.update({
	'datetimeformat': datetimeformat,
	'markdownOutput': markdownOutput,
	'wrapTags': wrapTags
})

app = web.application(urls,locals())

session = web.session.Session(app,web.session.DiskStore('webSession'),initializer = {
	'hasLogin': False,
	'loginName': None
})

class redirect:
	def GET(self, path):
		web.redirect('/' + path)

class index:
	def GET(self):
		if checkLogin():
			posts = list(getPosts())
			userId = db['users'].find_one({'username': web.cookies().get('pyname')})['_id']
			return render.index({
				'posts': posts,
				'userId': userId
			})
		else:
			return web.redirect('/u/login')

class showPost:
	def GET(self,id):
		data = web.input(captcha=None)
		id = ObjectId(id)
		post = db['posts'].find_one({'_id': id})
		artist = db['users'].find_one({'_id': post['artist']})
		post['artist'] = artist
		captcha = post.get('captcha')
		public = post.get('public')
		if captcha:
			# 如果存在验证码
			if captcha != data.captcha:
				# 如果验证码不等于输入验证码，跳转到授权页面
				return web.redirect('/postAccess?id=' + str(post['_id']))
		if public:
			return render.article({
				'post': post,
				'hasRight': False
			})
		if checkLogin():
			access = False
			user = db['users'].find_one({'username': web.cookies().get('pyname')})
			hasRight = str(artist['_id']) == str(user['_id'])
			assigns = post.get('assigns')
			private = post.get('private')
			if private:
				if not hasRight:
					raise web.internalerror('你没有查看权限')
			# 不存在验证码，或者验证码正确，直接访问
			if assigns:
				# 是否指定用户查看
				if not hasRight and str(user['_id']) not in assigns:
					# 有权限
					raise web.internalerror('你没有查看权限')
			return render.article({
				'post': post,
				'hasRight': hasRight
			})
		else:
			return web.redirect('/u/login')

class postAccess:
	def GET(self):
		data = web.input(id=None)
		return render.postAccess({
			'id': data.id
		})
	def POST(self):
		# 根据 id 查找 id 对应的 captcha
		data = web.input(id=None,captcha=None)
		return web.redirect('/posts/' + data.id + '?captcha=' + data.captcha)



class showUser:
	def GET(self,id):
		if checkLogin():
			id = ObjectId(id)
			artist = db['users'].find_one({'_id': id})
			user = db['users'].find_one({'username': web.cookies().get('pyname')})
			posts = list(db['posts'].find({'artist':id}).sort('postDate',-1))
			for i in posts:
				if i.get('private'):
					if user['_id'] == i['artist']:
						i['showPost'] = i['private'] = True
					else:
						i['showPost'] = False
					continue
				if i.get('assigns'):
					if user['_id'] == i['artist'] or str(user['_id']) in i.get('assigns'):
						i['showPost'] = i['assign'] = True
					else:
						i['showPost'] = False
				else:
					i['showPost'] = True
			isFollow = None
			if checkLogin():
				if user['_id'] == id:
					me = isFollow = True
				else:
					me = False
					isFollow = db['follow'].find_one({'master': user['_id'],'follower': {'$in': [id]}})
				# # 他关注的人
				# following = db['follow'].find_one({'master': id},{'follower': 1,'_id': 0}) 
				# if following:
				# 	following = list(db['users'].find({'_id': {'$in': following['follower']}}))
				# else:
				# 	following = None
				# # 关注他的人
				# followers = db['follow'].find({'follower': {'$in': [id]}},{'master': 1,'_id': 0})
				# if followers.count():
				# 	followers = getArtistByKey(followers,'master')
				# else:
				# 	followers = None
				# 共同关注的人，set + intersection + list
				if isFollow:
					myFollowing = db['follow'].find_one({'master': user['_id']},{'follower': 1,'_id': 0})
					otherFollowing = db['follow'].find_one({'master': id},{'follower': 1,'_id': 0})
					if myFollowing and otherFollowing:
						sameFollowers = list(set(myFollowing['follower']).intersection(set(otherFollowing['follower'])))
						if sameFollowers:
							sameFollowers = list(db['users'].find({'_id': {'$in': sameFollowers}}))
						else:
							sameFollowers = None
					else:
						sameFollowers = None
				else:
					sameFollowers = None
			return render.user({
				'user': artist,
				'posts': posts,
				'count': len(posts),
				'isFollow': isFollow,
				'me': me,
				# 'following': following,
				# 'followers': followers,
				'sameFollowers': sameFollowers
			})
		else:
			return web.redirect('/u/login')

class getAllUsers:
	def GET(self):
		if checkLogin():
			users = list(db['users'].find({},{'_id': 1,'avatar':1,'uid':1,'nickname': 1,'sex': 1}).sort('uid',1))
			return render.users({
				'users': users
			})
		else:
			return web.redirect('/u/login')

class tag:
	def GET(self,tag):
		if checkLogin():
			posts = list(db['posts'].find({'tags':{'$regex':'('+tag+'$)|('+tag+',)'}}))
			return render.tag({
				'posts': posts,
				'count': len(posts)
			})
		else:
			return web.redirect('/u/login')

#获取全部文章
def getPosts():
	if checkLogin():
		# 获取所有关注者的文章
		artists = []
		# turn the cursor into a list
		user = db['users'].find_one({'username': web.cookies().get('pyname')})
		master = db['follow'].find_one({'master': user['_id']},{'follower': 1})
		follower = []
		if master:
			follower = master['follower']
		follower.append(user['_id'])	
		posts = list(db['posts'].find({'artist': {'$in': follower}}).sort('postDate',-1).limit(5))
		# .sort('postDate')
		# cannot set options after executing query
		for i in posts:
			if i['media']:
				dirname = os.path.dirname(i['media'])
				basename = os.path.basename(i['media'])
				i['media'] = os.path.normpath(dirname + '/thumbs/'+basename)
			if i.get('private'):
				if user['_id'] == i['artist']:
					i['showPost'] = i['private'] = True
				else:
					i['showPost'] = False
				continue
			if i.get('assigns'):
				if user['_id'] == i['artist'] or str(user['_id']) in i.get('assigns'):
					i['showPost'] = i['assign'] = True
				else:
					i['showPost'] = False
			else:
				i['showPost'] = True
			artists.append(i['artist'])
		artists = db['users'].find({'_id': {'$in': artists}})
		return transformPosts(posts,listToHashByArtists(list(artists)))

# 修改文章
class editPost:
	def GET(self,id):
		# dict 无法用.访问？
		if checkLogin():
			# 如果文章属于作者？
			id = ObjectId(id)
			user = db['users'].find_one({'username': web.cookies().get('pyname')})
			post = db['posts'].find_one({'_id': id,'artist': user['_id']})
			hasTag = True
			if post:
				# 关注他的人
				followers = db['follow'].find({'follower': {'$in': [user['_id']]}},{'master': 1,'_id': 0})
				if followers.count():
					followers = getArtistByKey(followers,'master')
				else:
					followers = None
				if post['tags'] == '':
					hasTag = False
				if post.get('tags'):
					post['tags'] = post['tags'].split(',')
				if post.get('assigns'):
					assignMap = {}
					for i in post['assigns']:
						for j in followers:
							if str(j['_id']) == i:
								assignMap[str(i)] = j['nickname']
								break
				else:
					assignMap = None
				return render.edit({
					'post': post,
					'hasTag': hasTag,
					'followers': followers,
					'assignMap': assignMap
				})
			else:
				raise web.internalerror('你没有修改权限')
		else:
			return web.redirect('/u/login')

class search:
	def GET(self):
		return render.search()
	def POST(self):
		pass

class install:
	def GET(self):
		# 创建 webSession 目录，创建 upload 目录，创建 avatars 目录
		# 初始化 ids 表
		# 删除 install 
		if not os.path.exists(os.path.join(app_root,'lock')):
			if not os.path.exists(os.path.join(app_root,'static/upload')):
				os.mkdir(os.path.join(app_root,'static/upload'))
				os.mkdir(os.path.join(app_root,'static/upload/avatars'))
			if not os.path.exists(os.path.join(app_root,'webSession')):
				os.mkdir(os.path.join(app_root,'webSession'))
			db['ids'].save({'name':'user','id':db['users'].find().count()})
			# 生成 lock 文件
			f = open(os.path.join(app_root,'lock'),'w')
			f.close()
			return '安装完毕'


def beforeReq():
	render._lookup.globals.update(
		Login = checkLogin()
	)
	web.ctx.session = session
	web.header('Content-Type','text/html; charset=utf-8')
	return

# 添加请求前后的操作
app.add_processor(web.loadhook(beforeReq))

if __name__ == '__main__':
	app.run()