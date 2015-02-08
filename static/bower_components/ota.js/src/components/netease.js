var http = require('http'),
	queryString = require('querystring'),
	crypto = require('crypto'),
	url = require('url')

const api = {
	hostname: 'music.163.com',
	login: '/api/login/', //username: 'password': hashlib.md5( password ).hexdigest(),'rememberLogin': 'true' POST
	userList: '/api/user/playlist', //offset 分页，limit 数量，uid 用户 id 
	search: '/api/search/get/web', //'s': s, 'type': stype, 'offset': offset, 'total': true/false, 'limit': 60 POST
	playList: '/api/playlist/list', //cat=' + category + '&order=' + order + '&offset=' + str(offset) + '&total=' + ('true' if offset else 'false') + '&limit=' + str(limit)
	playListDetail: '/api/playlist/detail',//id=playListId
	artist: '/api/artist/',
	album: '/api/album/',
	songs: '/api/song/detail', // ids=[a,b,c...]
	song: '/api/song/detail', //id=a&ids=[a]
}

const post = '9527'

var extend = function(p,c){
	var ret = p
	for(var i in c){
		if(c.hasOwnProperty(i)){
			ret[i] = c[i]
		}
	}
	return ret
}

var addQuery = function(url,data){
    if(typeof data === 'string'){
        return url + data
    }
	var query = []
	for(var i in data){
		if(data.hasOwnProperty(i)){
			query.push(i + '=' + data[i])
		}
	}
	query = query.join('&')
	url += (url.indexOf('?') !== -1) ? ('&' + query): ('?' + query)
	return url
}

var request = (function(){
	const CONFIG = {
		hostname: api.hostname,
		method: 'get',
		headers: {
			'Referer':'http://music.163.com/',
			'Cookie': 'appver=2.0.2;'
    	}
	}
	return function(config,callback){
		var stringifyData 
		config = extend(CONFIG,config || {})
		if(config.data){
			if(config.method === 'post'){
				stringifyData = queryString.stringify(config.data)
                config.headers['Content-Type'] = 'application/x-www-form-urlencoded' //post needed
				config.headers['Content-Length'] = stringifyData.length //post needed
			}
			if(config.method === 'get'){
				config.path = addQuery(config.path,config.data)
			}
		}
        console.log(config)
		var req = http.request(config,function(res){
			var data = ''
			res.setEncoding('utf-8')
			res.on('data',function(chunk){
				data += chunk
			}).on('end',function(){
				callback && callback(null,data)
			}).on('error',function(e){
				callback && callback(e.message,null)
			})
		})
		if(stringifyData){
			req.write(stringifyData)
		}
		req.end()
	}
})()

var getData = function(req,callback){
    var chunk = [],len = 0
    req.on('data',function(data){
        chunk.push(data)
        len += data.length
    }).on('end',function(){
        callback && callback(null,Buffer.concat(chunk,len).toString())
    }).on('error',function(err){
        callback && callback(err,null)
    })
}

// var sendRequest = function(){

// }

http.createServer(function(req,res){
	var reqUrl = url.parse(req.url,true),
		method = req.method.toLowerCase(),
		pathname = reqUrl.pathname.slice(1),
        intfExists = true,data
	if(method === 'get'){
        query = reqUrl.query
		switch(pathname){
			case 'userList':
                data = {offset: query.offset, limit: query.offset, uid: query.offset }
                break
			case 'song':
				data = {id : query.id, ids: '[' + query.id + ']'}
                console.log(data)
				break
            case 'userList':
                data = {offset: query.offset, limit: query.limit, uid: query.uid }
                break
            case 'artist':
                data = query.artist
                break
            case 'album':
                data = query.album
                break
            case 'playList':
                data = {cat: query.category, order: query.order, offset: query.offset, total: !!query.offset, limit: query.limit }
                break
            case 'playListDetail':
                data = {id: query.id}
                break
            default:
                intfExists = false
                break
		}
        if(intfExists){
            request({
                path: api[pathname],
                method: method,
                data: data
            },function(err,response){
                if(err){}
                res.writeHead(200,{
                    'Access-Control-Allow-Origin': req.headers['origin'],
                    'Access-Control-Allow-Credentials': true,
                    'Content-Type': 'application/json',
                    'Content-Length': response.length
                })
                res.end(response)
            })
        }
	}
	if(method === 'post'){
        getData(req,function(err,query){
            query = queryString.parse(query)
            if(pathname === 'search'){
                // 搜索单曲(1)，歌手(100)，专辑(10)，歌单(1000)，用户(1002) *(type)*
                data = {'s': query.s, 'type': query.type || 1, 'offset': query.offset || 0, 'total': query.total || true, 'limit': 60 }
            }else if(pathname === 'login'){
                data = {username: query.username, password: crypto.createHash('md5').update(query.password).digest('hex'), rememberLogin: true }
            }else{
                intfExists = false
            }
            if(intfExists){
                request({
                    path: api[pathname],
                    method: method,
                    data: data
                },function(err,response){
                    if(err){}
                    res.writeHead(200,{
                        'Access-Control-Allow-Origin': req.headers['origin'],
                        'Access-Control-Allow-Credentials': true,
                        'Content-Type': 'application/json',
                        'Content-Length': response.length
                    })
                    res.end(response)
                })
            }
        })
	}
    if(method === 'options'){
        res.writeHead(200,{
            'Access-Control-Allow-Origin': req.headers['origin'],
            'Access-Control-Allow-Credentials': true,
            // 'Access-Control-Allow-Headers': 'Content-Type'
        })
        res.end()
    }
}).listen(post)

