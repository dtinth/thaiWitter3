/*
 * DtJS 2
 */
dtjs2 = {};

/*
 * $
 */
if (window.$ === undefined) {
	window.$ = function(id) {
		return document.getElementById(id);
	};
}

/*
 * Utils
 */
dtjs2.u = (function() {

	/*
	 * Changer
	 * Calls function on value change
	 */
	function makeChanger(initialValue, callbackFunction) {
		var lastValue = initialValue;
		function changer(newValue) {
			if (newValue != lastValue) {
				lastValue = newValue;
				callbackFunction.apply (this, arguments);
			}
		}
		callbackFunction (lastValue);
		return changer;
	}

	/*
	 * Value Limiter
	 */
	function makeLimiter(min, max) {
		function limit(v) {
			return Math.min(max, Math.max(min, v));
		}
		return limit;
	}

	/*
	 * Interpolate Value
	 */
	function interpolate(from, to, mix) {
		return from + (to - from) * mix;
	}

	return {
		c: makeChanger,
		l: makeLimiter,
		i: interpolate
	};

})();

/*
 * Element Maker
 */
dtjs2.el = function(className, tagName) {
	if (tagName === undefined) tagName = 'div';
	var e = document.createElement(tagName);
	e.className = className;
	return e;
};

/*
 * Animation
 */
