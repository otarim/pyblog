// ownerDocument属性返回当前节点所在的文档的文档节点.
define('dom',['util'],function(util,exports){
	var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;
	var support = (function(){
		var support = {}
		// Check if an input maintains its value after becoming a radio
		// Support: IE9, IE10
		input = document.createElement('input')
		input.value = 't';
		input.type = 'radio';
		support.radioValue = input.value === 't'
		support.matchesSelector = (function(){
			var docElem = document.documentElement
			var matches = docElem.matches ||
				docElem.webkitMatchesSelector ||
				docElem.mozMatchesSelector ||
				docElem.oMatchesSelector ||
				docElem.msMatchesSelector
			return matches.name
		})()
		return support
	})()
	var E = function(selector,context){
		var self = this,elem;
		if (!selector) {
			return this
		}
		if(!(self instanceof E)){
			self = Object.create(E.prototype);
		}
		if(util.isString(selector)){
			if(selector[0] === '<' && selector[selector.length - 1] === '>' && selector.length >= 3){
				match = [null,selector,null];

			} else {
				match = rquickExpr.exec(selector);
			}
			if(match && (match[1] || !context)){
				if(match[1]){
					elem = util.parseHTML(selector);
					if(elem.length){
						// not arrayLike,can't extend length property
						self.length = elem.length;
						util.extend(self,elem);
					}
				}else{
					elem = document.getElementById(match[2]);
					if (elem) {
						self.length = 1;
						self[0] = elem;
					}
				}
			}else{
				context = context || document;
				return util.extend(self,context.querySelectorAll(selector))
			}
		}else if(selector.nodeType){
			self.length = 1;
			self[0] = selector;
		}else{
			selector = util.makeArray(selector)
			self.length = selector && selector.length
			util.extend(self,selector)
		}
		return self;
	}
	E.prototype = {
		constructor: E,
		append: function(){
			return this.get(arguments,function(elem){
				this.appendChild(elem)
			})
		},
		prepend: function(){
			return this.get(arguments,function(elem){
				this.insertBefore(elem,this.firstChild)
			})
		},
		before: function(){
			return this.get(arguments,function(elem){
				this.parentNode && this.parentNode.insertBefore(elem,this)
			})
		},
		after: function(){
			return this.get(arguments,function(elem){
				this.parentNode && this.parentNode.insertBefore(elem,this.nextSibling)
			})
		},
		empty: function(){
			return this.text('')
		},
		each: function(callback){
			var l = this.length
			if(l){
				for(var i = 0;i < l; i++){
					callback.call(this[i],i)
				}
			}
			return this
		},
		wrap: function(html){
			// 根据传参生成 dom 节点，将 this 插入 dom 节点的最里层（firstElementChild）
			if(util.isFunction(html)){
				return this.wrap(html.call(this))
			}
			html = util.parseHTML(html)[0]
			this.each(function(){
				// 保存副本，否则 append 的都是同一个
				var el = html.cloneNode(true)
				var elem = el
				while(elem.firstElementChild){
					elem = elem.firstElementChild
				}
				this.parentNode && this.parentNode.insertBefore(el,this)
				elem.appendChild(this)
				el = elem = null
			})
			html = null
			return this

		},
		unwrap: function(){
			// replaceChild,如果是 nodes 用 fragment 覆盖
			var self = this
			return this.each(function(){
				if(this.nodeName.toLowerCase() !== 'body'){
					self.replaceWith(this.childNodes)
				}
			})
		},
		// wrapInner: function(){
		// 	// 将子元素遍历插入
		// },
		html: function(value){
			if(typeof value === 'undefined'){
				var ret = []
				this.each(function(){
					ret.push(this.innerHTML || '')
				})
				return (ret.length > 1) ? ret : ret[0]
			}
			return this.get(arguments,function(elem){
				this.textContent = ''
				this.appendChild(elem)
			})
		},
		text: function(value){
			if(typeof value === 'undefined'){
				var ret = []
				this.each(function(){
					ret.push(this.textContent || '')
				})
				return (ret.length > 1) ? ret : ret[0];
			}else{
				return this.each(function(){
					this.textContent = value;
				})
			}
		},
		contains: function(el){
			return util.contains(this[0],util.makeArray(el)[0])
		},
		addClass: function(classname){
			classname = [].concat(classname)
			return this.each(function(){
				var classList = this.classList
				classList.add.apply(classList,classname)
			})
		},
		removeClass: function(classname){
			classname = [].concat(classname)
			return this.each(function(){
				var classList = this.classList
				classList.remove.apply(classList,classname)
			})
		},
		toggleClass: function(classname){
			return this.each(function(){
				this.classList.toggle(classname)
			})
		},
		hasClass: function(classname){
			var ret = true
			classname = [].concat(classname)
			this.each(function(){
				var classList = this.classList
				if(classList.contains.apply(classList,classname) === false){
					ret = false
				}
			})
			return ret
		},
		data: function(prop,value){
			var ret = []
			if(typeof value === 'undefined' && util.isString(prop)){
				this.each(function(){
					ret.push(this.dataset[prop])
				})
				return (ret.length > 1) ? ret : ret[0];
			}else{
				if(util.isString(prop)){
					return this.each(function(){
						this.dataset[prop] = value
					})
				}else{
					return this.each(function(){
						util.each(prop,function(value,prop){
							this.dataset[prop] = value
						},this)
					})
				}
			}
		},
		replaceWith: function(){
			return this.get(arguments,function(elem){
				this.parentNode.replaceChild(elem,this)
			})
		},
		attr: function(name,value){
			if(typeof value === 'undefined'){
				// get
				// selected,disabled,hidden,checked
				var ret = []
				this.each(function(){
					ret.push(this.getAttribute(name) || undefined)
				})
				return ret.length > 1 ? ret : ret[0] 
			}else{
				// set
				return this.each(function(){
					var nType = this.nodeType
					if(nType === 2 || nType === 3 || nType === 8){
						return
					}
					if(value === null){
						// removeAttribute
						return this.removeAttribute(name)
					}else{
						return this.setAttribute(name,value + '');
					}
				})
			}
		},
		removeAttr: function(name){
			return this.each(function(){
				this.removeAttribute(name)
			})
		},
		val: (function(){
			var hooks = {
				option: {
					get: function(){
						// ie 下，option 无 value 属性，获取 value 为空，返回他的 text 值
						return this.getAttribute('value') || this.text.trim() || undefined
					}
				},
				select: {
					get: function(){
						// 默认 select type 为 select-one,通过 selectIndex 获取值
						// multiple 通过判断 selected 返回数组
						// size 露出的数量
						// disabled 不选择
						var options = this.options,
							index = this.selectedIndex
							one = this.type.toLowerCase() ==='select-one' //默认无 selected
							ret = one ? '' : []
						for(var i = 0,l = one ? index + 1 : options.length; i < l; i++){
							var option = options[i]
							if((option.selected || i === index) && !option.disabled){
								if(one){
									// ie 下 value 为空使用 text 获取的问题	
									return option.value
								}else{
									ret.push(option.value)
								}
							}
						}
						return ret.length ? ret : null
					},
					set: function(value){
						var options = this.options,
							len = options.length,
							selected;
						value = [].concat(value)
						while(len--){
							var option = options[len]
							if(option.selected = util.contains(value,option.value) && !option.disabled){
								selected = true
							}
						}
						if(!selected){
							this.selectedIndex = -1
						}
					}
				}
			}
			util.each(['radio','checkbox'],function(el){
				hooks[el] = {
					get: function(){
						// Check the default checkbox/radio value ("" on old WebKit; "on" elsewhere) if value not exists
						return this.getAttribute('value') === '' ? 'on' : this.value
					}
				}
			})
			return function(value){
				if(typeof value === 'undefined'){
					// get
					var ret = []
					this.each(function(){
						var nName = this.nodeName.toLowerCase()
						if(hooks[nName] && hooks[nName]['get']){
							ret.push(hooks[nName]['get'].call(this)) 
						}else{
							ret.push(this.value)
						}
					})
					return ret.length > 1 ? ret : ret[0]
				}else{
					// set
					return this.each(function(){
						var nName = this.nodeName.toLowerCase()
						if(hooks[nName] && hooks[nName]['set']){
							hooks[nName]['set'].call(this,value + '')
						}else{
							this.value = value + ''
						}
					})
				}
			}
		})(),
		get: function(args,callback){
			var l,ret
			if(typeof callback === 'undefined'){
				callback = args
				args = null
			}else{
				args = E.buildFragment(args[0])
			}
			if(l = this.length){
				for(var i = 0;i < l; i++){
					callback.call(this[i],args,i)
				}
			}
			args = null
			return this
		},
		is: function(){

		},
		serialize: function(){

		}
	}
	// dom节点操作
	var walkDom = function(elem,condition){
		var ret = [],
			el = elem[condition]
		while(el && el!==document){
			ret.push(el)
			el = el[condition]
		}
		return ret
	}
	var filterDom = function(elems,condition){
		// elem.matchesSelector
		var ret = []
		elems = util.makeArray(elems)
		elems.forEach(function(elem){
			if(elem[support.matchesSelector](condition)){
				ret.push(elem)
			}
		})
		return ret;
	}
	var wrapE = function(selector){
		var wraper = new E
		if(selector.length){
			selector = util.makeArray(selector)
			util.extend(wraper,selector)
			// 数组的 length 无法被复制
			wraper.length = selector.length
		}
		return wraper
	}
	util.each({
		parent: function(){
			return this.parentNode
		},
		next: function(){
			return this.nextElementSibling
		},
		prev: function(){
			return this.previousElementSibling
		},
		nextAll: function(){
			return walkDom(this,'nextElementSibling')
		},
		prevAll: function(){
			return walkDom(this,'previousElementSibling')
		},
		children: function(){
			return this.children
		},
		contents: function(){
			return this.childNodes
		},
		parents: function(){
			return walkDom(this,'parentNode')
		},
	},function(fn,prop){
		E.prototype[prop] = function(selector){
			var ret = []
			this.each(function(){
				var matched = selector ? filterDom(fn.call(this),selector) : fn.call(this)
				matched = util.makeArray(matched)
				if(matched){
					ret = ret.concat.apply(ret,matched)
				}
			})
			return wrapE(ret)
		}
	})
	E.prototype.closest = function(selector){
		var ret = []
		this.each(function(){
			var el = this.parentNode
			while(el && el!==document){
				if(el[support.matchesSelector](selector)){
					ret.push(el)
					break
				}
				el = el.parentNode
			}
		})
		return wrapE(ret)
	}
	E.buildFragment = function(domList){
		var d = document.createDocumentFragment();
		if(util.isString(domList)){
			domList = util.makeArray(util.parseHTML(domList))
		}else if(util.isArrayLike(domList)){
			domList = util.makeArray(domList)
		}else{
			domList = [].concat(domList);
		}
		util.each(domList,function(dom){
			// 非复制引用
			d.appendChild(dom)
		})
		return d;
	}
	exports.E = E
	exports.support = support
	exports.get = function(ele,context){
		// var a = new E();
		return E(ele,context)
	}
	console.log('dom加载完毕')
})