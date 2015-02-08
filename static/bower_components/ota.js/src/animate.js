define('animate',['dom','util','event'],function(dom,util,event,exports){
	var domProto = dom.E.prototype,
		$ = dom.get,
		unCamelize = function(prop){
			return prop.replace(/([A-Z])/g,function(all,letter){return '-' + letter.toLowerCase()})
		}
	var effect = {
		fadeIn: {
			name: 'fadeIn',
			callback: function(){
				this.css({'display': 'block'})
			}
		},
		fadeOut: {
			name: 'fadeOut',
			callback: function(){
				this.css({'display': 'none'})
			}
		},
		slideDown: {
			name: 'bounceInDown',
			callback: function(){
				this.css({'display': 'block'})
			}
		},
		slideUp: {
			name: 'bounceOutUp',
			callback: function(){
				this.css({'display': 'none'})
			}
		}
	}
	var testEl = document.createElement('div'),
		testElStyle = testEl.style,
		vendors = {Webkit: 'webkit',Moz: '',O: 'o'},
		useTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
		animateReset = {},
		fxAttr = 'transitionProperty,transitionDuration,transitionTiming,transitionDelay,animationName,animationDuration,animationTiming,animationDelay',
		prefix,transitionend,animationend,transform
	var durationMap = {
		'fast': 200,
		'default': 400,
		'slow': 600
	}

	util.each(vendors,function(event,vendor){
		if(typeof testElStyle[vendor + 'TransitionProperty'] !== 'undefined'){
			prefix = '-' + vendor.toLowerCase() + '-'
			transform = prefix + 'transform'
			animationend = event ? event + 'AnimationEnd' : 'animationend'
			transitionend = event ? event + 'TransitionEnd' : 'transitionend'
		}
	})
	
	testEl = null

	fxAttr.split(',').forEach(function(prop){
		animateReset[prefix + unCamelize(prop)] = ''
	})
	
	var animate = function(props,duration,callback,ease,delay){
		var $this = this
		// var animatePromise = new Promise(function(resolve,reject){
			var cssValue = {},transformProps = '',needTransitionProps = [],fxEvent

			if(util.isString(props)){
				// animationName,animationDuration,animationTiming,animationDelay
				// if string,use animation
				cssValue[prefix + 'animationName'] = props
				cssValue[prefix + 'animationDuration'] = duration + 's'
				cssValue[prefix + 'animationDelay'] = delay + 's'
				cssValue[prefix + 'animationTiming'] = ease
				fxEvent = animationend
			}else if(util.isObject(props)){
				util.each(props,function(value,prop){
					if(useTransforms.test(prop)){
						transformProps += prop + '(' + value + ') ' 
					}else{
						cssValue[prop] = value
						needTransitionProps.push(prop)
					}
				})
				if(transformProps){
					cssValue[transform] = transformProps
				}
				cssValue[prefix + 'transitionProperty'] = needTransitionProps.join(', ')
				cssValue[prefix + 'transitionDuration'] = duration + 's'
				cssValue[prefix + 'transitionDelay'] = delay + 's'
				cssValue[prefix + 'transitionTiming'] = ease
				fxEvent = transitionend
			}

			var fired = false
			var animateCallback = function(e){
				fired = true
				if(e){
					delete this.animating
					$(this).off(fxEvent,animateCallback)
					$(this).css(animateReset)
					// setTimeout(function(){
					callback && callback.call(this)
				}else{
					// trigger by setTimeout
					$this.off(fxEvent,animateCallback)
					$this.css(animateReset)
					$this.each(function(){
		   				delete this.animating
		   				callback && callback.call(this)
		   			})		   			
				}	
				
			}

			$this.on(fxEvent,animateCallback)

			// fix android
			setTimeout(function(){
				if(fired) return
				animateCallback()
			},(delay + duration) * 1e3 + 25)

			// trigger page reflow so new elements can animate?
   			// this.size() && this.get(0).clientLeft
   			// $this[0].clientLeft
   			
   			$this.each(function(){
   				this.animating = true
   			})

			$this.css(cssValue)			
		// })
		// return animatePromise
		return $this			
	}

	domProto.animate = function(props,config,callback){
		// use transition only
		if(util.isUndefined(callback)){
			callback = config
			config = {
				ease: 'linear',
				delay: 0,
				duration: 400 / 1e3
			}
		}else{
			config = config || {}
		}
		var duration = (parseInt(config.duration,10) || durationMap[config.duration] || 400) / 1e3
			ease = config.easing || 'linear'
			delay = (config.delay || 0) / 1e3
		return animate.call(this,props,duration,callback,ease,delay)
		// return this 
	}
	util.each(effect,function(fx,fnName){
		domProto[fnName] = function(callback){
			var className = ['animated'].concat(fx.name)
			// this.css({'display': ''}) // reset display
			setTimeout((function(){
				this.each(function(){
					this.animating = true
				})
				this.css({'display': ''})
				this.addClass(className)		
			}).bind(this),20)
			this.on(animationend,function(e){
				$(this).off(animationend,arguments.callee)
				delete this.animating
				$(this).removeClass(className)
				fx.callback && fx.callback.call($(this))
				callback && callback.call(this)
			})
			return this
		}
	})
	var toggleEffect = {
		fadeToggle: ['fadeIn','fadeOut'],
		slideToggle: ['slideDown','slideUp']
	}
	util.each(toggleEffect,function(effect,fnName){
		domProto[fnName] = function(){
			return this.each(function(){
				if(this.animating){return}
				var $this = $(this)
				if($this.css('display') === 'none'){
					$this[effect[0]]()
				}else{
					$this[effect[1]]()
				}
			})
		}
	})
	console.log('animate加载完毕')
})