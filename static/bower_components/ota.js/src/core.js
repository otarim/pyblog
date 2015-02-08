define('core',['dom','event','util','ajax','storage','style','animate'],function(dom,event,util,ajax,storage,style,animate,exports){
	var add = function(mods){
		mods = [].concat(mods);
		util.each(mods,function(mod){
			util.extend(exports,mod)
		})
		return add;
	}
	var ready = function(callback){
		dom.get(window).one('load',callback)
	}
	add([util,ajax,dom,storage])
	exports.version = '1.0'
	exports.author = 'otarim'
	exports.ready = ready
	console.log('core加载完毕')
})