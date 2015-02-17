# coding=utf-8

import web
import hashlib
import time
import os
from markdown import markdown
from config import render,upload_path,app_root
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
	'/post/edit/(.*)', 'editPost'
)

render._lookup.globals.update(
	ROOT = app_root
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
		posts = list(getPosts())
		return render.index({
			'posts': posts
		})

class showPost:
	def GET(self,id):
		id = ObjectId(id)
		post = db['posts'].find_one({'_id': id})
		artist = db['users'].find_one({'_id': post['artist']})
		post['artist'] = artist
		return render.article({
			'post': post
		})

class showUser:
	def GET(self,id):
		id = ObjectId(id)
		artist = db['users'].find_one({'_id': id})
		posts = list(db['posts'].find({'artist':id}).sort('postDate',-1))
		return render.user({
			'user': artist,
			'posts': posts,
			'count': len(posts)
		})

class getAllUsers:
	def GET(self):
		if checkLogin:
			users = list(db['users'].find({},{'_id': 1,'avatar':1,'uid':1,'nickname': 1,'sex': 1}).sort('uid',1))
			return render.users({
				'users': users
			})
		else:
			return web.redirect('/u/login')

class tag:
	def GET(self,tag):
		posts = list(db['posts'].find({'tags':{'$regex':'('+tag+'$)|('+tag+',)'}}))
		return render.tag({
			'posts': posts,
			'count': len(posts)
		})

#获取全部文章
def getPosts():
	artists = []
	# turn the cursor into a list
	posts = list(db['posts'].find().sort('postDate',-1).limit(5))
	# .sort('postDate')
	# cannot set options after executing query
	for i in posts:
		if i['media']:
			dirname = os.path.dirname(i['media'])
			basename = os.path.basename(i['media'])
			i['media'] = os.path.normpath(dirname + '/thumbs/'+basename)
		artists.append(i['artist'])
	artists = db['users'].find({'_id': {'$in': artists}})
	return transformPosts(posts,listToHashByArtists(list(artists)))

# 修改文章
class editPost:
	def GET(self,id):
		# dict 无法用.访问？
		if checkLogin():
			id = ObjectId(id)
			post = db['posts'].find_one({'_id': id})
			if 'tags' in post:
				post['tags'] = post['tags'].split(',')
			return render.edit({
				'post': post,
				'hasTag': len(post['tags'])
			})

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