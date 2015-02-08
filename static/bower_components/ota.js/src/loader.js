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
		if(mods[mod]){
			// 防止并发问题，确保只定义一次 module
			return
		}
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
		 	loaded: false,
		 	callback: callback,
		 	// callbackLoaded: false
		 } 
	}

	function require(requires,callback){
		// var depends = getDepends(requires)
		new Module(requires,callback)
	}
	function Module(requires,callback){
		this.requires = [].concat(requires)
		this.callback = callback
		this.run()
	}
	Module.prototype = {
		run: function(){
			var mods = modules,
				self = this
			new Depends(this.requires,function(dependList){
				dependList.forEach(function(modName){
					var module = mods[modName]
					if(module.loaded) return
					var requireMods = module.requires.map(function(mod){
						return mods[mod].exports
					})
					module.callback.apply(null,requireMods.concat(module.exports))
					module.loaded = true
				})
				var requireMods = self.requires.map(function(mod){
					return mods[mod].exports
				})
				return self.callback && self.callback.apply(null,requireMods)
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
	function Depends(requires,callback){
		this.requires = requires
		this.callback = callback
		this.dependList = {}
		this.waiting = 0
		this.init()
	}
	Depends.prototype = {
		init: function(){
			this.getDepend(this.requires)
		},
		getDepend: function(requires){
			var mods = modules,
				self = this
			this.waiting += requires.length
			requires.forEach(function(require){
				// console.log(require)
				if(mods[require]){
					return self.makeDependList(require)
				}else{
					return new Mod(require,function(){
						return self.makeDependList(require)
					})
				}
			})
		},
		makeDependList: function(modName){
			var mods = modules
			this.waiting--
			if(mods[modName].requires.length){
				this.dependList[modName] = mods[modName].requires
				return this.getDepend(mods[modName].requires)
			}else{
				return this.checkDone()
			}
		},
		checkDone: function(){
			if(!this.waiting){
				// alert('done')
				this.callback && this.callback(this.flatDepend(this.requires))
			}
		},
		flatDepend: function(mods){
			var ret = []
			var depends = this.dependList
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
			;[].concat(mods).forEach(function(depend){
				ret = ret.concat(depend,findDepends(depend)) 
			})
			return this.uniqueDepend(ret)
		},
		uniqueDepend: function(dependList){
			var depend,loaded = {},ret = []
			while(depend = dependList.pop()){
				if(!loaded[depend]){
					loaded[depend] = true
					ret.push(depend)
				}
			}
			return ret
		}
	}
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