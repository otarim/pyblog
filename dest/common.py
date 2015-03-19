# coding=utf-8

import web
import hashlib
import cgi
import Image
import os
import os.path
import random
import string
import time
import hashlib
import socket
from sign import sign
from config import upload_path,app_root
from conn import client

cgi.maxlen = 5 * 1024 * 1024 #�ļ���С���ƣ���Ҫ try except

db = client.pyblog

def transformPosts(posts,artists):
	for i in posts:
		if str(i['artist']) not in artists:
			artists[str(i['artist'])] = db['users'].find_one({'_id': i['artist']})
		i['artist'] = artists[str(i['artist'])]
	return posts

def listToHashByArtists(list):
	hash = {}
	for i in list:
		hash[str(i['_id'])] = i
	return hash

def getArtistByKey(cursor,key):
	collections = list(cursor)
	ids = []
	for i in collections:
		ids.append(i[key])
	return list(db['users'].find({'_id': {'$in': ids}}))

#����¼
def checkLogin():
	user = web.cookies().get('pyname')
	connect = web.cookies().get('pyconnect')
	if user and connect:
		return connect == sign(user)
	else:
		return False

# �ϴ�
def upload(file,path='/',mediaType='pic'):
	if not os.path.exists(upload_path+path+'/thumbs'):
		os.mkdir(upload_path+path+'/thumbs')
	THUMBS_WIDTH = 500
	pic_width = 1280
	# filename = file.filename.replace('\\','/').split('/')[-1]
	# �����
	extname = os.path.splitext(file.filename)[1]
	filename = createRandomName() + extname
	img = Image.open(file.file)
	img_w,img_h = img.size
	ratio = 1.0 * img_w / img_h
	new_size_t = (THUMBS_WIDTH, int(THUMBS_WIDTH / ratio))
	if mediaType is 'avatar':
		pic_width = 150
	new_size = (pic_width, int(pic_width / ratio))
	img.thumbnail(new_size,Image.ANTIALIAS)
	img.save(upload_path+path+filename)
	if mediaType is not 'avatar':
		img.thumbnail(new_size_t,Image.ANTIALIAS)
		img.save(upload_path+path+'/thumbs/'+filename)
	return '/static/upload'+path+filename

def writeSession(arg):
	for i in arg:
		web.ctx.session[i] = arg[i]

def createRandomName():
	# http://tocode.sinaapp.com/4
	# hashlib.md5(str(time.time())).digest()
	salt = ''.join(random.sample(string.ascii_letters + string.digits, 13))
	return salt

def randomString(num=16):
	return ''.join(map(lambda xx:(hex(ord(xx))[2:]),os.urandom(num)))

def get_my_ip():
    try:
        csock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        csock.connect(('8.8.8.8', 80))
        (addr, port) = csock.getsockname()
        csock.close()
        return addr
    except socket.error:
        return "127.0.0.1"

def isTrue(str):
	return str.lower() == 'true'

