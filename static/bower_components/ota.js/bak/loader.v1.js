// 模块加载器

(function(exports,undefined){
	var modules = {}
	var config = {
		path: getCurPath(), //默认使用 loader 的目录
		alias: {}
	}
	var loader = function(conf){
		for(var i in conf){
			if(conf.hasOwnProperty(i)){
				config[i] = conf[i]
			}
		}
	}
	function Queue(q){
		if(!(this instanceof Queue)){
			return new Queue(q)
		}
		this.waiting = [].concat(q)
		this.todo = this.waiting.length
	}
	Queue.prototype = {
		constructor : Queue,
		run: function(){
			var self = this
			this.waiting.forEach(function(todo){
				// next交由外部调用，将 this 传过去
				todo(self.check.bind(self))
			})
		},
		check: function(){
			this.todo--
			if(!this.todo){
				this.callback()
			}
		},
		done: function(callback){
			this.callback = callback
			this.run()
		}
	}
	function loadJs(url,callback,extra){
		var s = document.createElement('script'),
			head = document.getElementsByTagName('head')[0]
		s.async = true
		s.onload = function(){
			head.removeChild(s)
			callback && callback()
			s = null
		}
		extra && Object.keys(extra).forEach(function(property){
			s[property] = extra[property]
		})
		s.src = url
		head.appendChild(s)
	}
	function define(mod,requires,callback){
		var mods = modules,requireMods = []
		 if(typeof callback === 'undefined'){
		 	callback = requires
		 	requires = []
		 }else{
		 	requires = [].concat(requires)
		 }
		 mods[mod] = {
		 	name: mod,
		 	requires: requires,
		 	exports: {},
		 	callback: callback
		 } 
	}

	function require(requires,callback){
		// var depends = getDepends(requires)
		new Module(requires,callback)
	}
	function Module(requires,callback){
		this.requires = [].concat(requires)
		this.depends = getDepends(requires)
		this.modCallback = {}
		this.callback = callback
		this.run()
	}
	Module.prototype = {
		run: function(){
			var mods = modules,
				self = this
			var depends = [],
				dependList = this.depends.slice(),depend
			// 确保依赖按顺序执行
			while(depend = dependList.pop()){
				if(mods[depend]){
					if(!self.modCallback[depend]){
						self.modCallback[depend] = true
					}
					depends.push(function(next){
						next()
					})
					continue
				}
				self.modCallback[depend] = true //自动过滤重复模块引用
				depends.push(function(depend){
					return function(next){
						new Mod(depend,next)
					}
				}(depend))
			}
			Queue(depends).done(function(){
				for(var modName in self.modCallback){
					if(self.modCallback.hasOwnProperty(modName)){
						var module = mods[modName]
						var requireMods = module.requires.map(function(mod){
							return mods[mod].exports
						})
						module.callback.apply(null,requireMods.concat(module.exports))	
					}
				}
				var requireMods = self.requires.map(function(mod){
					return mods[mod].exports
				})
				return self.callback.apply(null,requireMods)
			})
		}
	}
	function Mod(name,callback){
		this.modName = name
		this.status = 'fetching'
		this.callback = callback
		this.load()
	}
	Mod.prototype = {
		load: function(){
			var self = this
			loadJs(getAliasPath(this.modName),function(){
				self.status = 'loaded'
				self.callback()
			})
		}
	}
	var getDepends = (function(){
		// 循环引用的问题
		var depends = {}
		var findDepends = function(mod){
			if(!depends[mod]){
				return []
			}
			var ret = []
			;[].concat(depends[mod]).forEach(function(depend){
				ret.indexOf(depend) === -1 && ret.push(depend)
				ret = ret.concat(findDepends(depend))
			})
			return ret
		}
		return function(mods){
			var ret = []
			depends = config.depend || {}
			;[].concat(mods).forEach(function(depend){
				ret = ret.concat(depend,findDepends(depend)) 
			})
			return ret
		}

	})()
	function getAliasPath(modName){
		return config.alias[modName] || config.path && config.path + modName + '.js'
	}
	function getCurPath(){
		var scripts = document.scripts,
			curScript = scripts[scripts.length - 1]
		return dirname(curScript.src || location.href)
	}
	function dirname(path){
		return path.match(/[^?#]*\//)[0]
	}
	exports.define = define
	exports.require = require
	exports.otaLoader = loader
})(this)