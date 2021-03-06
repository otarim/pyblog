var https = require('https'),
	fs = require('fs'),
	IO = require('socket.io'),
	async = require('async'),
	client = require('mongodb').MongoClient,
	ObjectID = require('mongodb').ObjectID

var options = {
	key: fs.readFileSync('<privkey.pem>'),
	cert: fs.readFileSync('<fullchain.pem>')
}

var server = https.createServer(options)

server.listen(20086)

var io = IO(server),
	room = 'pyblog'

var connect = (function(){
	var db
	return function(cb){
		if(db){
			return cb(null,db)
		}else{
			client.connect('mongodb://pyblog:pyblog@127.0.0.1:27017/pyblog?authMechanism=SCRAM-SHA-1',function(err,database){
				db = database
				if(err){
					return cb(err,null)
				}else{
					return cb(null,db)
				}
			})
		}
	}
})()

io.on('connection',function(socket){
	// socket.username = 
	socket.join(room)
	socket.on('add',function(username){
		this.username = username
	}).on('msg',function(e){
		// 保存数据库，下次登录推送
		// 无 id 发会话 insert
		// 有 id 发回复 update 已存在的会话 ref
		async.waterfall([
			function(cb){
				connect(function(err,db){
					cb(null,db)
				})
			},
			function(db,cb){
				db.collection('users',function(err,users){
					cb(null,err,users)
				})
			},
			function(err,users,cb){
				if(users){
					// todo 找过一次的用户不再找，cache
					users.findOne({'username': e.to},function(err,user){
						cb(null,err)
					})
				}
			},
			function(err,cb){
				if(!err){
					connect(function(err,db){
						db.collection('msg').insert({
							'from': socket.username,
							'date': +new Date,
							'msg': e.msg,
							'to': e.to,
							'read': false //已读
						},function(err,ret){
							cb(null,ret)
						})
					})
				}
			}
		],function(err,ret){
			var to = getTarget(e.to)
			if(to.length){
				to.forEach(function(d){
					getUser(socket.username,function(err,user){
						if(!err){
							d.emit('recive',{
								'_id': ret[0]['_id'],
								'msg': e.msg,
								'from': user,
								'date': +new Date,
								'read': false
							})	
						}
					})
					
				})
			}
		})
	}).on('disconnect',function(){
		socket.leave(room)
	})
})

function getTarget(user){
	return io.sockets.sockets.filter(function(socket){
		return socket.username === user
	})
}

function getUser(username,cb){
	async.waterfall([
		function(cb){
			connect(function(err,db){
				if(!err){
					cb(null,db)
				}
			})
		},
		function(db,cb){
			db.collection('users',function(err,users){
				if(!err){
					cb(null,users)
				}
			})
		},
		function(users,cb){
			users.findOne({'username': username},{'username': 1,'nickname': 1,'_id': 1,'avatar': 1},function(err,user){
				if(!err){
					cb(null,user)
				}
			})
		}
	],function(err,user){
		cb(null,user)
	})
}



