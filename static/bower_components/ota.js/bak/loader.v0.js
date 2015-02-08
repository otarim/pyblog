;(function(exports,undefined){
	var slice = Array.prototype.slice;
	var concat = Array.prototype.concat;
	var modules = {};
	var currentPath = getPath(getCurrentScriptSrc());
	var config = {};

	var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g;
	var Module = function(modules){
		this.waiting = slice.call(modules);
		this.done = false;
	}
	Module.prototype = {
		constructor: Module,
		dequeue: function(){

		}

	}

	var require = function(module,callback){
		// 将 require 中的模块转为绝对路径 hash
		// module = parsePath(module);
		if(modules[module]){
			setTimeout(function(){
				callback(modules[module].exports);
			},0)
		}else{
			loadJs(module,function(){
				var exports = modules[module].exports = {};
				callback(modules[module]);
			})
		}
	}

	var define = function(callback){
		var module = getCurrentScriptSrc();
		modules[module] = {}
		var exports = modules[module].exports = {};
		callback(require,modules[module],exports);
	}

	// var Q = function(){
	// 	this.waiting = [];
	// 	this.done = false;
	// }
	// Q.prototype = {

	// }
	// define
	// require
	// misaka.config({
	// 		path: '',
	// 		alias: {
	// 		}
	// })
	// misaka.use
	var misaka = {
		config: function(conf){
			config.path = conf.path || currentPath;
			config.alias = conf.alias
		},
		// misaka.use([a,b,c],function(a,b,c){})
		use: function(mods,callback){
			// var module = new Module(concat.call(modules));
			// Module.dequeue(function(){

			// })
			loadJs(mods);
		}
	}
	var isType = (function(){
		var getType = function(input,type){
			return ({}).toString.call(input) === '[object ' + type + ']';
		}
		return {
			array: function(input){
				return getType(input,'Array')
			},
			object: function(input){
				return getType(input,'Object')
			}
		}
	})
	function getCurrentScriptSrc(){
		var currentScript = slice.call(document.scripts).pop();
		if(currentScript.src){
			return currentScript.src;
		}else{
			return location.href;
		}
	}
	function getPath(src){
		return src.match(/[^?#]*\//)[0];
	}
	function forEach(obj,callback){
		if(isType.array(obj)){
			return obj.forEach(function(el){
				callback(el)
			});
		}else if(isType.object(obj)){
			for(var i in obj){
				if(obj.hasOwnProperty(i)){
					callback(obj[i]);
				}
			}
		}
	}
	function loadJs(url,callback){
		var s = document.createElement('script');
		s.async = true;
		s.onload = function(){
			s.onload = null;
			callback && callback();
			s.parentNode.removeChild(s);
			s = null;
		}
		s.src = url;
		document.getElementsByTagName('head')[0].appendChild(s);
	}
	exports.define = define;
	exports.misaka = misaka;
})(this)