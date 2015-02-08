define('util',function(exports){
	/**
	 * [isType 类型判断]
	 * @param  {[type]}  type [description]
	 * @return {Boolean}      [description]
	 */
	function isType(type){
		return function(el){
			return Object.prototype.toString.call(el) === '[object '+type+']';
		}
	}
	var isArray = isType('Array');
	var isObject = isType('Object');
	var isFunction = isType('Function');
	var isString = isType('String');
	var isWindow = function(obj){
		return obj != null && obj === obj.window;
	}
	var isUndefined = function(obj){
		return typeof obj === 'undefined'
	}
	exports.isArray = isArray;
	exports.isObject = isObject;
	exports.isFunction = isFunction;
	exports.isString = isString;
	exports.isWindow = isWindow
	exports.isUndefined = isUndefined
	/**
	 * [isArrayLike 类数组]
	 * @param  {[type]}  arr [description]
	 * @return {Boolean}     [description]
	 */
	function isArrayLike(arr){
		// isObject(arrayLike) === false
		if(isWindow(arr)) {return false}
		return arr && typeof arr === 'object' && 'length' in arr;
	}
	exports.isArrayLike = isArrayLike;
	/**
	 * [Q 异步变同步]
	 * @param {Function} callback [description]
	 */
	function Q(callback){
		if(!(this instanceof Q)){
			var self = new Q;
			self.queue = [];
			self.timmer = {};
			callback && self.queue.push(function(){
				callback.call(null,function(){
					Q.checkQueue(self.queue);
				})
			});
			Q.checkQueue(self.queue);
			return self;
		}
	}
	Q.checkQueue = function(q){
		var p = q.shift();
		p && (p.delay ? p.callback.call(null,p.delay) : p());
	}
	Q.prototype = {
		constructor: Q,
		then: function(callback){
			var self = this;
			callback && self.queue.push(function(){
				callback.call(null,function(){
					Q.checkQueue(self.queue);
				})
			});
			return this;
		},
		delay: function(){
			var arg = [].slice.call(arguments),
				queue = this.queue,
				timmer = this.timmer,
				self = this;
				var id = Math.random().toString(32).slice(2);
				queue.push({
					delay: arg[0],
					callback: function(delay){
						timmer[id] = setTimeout(function(){
							(arg[1] || function(){}).call(null);
							Q.checkQueue(queue);
						},delay)	
					}
				})
			return this;
		}
	}
	exports.Q = Q;
	/**
	 * [Queue 队列]
	 * @param {[type]} q [description]
	 */
	function Queue(q){
		if(!(this instanceof Queue)){
			return new Queue(q);
		}
		this.waiting = [].concat(q);
		this.todo = this.waiting.length;
	}
	Queue.prototype = {
		constructor : Queue,
		run: function(){
			var self = this;
			this.waiting.forEach(function(todo){
				// next交由外部调用，将 this 传过去
				todo(self.check.bind(self));
			})
		},
		check: function(){
			this.todo--;
			if(!this.todo){
				this.callback();
			}
		},
		done: function(callback){
			this.callback = callback;
			this.run();
		}
	}
	exports.Queue = Queue;
	/**
	 * [EventEmitter 事件系统]
	 * @return {[type]} [description]
	 */
	function EventEmitter(){
		this.hub = {};
	}
	EventEmitter.prototype = {
		constructor: EventEmitter,
		on: function(event,listener){
			var hub = this.hub
			hub[event] = hub[event] || []
			hub[event].push(listener)
			return this
		},
		emit: function(){
			var args = [].slice.call(arguments),
				event = args.shift()
			var hub = this.hub
			if(hub[event]){
				hub[event].forEach(function(fn){
					fn.apply(null,args)
				})
				return true
			}else{
				return false
			}

		},
		listeners: function(event){
			var hub = this.hub
			return hub[event] && hub[event].length || 0 
		},
		removeAllListeners: function(event){
			var hub = this.hub
			if(!event){
				// remove all listener
				this.hub = {}
				return this
			}
			if(hub[event]){
				hub[event] = null
				delete hub[event]
			}
			return this
		},
		removeListener: function(event,callback){
			var hub = this.hub
			if(hub[event]){
				hub[event].splice(hub[event].indexOf(callback),1)
				!hub[event].length && (delete hub[event])
			}
			return this
		}
	}
	exports.EventEmitter = EventEmitter;
	/**
	 * [contains 是否包含，可用于数组，dom节点，string]
	 * @return {[type]} [description]
	 */
	function contains(a,b){
		if(a.nodeType === 1 && b.nodeType === 1){
			if(isFunction(a.contains)){
				return a.contains(b)
			}else{
				return a.compareDocumentPosition(b) & 16
			}
		}else if(isArray(a) || isString(a)){
			return a.indexOf(b) !== -1
		}
	}
	exports.contains = contains;
	/**
	 * [each 遍历]
	 * @param  {[type]}   obj      [传入对象]
	 * @param  {Function} callback [回调]
	 * @param  {[type]}   context  [上下文]
	 * @return {[type]}            [description]
	 */
	function each(obj,callback,context){
		if(isArray(obj) || isArrayLike(obj)){
			return [].forEach.call(obj,callback,context)
		}else if(isObject(obj)){
			return Object.keys(obj).forEach(function(key){
				callback.call(context || obj[key],obj[key],key)
			})
		}
	}
	exports.each = each;
	/**
	 * [extend 继承对象]
	 * @param  {[type]} target    [目标]
	 * @param  {[type]} source    [源]
	 * @param  {[type]} overwrite [是否覆盖]
	 * @return {[type]}           [description]
	 */
	function extend(target,source,overwrite){
		if(isArrayLike(source)){
			// ff needed
			target['length'] = source['length']
		}
		for(var i in source){
			if(source.hasOwnProperty(i)){
				if(isObject(source[i]) && isObject(target[i]) && target.hasOwnProperty(i) && typeof target[i] !== 'undefined'){
					target[i] = extend(target[i],source[i],overwrite);
				}else{
					if(target.hasOwnProperty(i) && typeof target[i] !== 'undefined'){
						if(overwrite === true){
							continue;
						}else{
							target[i] = source[i];
						}
					}else{
						target[i] = source[i];
					}	
				}	
			}
		}
		return target;
	}
	exports.extend = extend;
	/**
	 * [eval 全局 eval]
	 * @param  {[type]} data [description]
	 * @return {[type]}      [description]
	 */
	function eval(data){
		// from jq.globalEval
		if(data = data.trim()){
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			return (window.execScript || function(data) {
				return window['eval'].call(window, data)
			})(data);
		}
	}
	exports.eval = eval;
	/**
	 * [isEmptyObject 是否为空对象]
	 * @param  {[type]}  obj [description]
	 * @return {Boolean}     [description]
	 */
	function isEmptyObject(obj){
		return Object.keys(obj).length === 0
	}
	exports.isEmptyObject = isEmptyObject;
	/**
	 * [makeArray 类数组,dom转数组]
	 * @param  {[type]} arrayLike [description]
	 * @return {[type]}           [description]
	 */
	function makeArray(arr){
		if(arr){
			if(isArray(arr)){
				return arr
			}else if(isArrayLike(arr)){
				return Array.prototype.slice.call(arr);
			}else{
				return [arr]
			}
		}
	}
	exports.makeArray = makeArray;
	/**
	 * [now 返回当前时间搓]
	 * @return {[type]} [description]
	 */
	function now(){
		return Date.now();
	}
	exports.now = now;
	/**
	 * [parseHTML string to html]
	 * @return {[type]} [description]
	 */
	function parseHTML(html){
		var d = document.createElement('div'),
			ret = [];
		d.innerHTML = html;
		var l = d.firstChild;
		while(l){
			ret.push(l);
			l = l.nextSibling;
		}
		d = l = null;
		return ret;
	}
	exports.parseHTML = parseHTML;
	/**
	 * [unique description]
	 * @return {[type]} [description]
	 */
	function unique(){
		
	}
	/**
	 * [shuffle 洗牌算法]
	 * @return {[type]} [description]
	 */
	function shuffle(){

	}
	/**
	 * [cache 缓存系统]
	 * @return {[type]} [description]
	 */
	exports._cache = {} 
	exports.uuid = 1
	
	function inherits(){
		
	}
	console.log('util加载完毕')
})