dtjs2.a = (function() {

	/*
	 * The animation manager
	 */
	var manager = (function() {

		var fps = 50;
		var timeout = 1000 / fps;
		var callFunctions = [];
		var animationStarted = 0;

		var mozExtension = !!window.mozRequestAnimationFrame;
		var mozOldApi = true;
		if (mozExtension) {
			try {
				mozRequestAnimationFrame();
				window.addEventListener('MozBeforePaint', animate, false);
			} catch (e) {
				mozOldApi = false;
			}
		}

		function setFps(newFps) {
			fps = newFps;
			timeout = 1000 / fps;
		}

		function addAnimation(f) {
			for (var i = 0; i < callFunctions.length; i ++) {
				if (callFunctions[i] == f) return;
			}
			callFunctions.push (f);
			startAnimation ();
		}

		function removeAnimation(f) {
			for (var i = 0; i < callFunctions.length; i ++) {
				if (callFunctions[i] == f) {
					callFunctions.splice (i, 1);
					return;
				}
			}
		}

		function startAnimation() {
			if (animationStarted) return;
			animationStarted = 1;
			if (mozExtension) {
				if (mozOldApi) {
					window.mozRequestAnimationFrame ();
				} else {
					window.mozRequestAnimationFrame (animate);
				}
			} else {
				setTimeout (animate, timeout);
			}
		}

		function animate() {
			for (var i = 0; i < callFunctions.length; i ++) {
				if (!(callFunctions[i]())) {
					callFunctions.splice (i--, 1);
				}
			}
			if (callFunctions.length > 0) {
				if (mozExtension) {
					if (mozOldApi) {
						window.mozRequestAnimationFrame ();
					} else {
						window.mozRequestAnimationFrame (animate);
					}
				} else {
					setTimeout (animate, timeout);
				}
			} else {
				animationStarted = 0;
			}
		}

		return {
			fps: setFps,
			add: addAnimation,
			remove: removeAnimation
		};

	})();

	/*
	 * Integer Value Animator
	 */
	function makeIntValueAnimator(initialValue, acceleration, deceleration, callbackFunction) {
		var targetValue = initialValue;
		var currentValue = targetValue;
		var changer = dtjs2.u.c(Math.round(currentValue), callbackFunction);
		var rawAcceleration = 0;
		var lastSpeed = 0;
		function animate() {
			var targetedSpeed = (targetValue - currentValue) * deceleration;
			var speed;
			if (targetedSpeed >= 0)
				speed = (Math.min(targetedSpeed, lastSpeed + rawAcceleration));
			else
				speed = (Math.max(targetedSpeed, lastSpeed - rawAcceleration));
			currentValue += speed;
			lastSpeed = speed;
			var ended = Math.round(currentValue) == Math.round(targetValue);
			changer (Math.round(currentValue), ended);
			if (ended) lastSpeed = 0;
			return !ended;
		}
		function changeValue(t) {
			if (isNaN(parseFloat(t))) return;
			targetValue = parseFloat(t);
			rawAcceleration = Math.abs(currentValue - targetValue) * acceleration * acceleration;
			manager.add (animate);
		}
		return changeValue;
	}

	/*
	 * Value Animator
	 */
	function makeAnimator(initialValue, targetValue, duration, callback, easing) {
		if (!easing) easing = function(x) { return x; };
		var currentValue = initialValue;
		var timer = new Date().getTime();
		function startAnimation() {
			initialValue = currentValue;
			timer = new Date().getTime();
			manager.add (animate);
			animate ();
		}
		function stopAnimation() {
			manager.remove (animate);
		}
		function changeValue(t) {
			targetValue = t;
			startAnimation ();
			manager.add (animate);
		}
		function setDuration(dur) {
			duration = dur;
			return changeOrStop;
		}
		function getDuration() { return duration; };
		function setValue(v) {
			currentValue = v;
			startAnimation ();
			return changeOrStop;
		}
		function getValue() { return currentValue; };
		function animate() {
			var pos = (new Date().getTime() - timer) / (duration * 1000);
			if (pos > 1) pos = 1;
			if (pos < 0) pos = 0;
			currentValue = initialValue + (targetValue - initialValue) * easing(pos);
			callback (currentValue, pos >= 1);
			return pos < 1;
		}
		function changeOrStop(x) {
			if (x === undefined) stopAnimation();
			else changeValue (x);
			return changeOrStop;
		}
		function delay(dur) {
			timer += dur * 1000;
			return changeOrStop;
		}
		changeOrStop.setDuration = setDuration;
		changeOrStop.setValue = setValue
		changeOrStop.getDuration = getDuration;
		changeOrStop.getValue = getValue;
		changeOrStop.delay = delay;
		startAnimation ();
		return changeOrStop;
	}

	function makeToggleAnimator(duration, callback) {
		function setDuration(dur) {
			duration = dur;
			return changeOrStop;
		}
		function getDuration() { return duration; }
		var direction = -1;
		var timer = new Date().getTime();
		var initialValue = 0;
		function getValue() {
			return Math.min(1, Math.max(0, initialValue + direction * (new Date().getTime() - timer) / (1000 * duration)));
		}
		function startAnimation() {
			manager.add (animate);
			animate ();
		}
		function stopAnimation() {
			manager.remove (animate);
		}
		function animate() {
			var v = getValue();
			callback (v);
			return !((direction == -1 && v == 0) || (direction == 1 && v == 1));
		}
		function setter(v) {
			initialValue = getValue();
			timer = new Date().getTime();
			direction = v > 0 ? 1 : -1;
			startAnimation ();
		}
		// setter (0);
		callback (0);
		setter.setDuration = setDuration;
		setter.getDuration = getDuration;
		setter.getValue = getValue;
		setter.setValue = setter;
		return setter;
	}

	return {
		m: manager,
		c: makeAnimator,
		i: makeIntValueAnimator,
		t: makeToggleAnimator
	};

})();

/*
 * Transitions
 */
