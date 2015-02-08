define('event',['dom','util'],function(dom,util,exports){
	// 包装 event,修复 which,wheeldetal
	// focus 捕获操作
	// on,off,trigger
	var eventMethods = {
		preventDefault: 'isDefaultPrevented',
		stopImmediatePropagation: 'isImmediatePropagationStopped',
		stopPropagation: 'isPropagationStopped'
	}
	var fixEvent = function(event){
		event.timeStamp = event.timeStamp || util.now()
		if(!event.target){
			// fixfox
			event.target = event.srcElement || document
		}
		if(event.target.nodeType === 3){
			// safari
			event.target = event.target.parentNode
		}
		if(event.which === null){
			// w3c
			event.which = event.charCode !== null ? event.charCode : event.keyCode
		}
		// pageX = clientX + scrollLeft (处理 ie backCompat 2px)
		event.metaKey = !!event.metaKey
		// fix mousewheel
		if(event.type === 'mousewheel'){
			if('wheelDelta' in event){
				// 统一 wheelDetal 为 120
				event.delta = Math.round(event.wheelDelta) / 120
			}else if('detail' in event){
				event.wheelDetal = -event.detail * 40
				event.delta = event.wheelDetal / 120
			}
		}
		util.each(eventMethods,function(fn,name){
			var originFn = event[name]
			event[name] = function(){
				event[fn] = function(){return true}
				originFn && originFn.call(event)
			}
			event[fn] = function(){return false}
		})
		return event
	}
	var domProto = dom.E.prototype,
		E = dom.E,
		$ = dom.get,
		support = dom.support,
		eventKey = 'otaEventId',
		cache = util._cache
	var getTarget = function(target,match){
		var ret
		while(target !== document){
			if(target[support.matchesSelector](match)){
				ret = target
				break
			}
			target = target.parentNode
		}
		return ret
	}
	domProto.on = function(type,match,callback){
		if(typeof callback === 'undefined'){
			callback = match
			match = undefined
		}
		var types = type.split(' '),
			useCapture = match ? /^(focus|blur)$/.test(type) : false
		this.each(function(){
			var eventId = this[eventKey],
				self = this
			if(!eventId){
				eventId = this[eventKey] = ++util.uuid
				cache[eventId] = {}
			}
			types.forEach(function(type){
				if(cache[eventId][type]){
					cache[eventId][type]['condition'].push(match)
					cache[eventId][type]['callback'].push(callback)
				}else{
					var handlers = cache[eventId][type] = {
						condition: [match],
						callback: [callback]
					}
					handlers.handlerFn = function(e){
						e = fixEvent(e)
						if(e.isImmediatePropagationStopped()){return}
						var target = e.target,
							originEvent = e,result,el
						e = e._args ? [e].concat(e._args) : [e] //handler customEvent's args
						handlers['callback'].forEach(function(callback,index){
							if(handlers['condition'][index]){
								if(el = getTarget(target,handlers['condition'][index])){
									result = callback.apply(el,e)
								}else{
									return
								}
							}else{
								result = callback.apply(self,e)
							}
							if(result === false){
								originEvent.preventDefault()
								originEvent.stopPropagation()
							}
						})
						return result
					}
					self.addEventListener(type,handlers.handlerFn,useCapture)
				}
			})
		})
		return this
	}
	// dom.off('click','#a',function(){})
	// dom.off('click')
	// dom.off('click',function(){})
	// dom.off()
	domProto.off = function(type,match,callback){
		if(typeof type !== 'undefined'){
			if(typeof callback === 'undefined'){
				callback = match
				match = undefined
			}
		}
		this.each(function(){
			var eventId = this[eventKey],eventHub = cache[eventId]
			if(type){
				var eventType = eventHub[type]
				if(eventType){
					if(match || callback){
						var matched = match ? 'condition' : 'callback'
						// .off('click','a')
						if((index = eventHub[type][matched].indexOf(match || callback)) !== -1){
							eventHub[type]['callback'].splice(index,1)
							eventHub[type]['condition'].splice(index,1)	
						}
					}
					if(!eventHub[type]['callback'].length || !callback && !match){
						this.removeEventListener(type,eventHub[type].handlerFn,false)
						eventHub[type]['condition'] = eventHub[type]['callback'] = eventHub[type]['handlerFn'] = null
						delete eventHub[type]
						if(util.isEmptyObject(eventHub)){
							delete cache[eventId]
							delete this[eventKey]	
						}
					}	
				}
			}else{
				// 遍历全部事件，unbind
				var self = this
				util.each(eventHub,function(eventType,type){
					self.removeEventListener(type,eventType.handlerFn,false)
					eventType['condition'] = eventType['callback'] = eventType['handlerFn'] = null
					delete eventType
					delete cache[eventId]
					delete self[eventKey]
				})
			}
		})
		return this
	}

	var eventMap = {
		'MouseEvents': 'contextmenu,click,dblclick,mouseout,mouseover,mouseenter,mouseleave,mousemove,mousedown,mouseup,mousewheel',
		'HTMLEvents': 'abort,error,load,unload,resize,scroll,change,input,select,reset,submit,focus,blur',
		'KeyboardEvent': 'keypress,keydown,keyup'
	}
	var getEventMap = function(type){
		var ret = 'CustomEvent'
		util.each(eventMap,function(value,key){
			if(value.indexOf(type) !== -1){
				ret = key
			}
		})
		return ret
	}
	var useDefaultEmitter = /^(focus|blur|select|submit|reset)$/
	domProto.trigger = function(type){
		var args = [].slice.call(arguments,1)
		var eventEmitter = document.createEvent(getEventMap(type))
			eventEmitter.initEvent(type,true,true)
			useDefault = useDefaultEmitter.test(type)
		args.length && (eventEmitter._args = args)
		this.each(function(){
			if(useDefault){
				// 先触发默认操作,再调用 dispatchEvent
				this[type] && this[type]()
			}
			this.dispatchEvent(eventEmitter)
		})
		return this
	}
	domProto.one = function(type,match,callback){
		if(typeof callback === 'undefined'){
			callback = match
			match = undefined
		}
		var self = this
		var _callback = function(e){
			callback.call(this,e)
			$(this).off(type,match,_callback)
		}
		this.on(type,match,_callback)
		return this
	}
	domProto.toggleCallback = function(type){
		var args = [].slice.call(arguments,1)
		this.each(function(){
			var toggleList = args.slice()
			$(this).on(type,function(e){
				var callback = toggleList.shift()
				toggleList = toggleList.concat(callback)
				callback.call(this,e)
			})
		})
		return false
	}
	domProto.clone = function(deep){
		var ret = []
		this.each(function(){
			var node = this.cloneNode(deep),
				Enode = E(node)			
			// clone event
			var eventId = this[eventKey]
			if(eventId){
				util.each(cache[eventId],function(value,type){
					util.each(value['callback'],function(callback,index){
						Enode.on(type,value['condition'][index],callback)
					})
				})
			}
			ret.push(node)
		})
		return E(ret)
	}
	domProto.remove = function(){
		// delete all eventHander
		this.off()
		this.each(function(){
			this.parentNode.removeChild(this)
		})
		return this
	}
	// console.log(dom.E.prototype)
	// exports.name = dom.get
	console.log('event加载完毕')
})