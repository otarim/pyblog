var http = require('http'),
	IO = require('socket.io'),
	async = require('async'),
	client = require('mongodb').MongoClient


var server = http.createServer(function(req,res){

})

server.listen(10086)

var io = IO(server),
	room = 'pyblog'

var connect = (function(){
	var db
	return function(cb){
		if(db){
			return cb(null,db)
		}else{
			client.connect('mongodb://localhost:27017/pyblog',function(err,database){
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
		var to = getTarget(e.to)
		if(to.length){
			// 保存数据库，下次登录推送
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
			})
		}
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



