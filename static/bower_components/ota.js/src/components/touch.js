define('touch','core',function(core,exports){
	var $ = core.get,
		domProto = core.E.prototype,longTime,tapTime,doubleTapTime
	var touch = {}

	var cancleAllEvent = function(){
		clearTimeout(longTime)
		clearTimeout(tapTime)
	}
	var swipeDirection = function(obj){
		// x 大于 y，判定为左右，否则上下
		var direction
		if(obj.detalX > obj.detalY){
			// 左右
			direction = obj.x2 > obj.x1 ? 'Right' : 'Left'
		}else{
			// 上下
			direction = obj.y2 > obj.y1 ? 'Down' : 'Up'
		}
		return direction
	}
	$('body').on('touchstart',function(e){
		var finger = e.touches[0],
			now = core.now()
		touch.detalTime = now - (touch.lastTime || now)
		touch.x1 = finger.pageX
		touch.y1 = finger.pageY
		touch.target = $('tagName' in finger.target ? finger.target : finger.target.parentNode)
		// $(target).trigger('swipe')
		longTime = setTimeout(function(){
			// 长按不会触发 tap以及 doubleTap
			touch.longTimeTrigger = true
			touch.target.trigger('longTap')
		},750)
		// isDoubleTap 上下两次 touch 之间的时间间隙
		if(touch.detalTime > 0 && touch.detalTime < 250){ touch.isDoubleTap = true}
		touch.lastTime = now
		// 确保 tap 只触发一次 
		clearTimeout(tapTime)
	}).on('touchmove',function(e){
		// 其他元素阻止了 touchstart 的冒泡，那么此时 touch.target 为空，需做判断
		clearTimeout(longTime)
		clearTimeout(tapTime)
		var finger = e.touches[0]
		touch.x2 = finger.pageX
		touch.y2 = finger.pageY
		touch.detalX = Math.abs(touch.x2 - touch.x1)
		touch.detalY = Math.abs(touch.y2 - touch.y1)
		touch.direction = swipeDirection(touch)
		// 滑动中,根据方向返回非绝对值 offset
		touch.target && touch.target.trigger('swiping',{
			direction : touch.direction,
			offset: touch.detalX > touch.detalY ? (touch.x2 - touch.x1) : (touch.y2 - touch.y1)
		})
		touch.swipingTrigger = true
	}).on('touchend',function(e){
		clearTimeout(longTime)
		if(!touch.longTimeTrigger){
			// 单点不拖动没有 detal
			if(touch.detalX && touch.detalX > 20 || touch.detalY && touch.detalY > 20){
				if(touch.target){
					touch.target.trigger('swipe',Math.max(touch.detalX,touch.detalY))
					touch.target.trigger('swipe' + touch.direction, Math.max(touch.detalX,touch.detalY))	
				}
			}else if(!touch.swipingTrigger){
				// 不为 swipe,单点 tap,单点延时
				tapTime = setTimeout(function(){
					touch.target && touch.target.trigger('tap')
				},250)
				// doubleTap
				if(touch.isDoubleTap){
					clearTimeout(tapTime)
					touch.target.trigger('doubleTap')
					// 动作结束
					touch = {}
				}
				return
			}
		}
		touch = {}
	})

	$(window).on('scroll',function(){
		cancleAllEvent()
		touch = {}
	})

	;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown','doubleTap', 'tap', 'longTap','swiping'].forEach(function(fn){
    	domProto[fn] = function(callack){
    		this.on(fn,callack)
    		return this
    	} 
    })
    console.log('touch加载完毕') 
})