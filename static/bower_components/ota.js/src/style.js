define('style',['dom','util','event'],function(dom,util,event,exports){
	var domProto = dom.E.prototype,
		$ = dom.get
	var getComputedStyle = window.getComputedStyle,
		camelize = function(prop){
			return prop.replace(/-([a-z])/gi,function(all,letter){return letter.toUpperCase()})
		},
		dasherize = function(str){
			// 格式化属性名
		    return str.replace(/::/g, '/')
		           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
		           .replace(/_/g, '-')
		           .toLowerCase()
	    }
	domProto.css = function(obj){
		if(!obj){ return this}
		if(util.isObject(obj)){
			// set
			var styleText = '',
				removedProp = []
			util.each(obj,function(value,prop){
				if(!value && value !== 0){
					// removeProperty 删除 style
					removedProp.push(prop)
				}else{
					styleText += dasherize(prop) + ':' + value + ';'
				}
			})
			this.each(function(){
				var style = this.style
				removedProp.forEach(function(prop){
					style.removeProperty(prop)
				})
				style.cssText += styleText
			})
		}else{
			var ret = {},
				el = this[0]
			if(util.isString(obj)){
				return el.style[camelize(obj)] || getComputedStyle(el,'').getPropertyValue(obj)
			}else if(util.isArray(obj)){
				obj.forEach(function(prop){
					// 优先获取 style 标签中的属性
					ret[prop] = el.style[camelize(prop)] || getComputedStyle(el,'').getPropertyValue(prop)
				})
				return ret	
			}
		}
		return this
	}
	domProto.offset = function(obj){
		// document.documentElement.scrollTop
		var obj = this[0].getBoundingClientRect()
		return {
			left: obj.left + window.pageXOffset,
			top: obj.top + window.pageYOffset,
			width: Math.round(obj.width),
			height: Math.round(obj.height)
		}
	}
	util.each({
		scrollTop: {
			method: 'pageYOffset',
			fallback: function(value){
				this.scrollTo(this.scrollX,value)
			}
		},
		scrollLeft: {
			method: 'pageXOffset',
			fallback: function(value){
				this.scrollTo(value,this.scrollY)
			}
		}
	},function(type,fn){
		domProto[fn] = function(value){
			// window.scrollTo document.body.scrollTop
			if(typeof value === 'undefined'){
				// fix body.scrollTop
				return (fn in this[0]) ? (this[0] === document.body ? (this[0][fn] + document.documentElement[fn]) : this[0][fn]) : this[0][type.method]
			}else{
				return this.each(function(){
					if(fn in this){
						if(this === document.body){
							this[fn] = document.documentElement[fn] = value
						}else{
							this[fn] = value
						}
					}else{
						type.fallback.call(this,value)
					}
				})
			}
		}
	})
	;['width','height'].forEach(function(fn){
		// dealwith window,document
		var UpperCaseValue = fn.replace(/./,function(m){return m.toUpperCase()})
		domProto[fn] = function(value){
			var ret = [],self = this
			if(util.isUndefined(value)){
				var el = this[0],ret
				if(util.isWindow(el)){
					ret = el['inner' + UpperCaseValue]
				}else if(el === document){
					ret = el.documentElement['scroll' + UpperCaseValue]
				}else{
					// return first el
					ret = this.offset()[fn]
				}
				return ret
			}else{
				var setCss = {}
				setCss[fn] = value
				return this.css(setCss)
			}
		}
	})
	domProto.hide = function(){
		return this.css({display: 'none'})
	}
	domProto.show = function(){
		// getComputedStyle('display','') --> none?
		return this.css({display: ''})
	}
	domProto.toggle = function(){
		return this.each(function(){
			var $this = $(this)
			$this.css('display') === 'none' ? $this.show() : $this.hide()
		})
	}
	console.log('style加载完毕')
})