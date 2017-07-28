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
from emoji import emojize
from math import ceil

# from pygments import highlight
# from pygments.lexers import PythonLexer
# from pygments.formatters import HtmlFormatter

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
	# '/test', 'test'
)

render._lookup.globals.update(
	ROOT = app_root,
	IP = get_my_ip(),
	HOSTNAME = webConfig['hostname']
)

def datetimeformat(value, format='%Y-%m-%d %H:%M:%S'):
    return time.strftime(format,time.localtime(value))

def avatarformat(value,size):
    if value.find('?') == -1:
    	return value + '?s=' + str(size)
    else:
    	return value + '&s=' + str(size)

def markdownOutput(value):
	return emojize(markdown(value))

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
	'avatarformat': avatarformat,
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
		ret = getPosts()
		posts = list(ret.get('posts'))
		if checkLogin():
			userId = db['users'].find_one({'username': web.ctx.session.get('username')})['_id']
		else:
			userId = None
		url = web.url()
		query = dict(web.input())
		nextPage = prevPage = None
		if ret.get('nextPage'):
			query['page'] = str(ret.get('nextPage'))
			nextPage = addQuery(url, query)
		if ret.get('prevPage'):
			query['page'] = str(ret.get('prevPage'))
			prevPage = addQuery(url, query)
		return render.index({
			'posts': posts,
			'userId': userId,
			'type': web.input(type=None).type,
			'nextPage': nextPage,
			'prevPage': prevPage
		})

class showPost:
	def GET(self,id):
		data = web.input(captcha=None)
		id = ObjectId(id)
		post = db['posts'].find_one({'_id': id})
		artist = db['users'].find_one({'_id': post['artist']})
		user = None
		if web.ctx.has_key('session'):
			user = db['users'].find_one({'username': web.ctx.session.get('username')})
		if user:
			hasRight = str(artist['_id']) == str(user['_id'])
		else:
			hasRight = False
		post['artist'] = artist
		captcha = post.get('captcha')
		public = post.get('public')
		music = post.get('music')
		if user:
			collected = db['actions'].find({
				'userId': str(user['_id']),
				'action': 1,
				'postId': str(post['_id'])
			}).count()
			if collected:
				collected = 'true'
			else:
				collected = 'false'
			post['collected'] = collected
		post['collect'] = db['actions'].find({
			'action': 1,
			'postId': str(post['_id'])
		}).count()
		if captcha:
			# 如果存在验证码
			if captcha != data.captcha:
				# 如果验证码不等于输入验证码，跳转到授权页面
				return web.redirect('/postAccess?id=' + str(post['_id']))
		# if music:
		# 	musicMap = {
		# 		'playlist': 0,
		# 		'album': 1,
		# 		'song': 2
		# 	}
		# 	post['music']['type'] = musicMap[post['music']['type']]
		if public:
			return render.article({
				'post': post,
				'hasRight': hasRight
			})
		if checkLogin():
			access = False
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
			user = db['users'].find_one({'username': web.ctx.session.get('username')})
			posts = list(db['posts'].find({'artist':id}).sort('postDate',-1))
			handlerSpecPostType(posts, user['_id'])
			isFollow = None
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
			# 点赞的文章
			pids = list(db['actions'].find({
				'userId': str(id),
				'action': 1
			}, {
				'_id': -1,
				'postId': 1
			}).sort('actionTime', -1))
			# 过滤assigns的文章
			# 过滤
			ids = []
			for pid in pids:
				ids.append(ObjectId(pid['postId']))
			favPosts = list(db['posts'].find({
				'_id': {
					'$in': ids
				}
			}))
			handlerSpecPostType(favPosts, user['_id'])
			return render.user({
				'user': artist,
				'posts': posts,
				'isFollow': isFollow,
				'me': me,
				# 'following': following,
				# 'followers': followers,
				'sameFollowers': sameFollowers,
				'favPosts': favPosts
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
# 我的关注
# 首页时间线（所有）
def getPosts():
	artists = []
	posts = []
	data = web.input(type=None,page=1,num=10)
	num = int(data.num)
	page = int(data.page)
	total = 0
	if data.type == 'fav':
		if checkLogin():
			# 获取所有关注者的文章
			# turn the cursor into a list
			user = db['users'].find_one({'username': web.ctx.session.get('username')})
			master = db['follow'].find_one({'master': user['_id']},{'follower': 1})
			follower = []
			if master:
				follower = master['follower']
			# follower.append(user['_id'])
			# 所有私有的，并且指定给我的文章，以及所有公开的文章
			# posts = list(db['posts'].find({'artist': {'$in': follower}}).sort('postDate',-1).limit(10))
			# 查询条件：
				# 我的文章
				# 关注人指定给我的文章
				# 关注人的公开文章
			query = db['posts'].find({
				'$or': [
					{
						'artist': ObjectId(user['_id'])
					},
					{
						'artist': {'$in': follower},
						'public': True
					},
					{
						'artist': {'$in': follower},
						'assigns': {'$in': [str(user['_id'])]},
						'private': False
					},
					{
						'artist': {'$in': follower},
						'assigns': None,
						'private': False
					}
			]
			})
			posts = list(query.sort('postDate', -1).skip((page - 1) * num).limit(num))
			total = query.count()
			# cannot set options after executing query
	else:
		query = db['posts'].find({'public': True})
		posts = list(query.sort('postDate',-1).skip((page - 1) * num).limit(num))
		total = query.count()
	for i in posts:
		i['showPost'] = True
		if i['media']:
			dirname = os.path.dirname(i['media'])
			basename = os.path.basename(i['media'])
			i['media'] = os.path.normpath(dirname + '/thumbs/'+basename)
		# 私有文章
		if i.get('private'):
			i['private'] = True
			# if user['_id'] == i['artist']:
			# 	i['showPost'] = i['private'] = True
			# else:
			# 	i['showPost'] = False
			# continue
		# 指定给谁看
		if i.get('assigns'):
			i['assign'] = True
			# if user['_id'] == i['artist'] or str(user['_id']) in i.get('assigns'):
			# 	i['showPost'] = i['assign'] = True
			# else:
			# 	i['showPost'] = False
		# else:
		# 	i['showPost'] = True
		artists.append(i['artist'])
	maxPage = int(ceil(total / num))
	nextPage = prevPage = 0
	if maxPage > page:
		nextPage = page + 1
	if page > 1:
		prevPage = page - 1
	artists = db['users'].find({'_id': {'$in': artists}})
	return {
		'posts': transformPosts(posts,listToHashByArtists(list(artists))),
		'nextPage': nextPage,
		'prevPage': prevPage
	}
# 修改文章
class editPost:
	def GET(self,id):
		# dict 无法用.访问？
		if checkLogin():
			# 如果文章属于作者？
			id = ObjectId(id)
			user = db['users'].find_one({'username': web.ctx.session.get('username')})
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

# class test:
# 	def GET(self):
# 		formatter = HtmlFormatter(encoding='utf-8', style = 'default', linenos = True)
# 		code = highlight('print "hello, world"', PythonLexer(), formatter)
# 		# return '<style>'+formatter.get_style_defs('.highlight')+'</style>' + code
# 		return '<link rel="stylesheet" href="http://www.gocalf.com/blog/theme/css/style.min.css">' + code

def beforeReq():
	web.ctx.session = session
	render._lookup.globals.update(
		Login = checkLogin()
	)
	web.header('Content-Type','text/html; charset=utf-8')
	return

# 添加请求前后的操作
app.add_processor(web.loadhook(beforeReq))

if __name__ == '__main__':
	app.run()
