// localStorage,cookie
// 不能把cookies域属性设置成与设置它的服务器的所在域不同的值。
define('storage',function(exports){
	// cookie.js
	var cookie = {
		setCookie: function(config){
			if(!config){return}
			var expires = '; expires=' + new Date(+new Date() + config.expires * 24 * 3600 * 1000).toGMTString()
			return document.cookie = encodeURIComponent(config.name) + "=" + encodeURIComponent(config.value) + expires + (config.domain ? '; domain=' + config.domain : '') + (config.path ? '; path=' + config.path : '') + (config.secure ? '; secure' : '');
		},
		getCookie: function(name){
			return decodeURIComponent(document.cookie.replace(new RegExp('.*(?:^|; )' + name + '=([^;]*).*|.*'), '$1'))
		},
		removeCookie: function(name){
			// expires=Thu, 01 Jan 1970 00:00:00 GMT
			var value = this.getCookie(name)
			if(value){
				return document.cookie = name + '=' + value + '; expires=' + 'Thu, 01 Jan 1970 00:00:00 GMT'
			}
		}
	}
	// storage.js
	// 通过localStorage存储的数据是永久性的,除非手动删除个人信息，遵循同源可访问规则，作用域取决于是否同源（文档源）。（子域也不能跨域）
	var storage = {}
	;['setItem','getItem','removeItem'].forEach(function(key){
		storage[key] = localStorage[key].bind(localStorage)
	})
	storage.clearItem = localStorage['clear'].bind(localStorage)
	storage.storageKeys = function(){
		return Object.keys(localStorage)
	}
	storage.hasItem = function(key){
		return this.getItem(key) !== null
	}
	// exports
	var extend = function(a,b){
		for(var i in b){
			if(b.hasOwnProperty(i)){
				a[i] = b[i]
			}
		}
	}
	extend(exports,cookie)
	extend(exports,storage)
	console.log('storage加载完毕')
})