dtjs2.ease = (function() {

	function makeEaseOut(f) {
		return function(v) {
			return 1 - f(1 - v);
		};
	}

	function makeEaseInOut(f) {
		return function(v) {
			if (v < 0.5) return f(v * 2) / 2;
			return 1 - f(2 - v * 2) / 2;
		};
	}

	function makeEaseOutIn(f) {
		return function(v) {
			if (v < 0.5) return 0.5 - f(1 - v * 2) / 2;
			return 0.5 + f(v * 2 - 1) / 2;
		};
	}

	function makeEase(f) {
		f.i = f;
		f.o = makeEaseOut(f);
		f.io = makeEaseInOut(f);
		f.oi = makeEaseOutIn(f);
		return f;
	}

	function base(v) { return v * v; };
	makeEase (base);

	function linear(v) { return v; };
	makeEase (linear);

	function elasticEase(x) { return (Math.cos((1 - x) * 24) * Math.pow(x, 3.2)); }
	makeEase (elasticEase);

	function bounceEase(x) { return (Math.abs(Math.cos(Math.pow(((1 - x) * 3.5) + 1.772, 2))) * Math.pow(x, 3)); }
	makeEase (bounceEase);

	// Slightly Modified Easing Equations v1.5
	// By Robert Penner <http://www.robertpenner.com/easing/>
	// BSD License
	var C1 = Math.sin(0.57075);
	function sineEase(v) { return 1 - ((Math.sin(1.57075 - v) - C1) / (1 - C1)); };
	makeEase (sineEase);

	function makeTimestep(f, ts) {
		return makeEase(function(v) {
			var n = f(v);
			return n + (n * ts * (1 - n));
		});
	}

	function makeTimestep(f, ts) {
		return makeEase(function(v) {
			var n = f(v);
			return n + (n * ts * (1 - n));
		});
	}

	function makeCombine(f1, f2) {
		return makeEase(function(v) {
			return f2(f1(v));
		});
	}

	base.linear = linear;
	base.elastic = elasticEase;
	base.bounce = bounceEase;
	base.sine = sineEase;
	base.make = makeEase;
	base.timestep = makeTimestep;
	base.combine = makeCombine;

	return base;

})();

/*
 * Element Position
 */
dtjs2.p = function(el) {
	var tmp = [el.offsetLeft, el.offsetTop];
	el = el.offsetParent;
	while (el) {
		tmp[0] += el.offsetLeft;
		tmp[1] += el.offsetTop;
		el = el.offsetParent;
	}
	return tmp;
};
dtjs2.l = function(el) { return dtjs2.p(el)[0]; }
dtjs2.t = function(el) { return dtjs2.p(el)[1]; }

/*
 * Scrolling Position
 */
dtjs2.sc = function() {
	if (window.pageYOfsset) {
		return [window.pageXOfsset, window.pageYOfsset];
	} if (document.documentElement && document.documentElement.scrollTop) {
		return [document.documentElement.scrollLeft,
			document.documentElement.scrollTop];
	}
	return [document.body.scrollLeft, document.body.scrollTop];
};

/*
 * Viewport Size
 */
dtjs2.sz = function() {
	if (document.documentElement && document.documentElement.clientHeight && document.documentElement.clientWidth) {
		return [document.documentElement.clientWidth,
			document.documentElement.clientHeight];
	}
	return [document.body.clientWidth, document.body.clientHeight];
};

/*
 * Opacity Set [0-100]
 */
dtjs2.o = function(el, opx) {
	if (typeof(el.style.filter) != 'undefined') {
		el.style.filter= 'alpha(opacity=' + opx + ')';
	} else if (typeof(el.style.opacity) != 'undefined') {
		el.style.opacity = opx / 100;
	} else if (typeof(el.style.MozOpacity) != 'undefined') {
		el.style.MozOpacity = opx / 100;
	}
};

/*
 * Add Event
 */
dtjs2.ae = function(el, evt, fnc) {
	if (el.addEventListener) {
		return el.addEventListener(evt, fnc, false); 
	} else if (el.attachEvent) {
		return el.attachEvent('on' + evt, fnc);
	}
	return false;
};

/*
 * Remove Event
 */
dtjs2.re = function(el, evt, fnc) {
	if (el.removeEventListener) {
		return el.removeEventListener(evt, fnc, false); 
	} else if (el.detachEvent) {
		return el.detachEvent('on' + evt, fnc);
	}
	return false;
};

/*
 * Cancel Event
 */
dtjs2.ce = function(e) {
	e.cancelBubble = true;
	e.returnValue = false;
	if (e.stopPropagation) {
		e.stopPropagation();
		e.preventDefault();
	}
};

/*
 * XMLHttpRequest
 */
dtjs2.xh = function() {
	if (window.XMLHttpRequest) {
		return new XMLHttpRequest();
	} else if (window.ActiveXObject) {
		try {
			return new ActiveXObject("Microsoft.XMLHTTP"); 
		} catch (e) {
			try {
				return new ActiveXObject("Msxml2.XMLHTTP");
			} catch (e2) {
				return false;
			}
		}
	}
	return false;
};

