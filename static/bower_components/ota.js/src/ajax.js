define('ajax',['util'],function(util,exports){
	// promise
	// Promise.all 全部完成触发 then
	// Promise.race 哪个先触发 reject 或者 resolve 触发then
	// Promise.reject 将对象转变为 promise 对象
	// Promise.resolve 将对象转变为 promise 对象
	var rnoContent = /^(?:get|head)$/
	var ajax = function(config){
		var type = config.type
		var useFormData = config.useFormData && util.isObject(config.data)
		var needContentType = config.contentType && !rnoContent.test(type) //文件上传无需 content-type,自动设置
		var data = config.data
		var crossdomain = getUrlHost(config.url) !== location.host
		var dataType = config.dataType || ''
		var traditional = config.traditional
		
		if(data){
			if(type === 'get'){
				if(util.isObject(data)){
					data = encodeData(data,traditional)
				}
				config.url = addQuery(config.url,data)
				data = null
			}else{
				// formData
				if(useFormData){
					data = makeFormData(data,traditional)
				}else{
					// add Content-Type
					data = encodeData(data,traditional)
				}
			}
		}

		if(dataType.toLowerCase() === 'jsonp'){
			var jsonpCallback = config.jsonpCallback
			if(!jsonpCallback){
				jsonpCallback = 'misakaCallback' + (config.fresh ? util.now() : '')
			}
			window[jsonpCallback] = window[jsonpCallback] || function(){
				config.success && config.success.apply(null,[].slice.call(arguments))
				setTimeout(function(){
					delete window[jsonpCallback]
				},100)
			}
			config.url = addQuery(config.url,config.jsonp + '=' + jsonpCallback)
			return getScript(config.url,null,config.error,{
				charset: config.charset
			})
		}

		var ajaxPromise = new Promise(function(resolve,reject){
			var xhr = new XMLHttpRequest,upload
			xhr.open(type,config.url,config.async)
			if(crossdomain){
				if(config.crossdomain){
					xhr.withCredentials = true
				}
				delete config.headers['X-Requested-With']
			}
			if(needContentType){
				// 大小写差异，不规范需要 allow-headers
				xhr.setRequestHeader('Content-Type',config.contentType)
			}
			if(!useFormData){
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
			}
			if(config.headers){
				util.each(config.headers,function(header,key){
					xhr.setRequestHeader(key,header)
				})
			}
			if(config.timeout){
				xhr.timeout = config.timeout
			}
			xhr.onload = function(){
				resolve({
					value: this.responseText,
					dataType: dataType,
					onloadCallback: config.success,
					xhr: this
				})
			}
			xhr.ontimeout = xhr.onerror = function(e){
				reject({
					value: e,
					errorCallback: config.error,
					xhr: this
				})
			}
			if(config._upload){
				// 是否文件上传
				upload = xhr.upload
				// upload.onload = xhr.onload.bind(upload)
				// upload.onerror = xhr.onerror.bind(upload)
				upload.onprogress = function(e){
					if(e.lengthComputable){
						config.progress && config.progress(e.loaded,e.total)
					}
				}
			}
			xhr.send(data)
		})

		ajaxPromise.then(function(data){
			if(data.dataType.toLowerCase() === 'json'){
				data.value = JSON.parse(data.value)
			}
			// 露出 xhr,用于 getResponseHeader
			return data.onloadCallback(data.value,data.xhr)
		},function(err){
			return err.errorCallback(err.value,err.xhr)
		}).catch(function(err){
			// 异常处理？
			throw new Error(err.message)
		})

		return ajaxPromise;
		
	}
	var ajaxSetup = function(config){
		var defaultConfig = {
			type: 'get',
			// contentType: 'application/x-www-form-urlencoded; charset=UTF-8', //使用 formData,无需设定
			headers: {
	            'X-Requested-With': 'XMLHttpRequest'
	        },
	        charset: 'utf-8',
	        fresh: true,
	        async: true,
	        timeout: null,
	        crossdomain: false,
	        traditional: false,
	        jsonp: 'callback',
	        useFormData: true
		}
		config.type = config.type || defaultConfig.type.toLowerCase()
		config = util.extend(config,defaultConfig,true)
		return ajax(config)
	}
	var uploadSetup = function(config){
		var defaultConfig = {
			type: 'post',
			headers: {
	            'X-Requested-With': 'XMLHttpRequest'
	        },
	        async: true,
	        timeout: null,
	        chunked: false, //分块上传 http://www.html5rocks.com/zh/tutorials/file/xhr2/
	        crossdomain: false,
	        _upload: true,
	        useFormData: true
		}
		config = util.extend(config,defaultConfig,true)
		return ajax(config)
	}

	var getScript = function(url,onload,onerror,extra){
		if(typeof extra === 'undefined' && util.isObject(onerror)){
			extra = onerror
			onerror = null;
		}
		var s = document.createElement('script'),
			head = document.getElementsByTagName('head')[0]
		s.async = true;
		s.onload = function(){
			head.removeChild(s)
			onload && onload()
			s = null
		}
		s.onerror = function(e){
			head.removeChild(s)
			onerror && onerror(e)
			s = null
		}
		extra && util.each(extra,function(value,property){
			s[property] = extra[property]
		})
		s.src = url
		head.appendChild(s)
	}

	var getUrlHost = (function(){
		var a = document.createElement('a')
		return function(url){
			a.href = url
			return a.host
		}
	})()
	function encodeData(data,traditional){
		if(util.isString(data)){return data.replace(/\+/g,'%2B')}
		var ret = [];
		util.each(data,function(d,key){
			if(util.isArray(d) || util.isArrayLike(d)){
				var _key = traditional ? key : key + '[]'
				util.each(d,function(_d){
					if(util.isString(_d)){
						_d = encodeURIComponent(_d)
					}
					ret.push(_key + '=' + _d)
				})
			}else{
				ret.push(key + '=' + encodeURIComponent(d))
			}
		})
		return ret.join('&')
	}
	function makeFormData(data,traditional){
		// formdata 无需编码属性名
		// formdata 无需编码
		var formData = new FormData
		util.each(data,function(d,prop){
			if(util.isArray(d) || util.isArrayLike(d)){
				var _prop = traditional ? prop : prop + '[]'
				util.each(d,function(_d){
					// if(util.isString(_d)){
					// 	_d = encodeURIComponent(_d)
					// }
					formData.append(_prop,_d)
				})
			}else{
				formData.append(prop,(d))
			}
		})
		return formData
	}
	function addQuery(url,data){
		data = data.replace(/\+/g,'%2B')
		if(url.indexOf('?') !== -1){
			url += '&' + data
		}else{
			url += '?' + data
		}
		return url
	}
	exports.ajax = ajaxSetup
	exports.getScript = getScript
	exports.fileUpload = uploadSetup
	console.log('ajax加载完毕')
})