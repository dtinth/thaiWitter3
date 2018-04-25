
T.supportEvent = function(object) {

	var listeners = {}
	var sticky = {}

	object.on = on
	object.emit = emit
	object.off = function(type, listener) {
		if (listener) removeListener(type, listener)
		else removeAllListeners(type)
	}

	object.removeListener = removeListener
	object.removeAllListeners = removeAllListeners

	function on(type, listener) {
		var arr = listeners[type]
		if (!arr) {
			listeners[type] = listener
		} else {
			if (!arr._listenerArray) {
				arr = listeners[type] = [ arr ]
				arr._listenerArray = true
			}
			arr[arr.length] = listener
		}
		if (type in sticky) {
			listener.call(object, sticky[type])
		}
	}

	function emit(type, arg, stickyFlag) {
		var arr = listeners[type]
		if (stickyFlag) {
			sticky[type] = arg
		} else {
			delete sticky[type]
		}
		if (!arr) return
		if (arr._listenerArray) {
			for (var i = 0; i < arr.length; i ++) {
				arr[i].call(object, arg)
			}
		} else {
			arr.call(object, arg)
		}
	}

	function removeListener(type, listener) {
		var arr = listeners[type]
		if (!arr) return
		if (arr === listener) {
			delete listeners[type]
			return
		}
		if (arr._listenerArray) {
			for (var i = 0; i < arr.length; i ++) {
				if (arr[i] === listener) {
					arr.splice(i, 1)
					if (arr.length === 0) delete listeners[type]
					return
				}
			}
		}
	}

	function removeAllListeners(type) {
		if (type == null) {
			listeners = {}
			return
		}
		delete listeners[type]
	}

	return object

}