/*
 * Request
 */
dtjs2.r = function(x, m, u, d, c) {
	x.onreadystatechange = c;
	x.open (m, u, 1);
	if (m.toLowerCase() == 'post') {
		x.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	}
	x.send (d);
};

/*
 * Call JSONP
 */
dtjs2.j = (function() {

	var counter = 0;

	function makeCallbackName(callback) {
		var name;
		do {
			name = 'DtJSCallback_' + (++counter);
		} while (window[name] !== undefined);
		window[name] = callback;
		return name;
	}

	function callJsonp(uri, callback) {
		var sc = document.createElement('script');
		sc.src = uri + (uri.indexOf('?') == -1 ? '?' : '&') + 'callback=' + makeCallbackName(callback);
		sc.type = 'text/javascript';
		document.body.appendChild (sc);
	}

	return callJsonp;

})();

/*
 * Color Module
 */
dtjs2.c = (function() {

	function colorStringToRGBArray(s) {
		var m;
		m = s.toLowerCase().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
		if (m) { return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]; }
		m = s.toLowerCase().match(/^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/);
		if (m) { return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]; }
		return false;
	}

	var colorValueLimiter = dtjs2.u.l(0, 255);

	function rgbArrayToColorString(x) {
		return 'rgb(' + Math.round(colorValueLimiter(x[0])) +
			', ' + Math.round(colorValueLimiter(x[1])) +
			', ' + Math.round(colorValueLimiter(x[2])) + ')';
	}

	function hsvArrayToRGBArray(ihsv) {
		var a = [ihsv[0] % 360, ihsv[1] / 100, ihsv[2] / 100];
		var b = Math.floor(a[0] / 60);
		var c = (a[0] % 60) / 60;
		var d = a[2] * (1 - a[1]);
		var e = a[2] * (1 - (c * a[1]));
		var f = a[2] * (1 - ((1 - c) * a[1]));
		var g = [0, 0, 0];
		if (b === 0)
			{ g = [a[2], f, d]; }
		else if (b === 1)
			{ g = [e, a[2], d]; }
		else if (b === 2)
			{ g = [d, a[2], f]; }
		else if (b === 3)
			{ g = [d, e, a[2]]; }
		else if (b === 4)
			{ g = [f, d, a[2]]; }
		else if (b === 5)
			{ g = [a[2], d, e]; }
		return [Math.round(g[0] * 255), Math.round(g[1] * 255), Math.round(g[2] * 255)];
	}

	function rgbArrayToHSVArray(irgb) {
		var a = [irgb[0] / 255, irgb[1] / 255, irgb[2] / 255];
		var b = a[0];
		var c = a[0];
		var d, e, f;
		if (a[1] < b) { b = a[1]; }
		if (a[2] < b) { b = a[2]; }
		if (a[1] > c) { c = a[1]; }
		if (a[2] > c) { c = a[2]; }
		if (b == c) { d = 0; }
		else if (c == a[0]) { d = (60 * ((a[1] - a[2]) / (c - b))); }
		else if (c == a[1]) { d = (60 * ((a[2] - a[0]) / (c - b))) + 120; }
		else if (c == a[2]) { d = (60 * ((a[0] - a[1]) / (c - b))) + 240; }
		if (d < 0) { d += 360; }
		e = Math.round(100 * ((c === 0) ? 0 : (1 - (b / c))));
		f = Math.round(100 * c);
		return [Math.round(d % 360), e, f];
	}

	function interpolate(x, y, p) {
		return [
			Math.round(x[0] + ((y[0] - x[0]) * p)),
			Math.round(x[1] + ((y[1] - x[1]) * p)),
			Math.round(x[2] + ((y[2] - x[2]) * p))
		];
	}

	return {
		a: colorStringToRGBArray,
		c: rgbArrayToColorString,
		r: hsvArrayToRGBArray,
		h: rgbArrayToHSVArray,
		f: interpolate
	};

})();


