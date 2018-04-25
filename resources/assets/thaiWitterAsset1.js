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




/* generated from twitter-text.js https://github.com/twitter/twitter-text-js */
TWITTER_REGEX={
	"url": new RegExp("(((?:[^-\\/\"'!=A-Za-z0-9_@\uFF20#\uFF03\\.\uFFFE\uFEFF\uFFFF\u202A-\u202E]|^))((https?:\\/\\/)?((?:(?:(?:[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/](?:[_-]|[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/])*)?[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/]\\.)*(?:(?:[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/](?:-|[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/])*)?[^/\\!'#%&'\\(\\)*\\+,\\\\\\-\\.\\/:;<=>\\?@\\[\\]\\^_{|}~// \u0085\u00A0\u1680\u180E\u2028\u2029\u202F\u205F\u3000\t-\r\u2000-\u200A//\uFFFE\uFEFF\uFFFF\u202A-\u202E/]\\.)(?:(?:(?:aero|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel)(?=[^a-zA-Z]|$))|(?:(?:ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|ax|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|dd|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|eu|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|rs|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|ss|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tl|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|za|zm|zw)(?=[^a-zA-Z]|$))|(?:xn--[0-9a-z]+))))(?::([0-9]+))?(\\/(?:(?:[a-z0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-_~|&\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]*(?:\\([a-z0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-_~|&\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]+\\)[a-z0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-_~|&\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]*)*[\\+\\-a-z0-9=_#\\/\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]|(?:\\([a-z0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-_~|&\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]+\\)))|(?:@[a-z0-9!\\*';:=\\+,\\.\\$\\/%#\\[\\]\\-_~|&\u00C0\u00C1\u00C2\u00C3\u00C4\u00C5\u00C6\u00C7\u00C8\u00C9\u00CA\u00CB\u00CC\u00CD\u00CE\u00CF\u00D0\u00D1\u00D2\u00D3\u00D4\u00D5\u00D6\u00D8\u00D9\u00DA\u00DB\u00DC\u00DD\u00DE\u00DF\u00E0\u00E1\u00E2\u00E3\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EA\u00EB\u00EC\u00ED\u00EE\u00EF\u00F0\u00F1\u00F2\u00F3\u00F4\u00F5\u00F6\u00F8\u00F9\u00FA\u00FB\u00FC\u00FD\u00FE\u015F\\303\\277]+/))*)?(\\?[a-z0-9!?\\*'\\(\\);:&=\\+\\$\\/%#\\[\\]\\-_\\.,~|]*[a-z0-9_&=#\\/])?))", "gi")
};




/*
 * thaiWitter Class System
 *
 * (c) Thai Pangsakulyanont. twcs.js is released under WTFPL.
 */

function BaseClass() {}
function Class(b) {
	var c = function() { if (this.init) this.init.apply(this, arguments); };
	return c.extendFrom(b ? b : BaseClass);
}
function defClass(name, b) {
	return (function() {
		if (!this[name]) this[name] = new Class(b);
		return this[name];
	})();
}

Function.prototype.implement = BaseClass.prototype.implement = function(x) {
	function createProxy(implementor, name) {
		return function() {
			return implementor[name].apply(this, arguments);
		};
	}
	for (var i in x) {
		if (x.hasOwnProperty(i)) {
			if (typeof x[i] === 'function') {
				if (this.hasOwnProperty(i)) {
					x[i]._super = this[i]; // function replace
				} else if (i in this && 'implementor' in this[i]) {
					x[i]._super = createProxy(this[i].implementor, i); // cross prototype
				}
				x[i].implementor = this;
			}
			this[i] = x[i];
		}
	}
	return this;
};

Function.prototype.extendFrom = function(b) {
	var c = function() {};
	c.prototype = b.prototype;
	this.implement(b);
	this.prototype = new c();
	this.prototype.constructor = this;
	return this;
};

Function.prototype.proxy = BaseClass.prototype.proxy = function(name) {
	if (!this.hasOwnProperty('_tw_proxies')) {
		this._tw_proxies = {};
	}
	if (!(name in this._tw_proxies)) {
		this._tw_proxies[name] = function() {
			return this[name].apply(this, arguments);
		}.b(this);
	}
	return this._tw_proxies[name];
};

Function.prototype.b = function(ctx) {
	var fn = this;
	return function() {
		return fn.apply(ctx, arguments);
	};
};



/*
 * thaiWitter: Thai's Twitter Client
 * http://tw.dt.in.th/
 *
 * (c) Thai Pangsakulyanont. All rights reserved.
 */


// --function--
// function prototypes {

Function.prototype.sharedInstance = function() {
	if (!this.hasOwnProperty('_sharedInstance')) {
		this._sharedInstance = new this();
	}
	return this._sharedInstance;
};

(function() {
	var id = 0;
	Function.prototype.callback = function() {
		var callbackId = 'tWCallback' + (++id);
		var that = this;
		window[callbackId] = function() {
			that.apply(this, arguments);
			delete window[callbackId];
		};
		return callbackId;
	};
})();

// }

// --bootstrap--
// steps of bootstrapping the application {

var ATSIGN_REGEX = "([@\uff20])";
var MENTIONS_REGEX = "(^|[^a-zA-Z0-9_])([@\uff20])([a-zA-Z0-9_]{1,20})";
var AM_I_IOS = ~navigator.userAgent.indexOf('AppleWebKit/') && ~navigator.userAgent.indexOf('Mobile/') && ~navigator.userAgent.indexOf('Safari/');
var rootElement = $('container-of-all');

// hide loading
$('ltmc').style.display = 'none';

// install or reload
if (window.webrunner) {
	window.platform = window.webrunner;
}
$('install-tw').style.display = 'none';

// url parameters
var xtra_timeline = '',
	xtra_keyword = '',
	xtra_params = '',
	xtra_secure = location.protocol == 'https:' ? '&https=YAH' : '';

// get token for csrf
var API_GET  = TWCONFIG.api.get;
var API_POST = TWCONFIG.api.post;
var MY_DAMN_NAME = ''; // this one will be set after feed loading, and once set, will become a constant
var THE_TOKEN = function() {
	var xht = new XMLHttpRequest();
	xht.open ('GET', TWCONFIG.api.token, false);
	xht.send ('');
	return xht.responseText.match(/#S#(.*)#E#/)[1];
}();

// in-browser debugging
if (DEBUG) {
	if (!window.platform)
		window.platform = {openURI: function(x){
			window.open (x, '_blank');}};
}

// }



// --application--
// the main application!

var app;

defClass("Application").prototype.implement({

	init: function() {
		this._components = {};
	},

	run: function() {
		this.registerConfiguration();
		this.registerComponents();
		this.launchApplication();
	},

	register: function(name, component) {
		this._components[name] = component;
		return component;
	},

	locate: function(name) { return this._components[name]; },

	setActiveTimeline: function(timelineObject) {
		this.register('timeline', timelineObject);
	},

	registerConfiguration: function() {
		this.register('config', TWCONFIG);
	},

	registerComponents: function() {
		this.register('appState',     new StateSwitcher(document.documentElement));
		this.register('tweetState',   new BatchStateSwitcher(this.getTweetStateSwitchers()));
		this.register('geolocationButton', new BottomButton('btn-geolocation'))
		this.register('buttonsBar',   new TWButtonsBar());
		this.register('geo',          new TWGeo(this.locate('geolocationButton')));
		this.register('notifier',     new Notifier());
		this.register('mainTimeline', new Timeline());               // main timeline
		this.register('timeline',     this.locate('mainTimeline'));  // active timeline
		this.register('globalKeyHandler', new GlobalKeyHandler());
		this.register('zzzKeyHandler',    new ZzzKeyHandler());
		this.register('tweetBox',     new TweetBox());
		this.register('events',       new EventHandler());
		this.register('commands',     new GlobalCommands());
		this.register('highlighter',  new StatusHighlighter());
		this.register('filter',       new StatusFilter());
		this.register('infoToggler',  new InfoToggler());
		this.register('options',      new OptionsUI());
		this.register('tabsToggler',  new TabsToggler());
		this.register('userInfoView', new UserInfoView());
	},
	
	getTweetStateSwitchers: function() { return [
		new StateSwitcher($('tweet-bar')),
		new StateSwitcher($('head')),
		new StateSwitcher($('buttons-bar'))
	]; },

	getBottomButtons: function() { return [
		this.locate('geolocationButton')
	]; },

	getKeyHandlers: function() { return [
		this.locate('globalKeyHandler'),
		this.locate('zzzKeyHandler'),
		this.locate('tweetBox').keyHandler,
		this.proxy('getCurrentTimelineKeyHandler')
	]; },

	getCurrentTimelineKeyHandler: function() { return this.locate('timeline').keyHandler; },

	launchApplication: function() {
		this.locate('appState').update();
		handleKeywords ();
		this.locate('events').globalResize();
		if (!DEBUG) {
			this.locate('timeline').cmd.reload ();
		} else {
			optsNew.show ();
		}
		this.locate('buttonsBar').setButtons(this.getBottomButtons());
		this.locate('events').setKeyHandlers(this.getKeyHandlers());
		this.locate('options').loadOptions();
		this.locate('tabsToggler').setupComponent();
		sysNotify ('Welcome', 'Welcome to thaiWitter.');
		notify ('<b>Welcome!</b>');
	}

});

window.addEventListener('load', function() {

	app = new Application();
	app.run();

}, false);

// }




defClass("StateSwitcher").prototype.implement({

	init: function(element) {
		this._states = {};
		this._element = element;
		this._defaultState = this._element.className + ' ';
	},

	set: function(name, update) {
		this._states[name] = true;
		if (update) this.update();
	},

	unset: function(name, update) {
		delete this._states[name];
		if (update) this.update();
	},

	setSwitch: function(name, truth, update) {
		this.set((truth ? '' : 'not-') + name);
		this.unset((truth ? 'not-' : '') + name, update);
	},

	update: function() {
		var data = '';
		for (var i in this._states) data += ' ' + i;
		this._element.className = this._defaultState + data;
	}

});

defClass("BatchStateSwitcher").prototype.implement({

	init: function(list) {
		this._list = list;
	},
	set: function(name, update) { for (var i = 0; i < this._list.length; i ++) this._list[i].set(name, update); },
	unset: function(name, update) { for (var i = 0; i < this._list.length; i ++) this._list[i].unset(name, update); },
	setSwitch: function(name, truth, update) { for (var i = 0; i < this._list.length; i ++) this._list[i].setSwitch(name, truth, update); },
	update: function() { for (var i = 0; i < this._list.length; i ++) this._list[i].update(); }

});

// --utilities--
// utility functions {

function json_parse(x) {
	if (typeof JSON != 'undefined' && JSON.parse) return JSON.parse(x);
	var y = x.replace(/[\[\]{}:,]|"(?:\\[\s\S]|[^"])*"|\-?\d+(?:\.\d+)?|null|true|false/g, '');
	if (y != '') throw new Error('unsafe json D:');
	return eval('(' + x + ')');
}
function implementable(name) {
	return function(obj) {
		if (!this.hasOwnProperty(name)) {
			if (this[name]) {
				var c = function(){};
				c.prototype = this[name];
				this[name] = c;
			} else {
				this[name] = {};
			}
		}
		this.implement.call(this[name], obj);
	};
}
function dataAttr(n, v) {
	return 'data-tw-' + n + '="' + escape(v) + '"';
}
function openPopup(url, targ, features, windowIsOpen) {
	windowIsOpen = windowIsOpen || (function() {});
	var nw = window.open(url, targ, features);
	if (nw) windowIsOpen(nw);
	else notify ('<span data-tw-popup="1" style="-moz-appearance:button;color:buttontext;display:inline-block;padding:3px 5px" onclick="' + function() {
		nw = window.open(url, targ, features);
		if (nw) windowIsOpen(nw);
		else notify('Configure your popup blocker!');
	}.callback() + '();">Click here to open popup...</span>');
}
function pwns(i) {
	openPopup(i, '_blank', 'width=' + window.innerWidth + ',height=' + window.innerHeight + ',left=' + (24 + window.screenX) + ',top=' + (24 + window.screenY));
}
function changer(fn) {
	var d;
	return function(x) {
		if (x !== d) {
			fn (x);
			d = x;
		}
	};
}
function C(c, t) {
	var tag = document.createElement(t === undefined ? 'div' : t);
	tag.className = c;
	return tag;
}
function open_link(x) {
	if (window.platform) {
		window.platform.openURI (x);
	} else {
		window.open (x, '_blank');
	}
}
function twoDigits(x) {
	x = '00' + x;
	return x.substr(x.length - 2);
}
function decodeUTF(x, z) {
	return x.replace(/%([cd][0-9a-f]%[89ab][0-9a-f]|e[0-9a-f](?:%[89ab][0-9a-f]){2}|f[0-7](?:%[89ab][0-9a-f]){3}|f[89ab](?:%[89ab][0-9a-f]){4}|f[cd](?:%[89ab][0-9a-f]){5})/ig, function(a) {
		return z ? '&#' + decodeURIComponent(a).charCodeAt(0) + ';' : decodeURIComponent(a);
	});
}
function getRestApi(url) {
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.src = url;
	document.body.appendChild (s);
}
function sysNotify(title, text, overridden, picture) {
	if (window.console) console.log(title + ' : ' + text + (picture ? ' -> ' + picture : ''));
	if (PREF('sysNotifyMode') != '0' || overridden) {
		if (window.thaiWitterClientNotify && PREF('notificationEngine') == 'gntp') {
			window.thaiWitterClientNotify(title, text, picture);
		} else if (window.platform && window.platform.showNotification) {
			if (!picture) picture = '';
			window.platform.showNotification (title, text, picture);
		} else if (window.webkitNotifications) {
			if (!picture) picture = 'icns.png';
			var noti = window.webkitNotifications.createNotification(picture, title, text);
			noti.show();
		}
	}
}

// }

defClass("UrlHandler").implement({
	
	handle: function(url, e) {
		open_link(url);
	}

});

defClass("XH").prototype.implement({
	init: function(method, url, progress) {
		this._xhr = this.createXHR();
		this._xhr.open(method, url, true);
		this._xhr.onreadystatechange = this.proxy('onreadystatechange');
		this._aborted = false;
		this.setProgress(progress);
	},
	createXHR: function() {
		return new XMLHttpRequest();
	},
	setProgress: function(progress) {
		this._progress = progress;
	},
	send: function(what) {
		if (what == null) what = null;
		this._xhr.send(what);
	},
	sendForm: function(what) {
		this._xhr.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
		this.send(what);
	},
	abort: function() {
		if (this._aborted) return;
		this._aborted = true;
		this._xhr.abort();
		if (this._progress) this._progress.fail('Aborted!');
	},
	onreadystatechange: function() {
		if (this._xhr.readyState == 4) {
			this.proxy('handleXHRResponse')();
		}
	},
	getResponseHeader: function(header) { return this._xhr.getResponseHeader(header); },
	setRequestHeader: function(a, b) { return this._xhr.setRequestHeader(a, b); },
	handleXHRResponse: function() {
		if (this._aborted) return;
		if (this._xhr.responseText.substr(0, 5) == 'echo:') {
			if (this._progress) this._progress.intermediate();
			thaiWitterClientEcho(this._xhr.responseText, this.proxy('handleEchoResponse'));
		} else {
			this.oncomplete(this._xhr.responseText, this._xhr.status);
		}
	},
	handleEchoResponse: function(response) {
		if (this._aborted) return;
		this.oncomplete(response, 200);
	}
});

// --elements--
// commonly-used elements {

var el = {};
el.tweetData = $('tweet-data');
el.tweetBar = $('tweet-bar');
el.display = $('tweet-display');
el.head = $('head');
el.notify = $('notification-area');
el.status = {};
el.status.scroll = $('status-scroll');
el.status.chars = $('status-chars');

// }

// --prefs--
// preferences engines
// defines how preferences are loaded and saved {

defClass("PrefEngine").implement({

	engineMap: {},
	engines: [],

	register: function(engines) {
		this.implement.call(this.engineMap, engines);
		return this;
	},

	getPreference: function(key) {
		for (var i = 0; i < this.engines.length; i ++) {
			var value = this.engineMap[this.engines[i]].getPreference(key);
			if (value !== null) {
				return value;
			}
		}
		return null;
	},

	setPreference: function(key, newValue) {
		for (var i = 0; i < this.engines.length; i ++) {
			this.engineMap[this.engines[i]].setPreference (key, newValue);
		}
	}

}).register({

	localStorage: {
		getPreference: function(key) {
			try {
				var value = localStorage.getItem(key);
				if (value === '' || value === undefined || value === null)
					return null;
				return value;
			} catch (e) {
				return null;
			}
		},
		setPreference: function(key, newValue) {
			try {
				localStorage.setItem(key, newValue);
			} catch (e) {}
		}
	},

	globalStorage: {
		getPreference: function(key) {
			try {
				var value = globalStorage[location.hostname][key];
				if (value === '' || value === undefined || value === null)
					return null;
				return value;
			} catch (e) {
				return null;
			}
		},
		setPreference: function(key, newValue) {
			try {
				globalStorage[location.hostname][key] = newValue;
			} catch (e) {}
		}
	}

}).engines.push('localStorage', 'globalStorage');

defClass("PrefMan").implement({

	defaults: {
		sysNotifyMode:         '0',
		refreshRate:           '60',
		refreshOnTweet:        '0',
		autoScrollOnRefresh:   '0',
		ifirp:                 '1',
		ifclient:              '0',
		ifiosthai:             '1',
		hlKeywords:            '',
		ftKeywords:            '',
		awesomeThings:         '1',
		moarAwesomeThings:     '1',
		evenMoarAwesomeThings: '0',
		useRetweetAPI:         '1',
		customCSS:             '/* Custom CSS */\n',
		clientEcho:            '1',
		clientStream:          '0',
		urlShortener:          'http://api.bit.ly/shorten?version=2.0.1&login=thaiwitter&apiKey=R_ba9d1fd1a7882b1ab214432d02b88cc7&',
		hardcoreMode:          '0',
		imageUploader:         'twitter',
		facebookTweet:         '0',
		mediaPreview:          '1',
		usernameAutoComplete:  '0',
		notificationEngine:    'builtin',
		notificationPicture:   '1',
		skipTCo:               '0'
	},
	
	getPref: function(key) {
		var value = PrefEngine.getPreference(key);
		if (value === null || '' + value === '')
			return this.defaults[key];
		return value;
	},

	setPref: function(key, newValue) {
		PrefEngine.setPreference (key, newValue);
	},
	
	debug: function() {
		var c = [];
		for (var i in this.defaults) {
			c.push (i + ': ' + (this.getPref(i)));
		}
		alert (c.join('\n'));
	}

});

var PREF = function(command) {
	command = command + '';
	var index = command.indexOf('=');
	if (index > -1) {
		var key = command.substr(0, index);
		var value = command.substr(1 + index);
		PrefMan.setPref(key, value);
	} else {
		return PrefMan.getPref(command);
	}
};

// }

// --progress--
// stylish progress bars {
var Progress = function() {
	var cstyle = 0;
	var styles = [];
	function PlainProgress(x) {
		notify (x);
	}
	PlainProgress.prototype.ok = function(x, bg) {
		notify (x);
	};
	PlainProgress.prototype.fail = function(x) {
		notify (x);
	};
	PlainProgress.prototype.intermediate = function() {
	};
	function AwesomenessProgress(x, manual) {
		var d = C('');
		var e = C('');
		var that = this;
		d.setAttribute ('style', 'width: 180px; padding: 1px; border: 1px solid #ccc; background: #111; margin-top: 10px; margin-left: auto;');
		e.setAttribute ('style', 'width: 20px; height: 17px; background: #919499; white-space: nowrap; font: 9pt Verdana; color: rgba(255, 255, 255, 0.7); line-height: 15px; overflow: hidden; text-indent: 7px;');
		var bg = dtjs2.c.a('#919499');
		d.appendChild (e);
		e.innerHTML = x;
		dtjs2.a.c (0, 1, 0.15, function(v) {
			d.style.opacity = v;
		});
		var f;
		if (manual) {
			f = dtjs2.a.c(0, 10, 3, function(v, fin) {
				e.style.width = v + '%';
			});
		} else {
			f = dtjs2.a.c(0, 40, 3, function(v, fin) {
				e.style.width = v + '%';
				if (fin) {
					f = dtjs2.a.c(40, 90, 20, function(v) {
						e.style.width = v + '%';
					}, dtjs2.ease.o);
				}
			});
		}
		function vq() {
			dtjs2.a.c(1, 0, 0.5, function(v, fin) {
				if (fin) {
					d.parentNode && d.parentNode.removeChild(d);
				}
				d.style.opacity = v;
				d.style.marginBottom = (v - 1) * 28 + 'px';
			});
		}
		function done(settext, nbg) {
			f ();
			f = dtjs2.a.c(f.getValue(), 100, 0.14, function(v) {
				e.style.width = v + '%';
			});
			dtjs2.a.c(0, 1, 0.14, function(v) {
				e.style.background = dtjs2.c.c(dtjs2.c.f(bg, nbg, v));
			});
			e.innerHTML = settext;
			setTimeout (vq, 3000);
			delete that.oncancel;
		}
		function intermediate(percentage) {
			f ();
			var fv = f.getValue() + (100 - f.getValue()) / 3;
			if (manual) {
				fv = percentage * 0.9 + 10;
			}
			f = dtjs2.a.c(f.getValue(), fv, 0.34, function(v, fin) {
				e.style.width = v + '%';
				if (fin && !manual) {
					f = dtjs2.a.c(f.getValue(), Math.max(f.getValue(), 90), 18, function(v) {
						e.style.width = v + '%';
					}, dtjs2.ease.o);
				}
			}, dtjs2.ease.o);
		}
		e.ondblclick = function() {
			if (that.oncancel) {
				that.oncancel();
			}
		};
		this.done = done;
		this.intermediate = intermediate;
		el.notify.appendChild (d);
	}
	AwesomenessProgress.prototype.ok = function(x, bg) {
		this.done (x, bg || [50, 200, 50]);
	};
	AwesomenessProgress.prototype.fail = function(x) {
		this.done (x, [220, 80, 80]);
	};
	styles.push (PlainProgress, AwesomenessProgress);
	function progress(x, y) {
		return new styles[cstyle % styles.length](x, y);
	}
	progress.vhsifnweihdunsdfux = function() {
		cstyle ++;
		PREF('moarAwesomeThings=' + cstyle + '');
		var p = progress('\' \'/');
		setTimeout (function() { p.fail('\' \'/!!'); }, 500);
	};
	var prefStyleID = PREF('moarAwesomeThings');
	if (prefStyleID === '') prefStyleID = 0;
	cstyle = parseInt(prefStyleID, 10) % styles.length;
	return progress;
}();
// }

// --notify--
// in-app notifications {
var notify = function() {
	var cstyle = 0;
	var styles = [
		function(x) {
			var c = notifyEl(x);
			setTimeout (function() {
				dtjs2.a.c (0, 1, 1, function(v, fin) {
					if (fin) {
						c.parentNode && c.parentNode.removeChild(c);
					}
					c.style.marginBottom = (0 - v * (c.offsetHeight + 10)) + 'px';
					c.style.left = (v * (c.offsetWidth + 20)) + 'px';
				}, dtjs2.ease.i);
			}, 3000);
			(function() {
				dtjs2.a.c (0, 1, 1, function(v) {
					c.style.left = (-window.innerWidth * (1 - v)) + 'px';
				}, dtjs2.ease.o);
			})();
		},
		function(x) {
			var c = notifyEl(x);
			c.style.WebkitTransform = 'translateZ(0)';
			setTimeout (function() {
				dtjs2.a.c (0, 1, 0.3, function(v, fin) {
					if (1 - v > 0) {
						c.style.MozTransform = 'scale(' + (1 - v) + ')';
						c.style.WebkitTransform = 'scale(' + (1 - v) + ') translateZ(0)';
					}
					if (fin) {
						c.style.visibility = 'hidden';
						c.style.MozTransform = '';
						c.style.WebkitTransform = 'translateZ(0)';
						dtjs2.a.c (0, 1, 0.2, function(v, fin) {
							if (fin) {
								c.parentNode && c.parentNode.removeChild(c);
							}
							c.style.marginBottom = (0 - v * (c.offsetHeight + 10)) + 'px';
						}, dtjs2.ease.i);
					}
				}, dtjs2.ease.i);
			}, 3000);
			(function() {
				c.style.left = '0px';
				dtjs2.a.c (0, 1, 0.1, function(v) {
					c.style.MozTransform = 'translate(0,' + ((1 - v) * 20) + 'px)';
					c.style.WebkitTransform = 'translate3d(0,' + ((1 - v) * 20) + 'px,0)';
					c.style.opacity = v;
				});
			})();
		},
		function(x) {
			SplashNoti.show (x);
		},
		function() {
			var regs = {};
			function nnt(x) {
				var c = C('nnoti');
				c.innerHTML = x;
				var p = window.innerWidth;
				c.style.position = 'fixed';
				c.style.whiteSpace = 'nowrap';
				var t = 40;
				var row = 0;
				for (var i = 0; regs[i] !== undefined; i ++) {
					if (regs[i]() < window.innerWidth - 10) break;
				}
				row = i;
				t += row * 25;
				c.style.top = t + 'px';
				c.style.left = window.innerWidth + 'px';
				c.style.zIndex = '40';
				c.style.fontSize = '14pt';
				c.style.fontWeight = 'bold';
				c.style.color = 'white';
				var st = new Date().getTime();
				var lr = window.innerWidth + 10;
				function glr() {
					return lr;
				}
				function fr() {
					var ct = new Date().getTime();
					var l = p + (st - ct) / 5;
					c.style.left = l + 'px';
					lr = l + c.offsetWidth;
					if (lr < 0) {
						c.parentNode && c.parentNode.removeChild(c);
						return false;
					}
					return true;
				}
				dtjs2.a.m.add (fr);
				regs[row] = (glr);
				rootElement.appendChild (c);
			}
			return nnt;
		}()
	];	
	function notifyEl(x) {
		var c = C('notification');
		c.innerHTML = x;
		c.style.left = (-window.innerWidth * 1) + 'px';
		el.notify.appendChild (c);
		return c;
	}
	function notify(x) {
		styles[cstyle % styles.length] (x);
	}
	notify.vhsifnweihdunsdfux = function() {
		cstyle ++;
		PREF('awesomeThings=' + cstyle + '');
		notify ('\' \'/');
	};
	cstyle = parseInt(PREF('awesomeThings'), 10) % styles.length;
	return notify;
}();
// }

defClass("ValueAnimator").prototype.implement({
	init: function(start, duration, easing) {
		this._current = this._target = start;
		this._duration = duration || 0.34;
		this._easing = easing || dtjs2.ease.io;
	},
	getCurrent: function() { return this._current; },
	get: function() { return this._target; },
	getTarget: function() { return this._target; },
	set: function(target, animate, callback) {
		if (this._animation) {
			this._animation();
			delete this._animation;
		}
		if (this._callback) {
			this._callback();
			delete this._callback;
		}
		this._target = target;
		if (animate) {
			this._callback = callback;
			this._widthAnimation = dtjs2.a.c(this._current, this._target, this._duration, this.proxy('setFrame'), this._easing);
		} else {
			this._current = this._target;
			this.onupdate();
			if (callback) callback();
		}
	},
	setFrame: function(v, f) {
		this._current = v;
		this.frame();
		if (f && this._callback) {
			this._callback();
			delete this._callback;
		}
	},
	bindTo: function(obj, name) {
		obj['get' + name] = this.proxy('get');
		obj['set' + name] = this.proxy('set');
		return this;
	},
	frame: function() {throw new Error("unimplemented: ValueAnimator#frame()");}
});

// --twdialog--
// dialog {

defClass("TWDialog").prototype.implement({

	init: function(title, content, footer) {
		this._title = title;
		this._content = content;
		this._footer = footer;
		this._widthAnimator = new ValueAnimator(360).bindTo(this, 'Width');
		this._widthAnimator.frame = this.proxy('updateWidth');
		this._topAnimator = new ValueAnimator(60).bindTo(this, 'Top');
		this._topAnimator.frame = this.proxy('updateTop');
	},
	render: function() {
		this._element = C('tw-dialog');
		this._titleElement = C('tw-dialog-title');
		this._titleText = C('tw-dialog-title-text', 'span');
		this._closeButton = C('link', 'span');
		this._element.appendChild(this._titleElement);
		this._titleElement.appendChild(this._titleText);
		this._titleElement.appendChild(this._closeButton);
		this._closeButton.innerHTML = ' (x)';
		this._closeButton.onclick = this.proxy('hide');
		this._titleText.innerHTML = this._title;
		this._contentElement = C('tw-dialog-content');
		this._footerElement = C('tw-dialog-footer');
		this._element.appendChild(this._contentElement);
		this._element.appendChild(this._footerElement);
		this.updateWidth();
		this.updateTop();
		this.renderContent();
		this.renderFooter();
	},

	updateWidth: function() {
		if (this._element) {
			this._element.style.width = this._widthAnimator.getCurrent() + 'px';
			this._element.style.marginLeft = ((this._widthAnimator.getCurrent() + 2) / -2) + 'px';
		}
	},
	updateTop: function() {
		if (this._element) {
			this._element.style.top = this._topAnimator.getCurrent() + 'px';
		}
	},

	setWidthFrame: function(v, f) {
		this._currentWidth = v;
		this.updateWidth();
	},

	getContentElement: function() { return this._contentElement; },
	getFooterElement: function() { return this._footerElement; },

	renderPart: function(element, data) {
		if (typeof data == 'function') {
			data(element);
		} else {
			element.innerHTML = data;
		}
	},
	renderContent: function() { this.renderPart(this._contentElement, this._content); },
	renderFooter: function() { this.renderPart(this._footerElement, this._footer); },
	updateContent: function(newContent) { this._content = newContent; this.renderContent(); },
	updateFooter: function(newFooter) { this._footer = newFooter; this.renderFooter(); },

	hide: function() {
		if (!this._element || !this._element.parentNode) { return; }
		this.onhide(this.proxy('doHide'), this.proxy('disableClick'));
	},

	disableClick: function() {
		this._element.style.pointerEvents = 'none';
	},

	doHide: function() {
		this.disableClick();
		dtjs2.a.c(0, 1, 0.4, function(v, finish) {
			var e = -64 - this.getTop() - this._element.offsetHeight;
			this._element.style.marginTop = (e * v) + 'px';
			if (finish) {
				if (this._element.parentNode) this._element.parentNode.removeChild(this._element);
				this._element.style.marginTop = '0';
			}
		}.b(this), dtjs2.ease.sine.io);
	},

	show: function() {
		if (this.constructor.lastDialog) {
			this.constructor.lastDialog.hide();
		}
		this.constructor.lastDialog = this;
		this.onshow();
		if (!this._element) {
			this.render();
		}
		this._element.style.display = 'block';
		this._element.style.pointerEvents = 'auto';
		rootElement.appendChild(this._element);
	},

	onshow: function() {
	},

	onhide: function(cont, disableClicking) {
		cont();
	}

});
// }

// --buttons-bar--
// the bottom buttons bar {

defClass("TWButtonsBar").prototype.implement({

	init: function() {
		this._element = $('buttons-bar');
	},

	setButtons: function(buttons) {
		this._buttons = buttons;
		for (var i = 0; i < buttons.length; i ++) {
			buttons[i].renderTo(this._element);
		}
	},

	setOffset: function(offset) {
		this._element.style.marginRight = (-offset) + 'px';
		this._element.style.marginLeft  =   offset + 'px';
	}

});

defClass("BottomButton").prototype.implement({

	init: function(className) {
		this._className = className;
		this._states = {};
		this._visible = false;
		this._dim = false;
		this._flashing = false;
		this._element = C(this.getClass());
		this._element.onclick = this.proxy('onclick');
	},

	onclick: function() { },

	isVisible: function() { return this._visible; },
	show: function() { this._visible = true; },
	hide: function() { this._visible = false; },
	isDimmed: function() { return this._dim; },
	dim: function() { this._dim = true; },
	undim: function() { this._dim = false; },

	setState: function(x, y) { this._states[x] = y; },
	unsetState: function(x) { delete this._states[x]; },
	updateState: function() { this._element.className = this.getClass(); },

	startFlashing: function() {
		if (!this._flashing) {
			this._flashing = true;
			this.startFlashingAnimation();
		}
	},
	startFlashingAnimation: function() {
		if (this._flashingAnimation) this._flashingAnimation();
		this._flashingAnimation = dtjs2.a.c(0.7, 0.2, 0.75, this.proxy('flashingAnimationFrame'), dtjs2.ease.o);
	},
	flashingAnimationFrame: function(v, f) {
		this._element.style.opacity = v;
		if (f && this._flashing) {
			setTimeout(this.proxy('startFlashingAnimation'), 0);
		}
	},
	stopFlashing: function() {
		if (this._flashing) {
			this._flashing = false;
			if (this._flashingAnimation) this._flashingAnimation();
			this._element.style.opacity = null;
		}
	},
	isFlashing: function() { return this._flashing; },

	getClass: function() {
		var c = 'bottom-button ' + this._className;
		c += ' ' + (this._visible ? 'btn-visible' : 'btn-invisible');
		c += ' ' + (this._dim ? 'btn-dimmed' : 'btn-undimmed');
		for (var i in this._states) c += ' ' + this._states[i];
		return c;
	},

	renderTo: function(element) {
		element.appendChild(this._element);
	}

});

// }

// --tweet-bar-popup--
// a popup from tweet bar {

defClass("TweetBarPopup").prototype.implement({
	init: function(position) {
		this._element = C('tweet-bar-popup tweet-bar-popup-' + position);
		this._content = C('tweet-bar-popup-contents');
		this._element.style.height = '0px';
		this._element.appendChild(this._content);
		this._currentHeight = 0;
		this._showing = false;
		$('tweet-bar-popup-anchor').appendChild(this._element);
	},
	show: function() {
		this._showing = true;
		this.updateHeight();
	},
	hide: function() {
		this._showing = false;
		this.updateHeight();
	},
	updateHeight: function() {
		var targetHeight = this._showing ? this._content.offsetHeight : 0;
		if (this._animation) this._animation();
		this._animation = dtjs2.a.c(this._currentHeight, targetHeight, 0.25, this.proxy('updateHeightFrame'), dtjs2.ease.o);
	},
	updateHeightFrame: function(v, f) {
		this._currentHeight = v;
		this._element.style.height = v + 'px';
	},
	getContentElement: function() { return this._content; }
});

// }

// --geo--
// geolocation support {

var addressID = 0;
function showMap(lat, lng, ss) {
	var sensor = ss ? 'true' : 'false';
	var url = 'http://maps.google.com/maps/api/staticmap?' + [
		'center=' + encodeURIComponent(lat + ',' + lng),
		'size=358x200',
		'markers=' + encodeURIComponent('color:gray|' + lat + ',' + lng),
		'sensor=' + sensor
	].join('&');
	var id = ++addressID;
	var dialog = new TWDialog('Location', '<img class="link" onclick="open_link(unescape(\'' + escape('https://maps.google.com/?ll=' + lat + ',' + lng) + '\'))" src="' + url + '" alt="' + lat + ',' + lng + '">', lat + ', ' + lng);
	dialog.onhide = function(cont, dc) {
		var img = dialog.getContentElement().getElementsByTagName('img');
		if (!img) cont();
		img = img[0];
		if (!img) cont();
		dc();
		dtjs2.a.c(1, 0, 0.2, function(v, finish) {
			img.style.opacity = v;
			if (finish) cont();
		}, dtjs2.ease.io);
	};
	dialog.show();
	var xh = new XH('GET', app._components.config.api.geo + '?lat=' + lat + '&lng=' + lng + '&sensor=' + sensor);
	xh.oncomplete = function(response) {
		dialog.updateFooter(response);
	};
	xh.send();
}

defClass("TWGeo").prototype.implement({

	_enabled: false,
	
	_lat: 0,
	_lng: 0,
	_success: false,

	init: function(button) {
		this._button = button;
		this._button.onclick = this.proxy('onclick');
	},

	on: function() {
		if (this._enabled) return;
		this._enabled = true;
		this._element = $('geo-status');
		this._element.style.cursor = 'pointer';
		this._element.innerHTML = ' (Loading)';
		this._element.onclick = this.proxy('onclick');
		this._button.show(); this._button.dim(); this._button.updateState();
		try {
			this._watchID = navigator.geolocation.watchPosition(this.proxy('onsuccess'), this.proxy('onfail'),
				{
					enableHighAccuracy: true,
					maximumAge: 60000,
					timeout: 15000
				}
			);
		} catch (e) {
			this.onfail();
		}
	},
	
	onsuccess: function(position) {
		this._lat = position.coords.latitude;
		this._lng = position.coords.longitude;
		if (this._enabled) this._element.innerHTML = ' (Found)';
		this._button.undim(); this._button.updateState();
		this._success = true;
	},
	
	onclick: function() {
		if (!this._success) {
			notify ('Address not found.');
		} else {
			showMap (this._lat, this._lng, true);
		}
	},
	
	onfail: function(x) {
		if (!this._success) {
			if (this._enabled)
				this._element.innerHTML = ' (Failed)';
			this._button.dim(); this._button.updateState();
		}
	},

	off: function() {
		if (this._enabled) {
			this._element.innerHTML = '';
		}
		navigator.geolocation.clearWatch(this._watchID);
		this._button.hide(); this._button.updateState();
		if (!this._enabled) return;
		this._enabled = false;
	},

	getCoordinates: function() {
		if (this._enabled && this._success) return [this._lat, this._lng];
		return null;
	},

	getParam: function() {
		if (this._enabled && this._success) return '&lat=' + this._lat + '&lng=' + this._lng;
		return '';
	}

});

// }

// --urlshortener--

defClass("UrlShortener").prototype.implement({

	urlRegex: /(https?:\/\/|www\.)(\S*\w+)+\/?/g,

	init: function() {
		this._params = [];
	},

	addUrl: function(url) {
		if (url.match(/^http:\/\/bit\.ly/)) {
			return;
		}
		this._params.push('longUrl=' + encodeURIComponent(url));
	},

	getShortener: function() {
		return PREF('urlShortener');
	},

	queryApi: function() {
		this._pg = new Progress('Shortening URLs....');
		getRestApi(this.getShortener() + this._params.join('&') + '&callback=' + this.proxy('gotResult').callback());
	},

	gotResult: function(o) {
		var text = app._components.tweetBox.getText();
		app._components.tweetBox.setText(text.replace(this.urlRegex, function(url) {
			if (o && o.results && o.results[url]) {
				return o.results[url].shortUrl;
			}
			return url;
		}));
		this._pg.ok('Shortened');
	},

	shortenTweetBox: function() {
		var text = app._components.tweetBox.getText();
		text.replace(this.urlRegex, this.proxy('addUrl'));
		if (this._params.length > 0) {
			this.queryApi();
		} else {
			notify ('No URLs to shorten.');
		}
	}

});

// }



// --capabilities--
// client capabilities {
var Capabilities = {
	canEcho: function() {
		return !!window.thaiWitterClientEcho;
	},
	echo: function() {
		return this.canEcho() && (PREF('clientEcho') == '1');
	},
	echoParam: function() {
		return this.echo() ? '&doecho=yes' : '';
	},
	canStream: function() {
		return (!!window.thaiWitterClientStream) && (xtra_timeline === '');
	},
	stream: function() {
		return this.canStream() && (PREF('clientStream') == '1');
	},
	canGrowl: function() {
		return !!window.thaiWitterClientNotify;
	}
};
// }

// --loader--
// the feed loader {

defClass("ReloginProc").implement({

	error_element: $('rldata'),
	change_element: $('cadata')

});

defClass("ReloginProc").prototype.implement({

	init: function(error) {
		this._error = error;
		this._dialog = new TWDialog('Re-Authentication', this.proxy('renderDialog'), error ? 'sorry to hear that ;s' : '');
		this._dialog.show();
	},

	renderDialog: function(element) {
		element.appendChild(this._error ? this.constructor.error_element : this.constructor.change_element);
		element.querySelector('.rllnk').onclick = this.proxy('fire');
	},

	fire: function() {
		this._pg = new Progress('Requesting...');
		this._xh = new XH('POST', app._components.config.api.relogin + '?time=' + (new Date().getTime()) + xtra_secure);
		this._xh.setProgress(this._pg);
		this._xh.oncomplete = this.proxy('loaded');
		this._xh.sendForm('tk=' + THE_TOKEN);
	},

	loaded: function(response) {
		try {
			var data = json_parse(response);
			this._pg.ok ('Authentication Needed.');
			location.replace (data.redirect);
		} catch (e) {
			this._pg.fail ('Oops! Network Error.');
		}
	}

});

defClass("FeedLoader").prototype.implement({

	init: function(feed) {

		this._pg = new Progress('Refreshing Timeline...');
		this._feed = feed;
		this._aborted = false;

		this._xh = new XH('GET', API_GET + '?time=' + (new Date().getTime()) + Capabilities.echoParam() + xtra_params + xtra_secure);
		this._xh.setProgress(this._pg);
		this._xh.oncomplete = this.proxy('loaded');
		this._xh.send();
		
		this._pg.oncancel = this._xh.proxy('abort');

	},

	transformFromSearch: function(json) {
		var out = [];
		for (var i = 0; i < json.results.length; i ++) {
			var c = json.results[i];
			out.push({
				created_at: c.created_at,
				in_reply_to_user_id: null,
				in_reply_to_screen_name: null,
				in_reply_to_status_id: null,
				source: c.source.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
				user: {
					screen_name: c.from_user,
					id: c.from_user_id,
					id_str: c.from_user_id,
					profile_image_url: c.profile_image_url
				},
				favorited: false,
				id: c.id,
				id_str: c.id_str,
				text: c.text,
				entities: c.entities
			});
		}
		return out;
	},

	loaded: function(response) {

		try {

			// parse data
			var data = json_parse(response);
			if (data.redirect !== undefined) {
				this._pg.fail ('Authentication Needed.');
				location.replace (data.redirect);
				return;
			}

			// check name
			MY_DAMN_NAME = (this._xh.getResponseHeader('X-Twitter-Username'));
			if (!MY_DAMN_NAME) MY_DAMN_NAME = '';

			// check announcement
			var announcement = (this._xh.getResponseHeader('X-thaiWitter-Announcement'));
			if (!announcement) announcement = '';
			announcement = decodeURIComponent(announcement).replace(/^\./, '').replace(/^\s*/, '').replace(/\s*$/, '');
			this._feed.announce (announcement);

			// error handling
			if ('error' in data && data.error.match(/OAuth/)) {
				this._pg.fail ('Session Error!');
				new ReloginProc(true);
				return;
			}

			// handle search
			if (data.results) {
				data = this.transformFromSearch(data);
			}

			// add items to timeline
			data.reverse ();
			this._feed.addStatusesToTimeline(data);

			if (this._feed.isStreaming()) {
				this._feed.notifyRestToStream();
			}

			this._pg.ok ('Timeline Loaded.');

		} catch (e) {
			this._feed.handleError(response, this._pg, e);
		}
	}

});

// }

// --streaming--
// streaming {

defClass("StreamLoader").implement({

	_current: undefined,

	setCurrent: function(loader) {
		this.abortLast();
		this._current = loader;
	},
	
	abortLast: function() {
		if (this._current) {
			this._current.abort();
			delete this._current;
		}
	}

}).prototype.implement({

	init: function(feed) {

		this.constructor.setCurrent(this);

		this._feed = feed;
		this._feed.stopTimer();
		
		this._queue = [];
		this._initiated = false;
		this._restRequested = false;
		this._pg = new Progress('Initiating User Stream...');

		this.abort = this.proxy('abortGettingToken');
		this._pg.oncancel = this.proxy('abort');

		this.getStream();

	},

	isInitiated: function() { return this._initiated; },

	abortGettingToken: function() {
		if (this._xh) {
			this._xh.abort();
			this._feed.resetTimer();
			this._pg.fail('Aborted!');
			this._feed.streamAborted();
		}
	},

	getStream: function() {
		this._xh = new XH('GET', app._components.config.api.stream + '?time=' + (new Date().getTime()) + xtra_secure);
		this._xh.oncomplete = this.proxy('oncomplete');
		this._xh.send();
	},

	oncomplete: function(response) {
		if (response.substr(0, 8) == 'https://' || response.substr(0, 7) == 'http://') {
			this.initiateStream(response);
		} else {
			this._feed.resetTimer();
			try {
				var data = json_parse(response);
				if (data.redirect !== undefined) {
					this._pg.fail ('Authentication Needed.');
					location.replace (data.redirect);
				} else {
					this._feed.handleError(response, this._pg, new Error('feed could not be loaded'));
				}
			} catch (e) {
				this._feed.handleError(response, this._pg, e);
			}
		}
	},

	data: function(response) {
		var x;
		try { x = JSON.parse(response); } catch (e) { return; }
		if (x.id_str && x.text && x.user) {
			if (this._initiated) this._feed.addStatusesToTimeline([x]);
			else this._queue.push(x);
		}
	},

	didHangUp: function() {
		notify('Streaming Finished');
		if (this._pg)
			this._pg.fail('Hung up!');
		this._feed.resetTimer();
		this._feed.streamAborted();
	},
	
	notifyRest: function() {
		if (!this._initiated) {
			this._initiated = true;
			setTimeout (this.proxy('beginStream'), 1);
		}
	},

	beginStream: function() {
		this._pg.ok ('Streaming~');
		delete this._pg;
		var statuses = [];
		while (this._queue.length) {
			var c = this._queue.shift();
			if (c.id_str && c.text && c.user) {
				statuses.push(c);
			}
		}
		if (statuses.length > 0) this._feed.addStatusesToTimeline(statuses);
	},

	initiateStream: function(url) {
		if (!this._restRequested) {
			this._restRequested = true;
			this._feed.doLoad();
			this._pg.intermediate ();
		}
		this._pg.intermediate ();
		this.abort = thaiWitterClientStream(url, this.proxy('data'), this.proxy('didHangUp'));
	}

});

window.onbeforeunload = function() {
	StreamLoader.abortLast();
};

// }

// --feed--
// the feed {

defClass("Feed").prototype.implement({

	init: function(timeline) {
		this._pressTime = 0;
		this._pressCount = 0;
		this._stream = undefined;
		this._timeline = timeline;
		this._timer = 0;
		this._firstLoad = true;
	},

	isStreaming: function() { return !!this._stream; },
	notifyRestToStream: function() {
		this._stream.notifyRest();
	},

	handleError: function(response, pg, e) {
		if (response.indexOf('OVERCAPACITY!!!111') > -1 || response.indexOf('<h2>Twitter is over capacity.</h2>') > -1) {
			pg.fail ('<span style="color: #f77"><b>Twitter is Over Capacity.</b> It\'ll be back shortly I hope.</span>');
		} else if (response.indexOf('<title>The cloud is too thick...</title>') > -1) {
			pg.fail ('<span style="color: #f77"><b>The cloud is too thick!</b> It\'ll be back shortly I hope.</span>');
		} else if (response.indexOf('<h3>Guru Meditation:</h3>') > -1) {
			pg.fail ('<span style="color: #f77"><b>Server down!</b> I\'m sorry. Please try again later.</span>');
		} else {
			pg.fail ('<span style="color: #f77" onclick="alert(unescape(\'' + escape(e.toString() + (DEBUG ? '\n[ ' + response + ' ]' : '')) + '\'))">Oops! Network Error.</span>');
		}
		throw e;
	},

	stopTimer: function() {
		clearTimeout(this._timer);
	},

	resetTimer: function() {
		var rate = parseInt(PREF('refreshRate'), 10);
		if (!isFinite(rate) || isNaN(rate) || rate < 30)
			rate = 30;
		this.stopTimer();
		this._timer = setTimeout(this.proxy('load'), rate * 1000);
	},

	doLoad: function() {
		new FeedLoader(this);
	},

	streamAborted: function() {
		this._stream = undefined;
	},

	load: function() {
		if (Capabilities.stream()) {
			if (!this._stream) {
				this._stream = new StreamLoader(this);
			} else {
				if (!this._stream.isInitiated()) {
					this.doLoad();
				} else {
					if (new Date().getTime() - this._pressTime < 1250) {
						this._pressCount++;
						if (this._pressCount <= 2) {
							notify ('But it\'s streaming!!!');
						} else if (this._pressCount <= 6) {
							notify ('Stop doing that!');
						} else if (this._pressCount <= 7) {
							notify ('I will disconnect the stream if you keep pressing it!');
						} else if (this._pressCount <= 8) {
							notify ('I really will!');
						} else {
							this._pressCount = 0;
							if (this._stream) this._stream.abort();
						}
					} else {
						this._pressCount = 0;
						notify ('But it\'s streaming!');
					}
					this._pressTime = new Date().getTime();
				}
			}
			return;
		}
		this.resetTimer();
		this.doLoad();
	},

	addStatusesToTimeline: function(data) {
		var records = [];
		for (var i = 0; i < data.length; i ++) records.push(Tweet.addTweet(data[i]));
		return this.addRecordsToTimeline(records);
	},

	addRecordsToTimeline: function(data) {
		this._timeline.addRecords(data);
		if (this._firstLoad) {
			this._firstLoad = false;
			this.handleFirstLoad();
		}
	},

	handleFirstLoad: function() {
		this._timeline.selectItem(this.getDefaultSelectedItemIndex());
		this._timeline.checkScrolling();
		this._timeline.autoScroller.autoScroll();
	},

	getDefaultSelectedItemIndex: function() {
		if (xtra_timeline == 'fave' || xtra_timeline == 'dms' || xtra_timeline == 'mentions') {
			return this._timeline.items.length - 1;
		}
		return 0;
	},

	announce: function(announcement) {
		this._timeline.setAnnouncement(announcement);
	}

});

// }


// --media--
// a record holding a media {
defClass("TwitterMedia").implement({

	_map: {},

	register: function(media) {
		if (media.url)          this._map[media.url]          = media;
		if (media.expanded_url) this._map[media.expanded_url] = media;
		if (media.id_str)       this._map[media.id_str]       = media;
	},

	get: function(id) {
		return this._map[id];
	}

});

defClass("UrlExpander").implement({

	_map: {},

	register: function(url, expanded) {
		this._map[url] = expanded;
	},

	expand: function(url) {
		if (this._map[url] != null) return this._map[url];
		return url;
	}

});
// }

// --user-record--
// a record holding user

defClass("UserRecord").implement({

	_db: {},
	_screenNameDb: {},

	normalizeName: function(screenName) { return (screenName + '').toLowerCase(); },

	makeUser: function(o, context) {
		var id = o.id_str, normalizedScreenName = UserRecord.normalizeName(o.screen_name);
		var user = this._db[id];
		if (!user) this._db[id] = user = new UserRecord(id);
		this._screenNameDb[normalizedScreenName] = user;
		user.load(o, context);
		return user;
	},

	get: function(id) {
		return this._db[id];
	},

	find: function(screenName) {
		var normalizedScreenName = UserRecord.normalizeName(screenName);
		return this._screenNameDb[normalizedScreenName];
	}

}).prototype.implement({

	init: function(id) {
		this.id = id;
		this._lastTime = -1;
	},

	load: function(o, s) {
		var isNewer = false, created;
		if (s == null) s = o.status;
		if (s && s.created_at) {
			created = new Date(s.created_at).getTime();
			isNewer = (created >= this._lastTime);
		}
		if (this._lastTime == -1) isNewer = true;
		if (isNewer && created != null) this._lastTime = created;
		var properties = [
			['screen_name', 'username'],
			['screen_name', 'name'],
			['name', 'name'],
			['profile_image_url', 'picture']
		];
		if (location.protocol == 'https:') {
			properties.push(['profile_image_url_https', 'picture']);
		}
		for (var i = 0; i < properties.length; i ++) {
			if (o[properties[i][0]] && (isNewer || this[properties[i][1]] == null)) {
				this[properties[i][1]] = o[properties[i][0]];
			}
		}
		this.normalizedUsername = String(this.username).toLowerCase();
	}

});

// }

// --user-mentions--
// {

defClass("UserMentions").implement({

	parse: function(text) {
		var obj = new UserMentions();
		text.replace(/\B@([a-z0-9_A-Z]+)/g, function(all, screenName) {
			obj.add(screenName);
		});
		return obj;
	},

	fromEntities: function(entities, text) {
		var obj = new UserMentions();
		for (var i = 0; i < entities.length; i ++) {
			obj.add(entities[i].screen_name);
		}
		return obj;
	}

}).prototype.implement({

	init: function() {
		this._map = {};
		this._list = [];
	},

	add: function(screenName) {
		var name = UserRecord.normalizeName(screenName);
		if (this._map[name] == null) {
			this._map[name] = true;
			this._list.push(screenName);
		}
	},

	getList: function() {
		var all = [];
		for (var i = 0; i < this._list.length; i ++) {
			var user = UserRecord.find(this._list[i]);
			all.push(user ? user.username : this._list[i]);
		}
		return all;
	},

	contains: function(screenName) { return this._map[UserRecord.normalizeName(screenName)] != null; }

});

// }

// --record--
// a structure holding a record {

defClass("Tweet").implement({
	
	_all: [],
	_db: {}, // id to tweet record
	_adjacency: {}, // id to branches (replies and retweets) = adjacency map

	getTweet: function(id, create) {
		if (create && !(id in this._db)) {
			this._db[id] = new Tweet();
			this._all.push(this._db[id]);
		}
		if (this._db[id]) {
			return this._db[id];
		}
	},

	getAllTweets: function() { return this._all; },

	addTweet: function(item) {
		var tweet = this.getTweet(item.id_str, true);
		tweet.load(item);
		return tweet;
	},

	addPlaceholder: function(item) {
		var tweet = this.getTweet(item.id, true);
		tweet.placeholder(item);
		return tweet;
	},

	addConnection: function(parentID, child) {
		if (!(parentID in this._adjacency)) this._adjacency[parentID] = {};
		this._adjacency[parentID][child.id] = child;
	},

	getBranches: function(child) {
		return this._adjacency[child.id];
	},

	getters: {
		text:   function(tweet) { return tweet.decodedText; },
		source: function(tweet) { return tweet.source ? tweet.source.name : 'N/A'; },
		from:   function(tweet) { return tweet.user.username; }
	}

}).prototype.implement({
	
	init: function() {
		this.id = -1;
		this.items = [];
		this.text = '';
		this.loaded = false;
		this.jobs = 0;
	},

	placeholder: function(item) {
		if (!this.loaded) {
			this.id = item.id;
			this.user = item.user;
		}
	},

	doJob: function() {
		this.jobs ++;
		this.updateJobs();
		return this.proxy('doneJob');
	},
	
	doneJob: function() {
		this.jobs --;
		this.updateJobs();
	},

	load: function(item) {
		var match;
		this.id = item.id_str;
		this.loaded = true;
		this.date = new Date(item.created_at);
		this.setFaved(item.favorited);
		if (item.in_reply_to_status_id) {
			this.reply = this.constructor.addPlaceholder({
				id: item.in_reply_to_status_id_str,
				user: UserRecord.makeUser({
					screen_name: item.in_reply_to_screen_name,
					id_str: item.in_reply_to_user_id_str
				})
			});
			this.constructor.addConnection(this.reply.id, this);
		}
		if (item.retweeted_status) {
			this.retweet = this.constructor.addTweet(item.retweeted_status);
			this.constructor.addConnection(this.retweet.id, this);
		}
		this.text = item.text;
		this.decodedText = item.text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/, '&');
		this.source = {
			url: '',
			name: 'N/A'
		};
		if (item.source) {
			if ((match = item.source.match(/^<a href="([^"]+)"/))) {
				this.source.url = match[1];
			}
			if ((match = item.source.match(/([^<>]+)(<\/a>)?$/))) {
				this.source.name = match[1];
			}
		}
		var userObject = item.user;
		if (!userObject) userObject = item.sender;
		this.user = UserRecord.makeUser(userObject, item);
		this.mine = this.user && this.user.username == MY_DAMN_NAME;
		this.mention = MY_DAMN_NAME !== '' && (UserMentions.parse(this.text).contains(MY_DAMN_NAME));
		this.mentions = (item.entities && item.entities.user_mentions) ? UserMentions.fromEntities(item.entities.user_mentions, item.text) : UserMentions.parse(this.text);
		this.protect = !!userObject['protected'];
		this.dm = !item.user && !!item.sender;
		this.urls = {};
		if (item.entities && item.entities.urls) {
			for (var i = 0; i < item.entities.urls.length; i ++) {
				if (item.entities.urls[i].expanded_url && item.entities.urls[i].display_url) {
					this.urls[item.entities.urls[i].url] = item.entities.urls[i];
					UrlExpander.register(item.entities.urls[i].url, item.entities.urls[i].expanded_url);
				}
			}
		}
		this.entities = item.entities;
		if (this.entities && this.entities.media && this.entities.media.length > 0) {
			for (var i = 0; i < this.entities.media.length; i ++) {
				TwitterMedia.register(this.entities.media[i]);
			}
		}
		this.geo = item.geo;
		for (var i = 0; i < this.items.length; i ++) {
			this.items[i].renderElement();
		}

		// mt
		this.findMt()
	},

	findMt: function() {
	  	var m = this.text.match(/^\s*MT\s+@([a-z0-9_A-Z]+)/)
	  	if (m) {
			this.mt = this.constructor.addPlaceholder({
				id: '_mt_' + this.id,
				user: UserRecord.makeUser({
					screen_name: 'MT',
					id_str: '_mt_user'
				})
			});
			this.mt.mtChild = this
			this.mt.mtOwner = m[1]
			this.constructor.addConnection('_mt_' + this.id, this);
		}
	},

	getProperty: function(name) {
		return (name in Tweet.getters) ? Tweet.getters[name](this) : '';
	},

	updateJobs: function(num) {
		for (var i = 0; i < this.items.length; i ++) {
			this.items[i].updateJobs();
		}
	},

	remove: function(num) {
		for (var i = 0; i < this.items.length; i ++) {
			this.items[i].getTimeline().removeItem(this.items[i]);
		}
	},

	addItem: function(item) {
		this.items.push(item);
	},

	test: function(str) {
		if (this.user.username.toLowerCase().indexOf(str.toLowerCase()) > -1) {
			return true;
		}
		if (this.decodedText.toLowerCase().indexOf(str.toLowerCase()) > -1) {
			return true;
		}
		if ((this.user.username + ' ' + this.decodedText).toLowerCase().indexOf(str.toLowerCase()) > -1) {
			return true;
		}
		return false;
	},

	getRetweetText: function() {
		return this.getRetweetPrefix() + ': ' + this.decodedText;
	},

	getRetweetPrefix: function() {
		return 'RT @' + this.user.username;
	},

	setItemState: function(k, v) {
		for (var i = 0; i < this.items.length; i ++) {
			this.items[i].setState(k, v);
		}
	},

	check: function() {
		var mention = UserMentions.parse(app._components.tweetBox.getText()).contains(this.user.username) && !~(app._components.tweetBox.getText().indexOf(this.getRetweetPrefix()));
		var replyClass = (mention || app._components.tweetBox.getText() === this.getRetweetText()) ? 'status-reply-to' : '';
		this.setItemState('replying', replyClass);
		return mention;
	},

	uncheck: function() {
		this.setItemState('replying', '');
	},

	toggleFave: function() {
		new FaveToggler(this).toggle();
	},
	
	setFaved: function(flag) {
		this.favorited = flag;
		this.setItemState('fave', flag ? 'status-faved' : '');
	},

	reHighlight: function() {
		this.highlighted = app._components.highlighter.check(this.text, this);
		this.setItemState('highlight', this.highlighted ? 'status-highed' : '');
	},

	getBranches: function() { return this.constructor.getBranches(this); },

	getParent: function() { return this.reply || this.retweet || this.mt; },

	findRoot: function() {
		var root = this;
		while ( (prnt = root.getParent()) ) {
			root = prnt;
		}
		return root;
	}

});

defClass("FaveToggler").prototype.implement({

	init: function(record) {
		this._record = record;
	},

	toggle: function() {
		this._mode   = this._record.favorited ? 'destroy' : 'create';
		this._target = !this._record.favorited;
		this._record.setFaved(this._target);
		this.request();
	},

	request: function() {
		this._job = this._record.doJob();
		this._xh = new XH('POST', app._components.config.api.fave + '?time=' + (new Date().getTime()));
		this._xh.oncomplete = this.proxy('oncomplete');
		this._xh.sendForm('mode=' + this._mode + '&id=' + this._record.id + '&tk=' + THE_TOKEN);
	},

	oncomplete: function(response) {
		try {
			var data = json_parse(response);
			if (data.id_str) {
				this._record.setFaved(this._target);
			} else {
				this._record.setFaved(!this._target);
			}
		} catch (e) {
			notify ('Couldn\'t Save Favourite');
			this._record.setFaved(!this._target);
		}
		this._job();
	}

});

// }

// --notifier--

defClass("Notifier").prototype.implement({

	overridden: false,

	init: function() {
		this.reset();
		this._timer = 0;
	},

	reset: function() {
		this._count = 0;
		this._mention = false;
		this._highlight = false;
		this._main = undefined;
	},

	addRecord: function(record) {
		this._count ++;
		if (record.mention) {
			this._mention = true;
			this._main = record;
		}
		if (record.highlighted) {
			this._highlight = true;
			if (!this._mention) this._main = record;
		}
		if (!this._main) {
			this._main = record;
		}
	},

	getDelay: function() {
		if (this._mention) {
			return 0;
		} else {
			return (this._highlight ? 1000 : 10000) * Math.sqrt(Math.max(0, 1 - this.count / 15));
		}
	},

	commit: function(now) {
		clearTimeout(this._timer);
		this._timer = setTimeout(this.proxy('notify'), now ? 0 : this.getDelay());
	},

	notify: function() {
		if (this._count > 0) {
			var title = (this._count == 1) ? '1 new tweet.' : this._count + ' new tweets.';
			var text = this._main.user.username + ' ' + this._main.text;
			if (this._mention) {
				text += ' [Your Name Mentioned!]';
			} else if (this._highlight) {
				text += ' [Highlight]';
			} else {
				text += ' ';
			}
			var mode = PREF('sysNotifyMode'), shouldShow = false;
			if (this.overridden) shouldShow = true;
			else if (mode == '2' && this._mention) shouldShow = true;
			else if (mode == '3' && (this._mention || this._highlight)) shouldShow = true;
			else if (mode != '2' && mode != '3') shouldShow = true;
			var picture;
			if (PREF('notificationPicture') == '1') {
				picture = this._main.user.picture;
			}
			if (window.sessionStorage && sessionStorage.getItem('notify' + this._main.id)) shouldShow = false;
			if (shouldShow) {
				sysNotify(title, text, this.overridden, picture);
				sessionStorage.setItem('notify' + this._main.id, true);
			}
		}
		this.reset();
	}

});

// }

// --announcement--
// announcement component {

defClass("Announcement").prototype.implement({

	init: function(txt) {
		this._element = C('announce');
		this._element.innerHTML =
			'<div class="announce-padder">' +
				'<div class="announce-wrap">' +
					'<div class="announce-title">Announcement</div>' +
					'<div class="announce-text">' + txt + '</div>' +
				'</div>' +
			'</div>';
		this._padder = this._element.firstChild;
	},

	renderTo: function(container) {
		container.appendChild(this._element);
		this._padder.style.marginTop = (-this._padder.offsetHeight) + 'px';
		dtjs2.a.c (1, 0, 0.8, this.proxy('animationFrame'), dtjs2.ease.o);
	},

	animationFrame: function(v) {
		this._padder.style.marginTop = (v * -this._padder.offsetHeight) + 'px';
	}

});

// }

// --item--
// the item component,
// an on screen representative of a record {

defClass("Item").prototype.implement({

	meta: ['Retweet', 'Geolocation', 'Date', 'Source', 'Reply'],

	getElement: function() { return this._element; },
	getTimeline: function() { return this._timeline; },

	init: function(timeline, changeset, record) {
		this._timeline = timeline;
		if (changeset) this._changeset = changeset;

		this._record = this.record = record;
		this._record.addItem(this);
		this._element = C('status');
		this._content = C('status-content');
		this._element.appendChild(this._content);
		this._element.setAttribute('data-tw-status-item', this._record.id);
		this.renderElement();
		this._state = {};
		if (this._record.mention) {
			this.setState('mention', 'status-mention');
		}
		if (this._record.favorited) {
			this.setState('fave', 'status-faved');
		}
		this._record.reHighlight();
		this.reFilter();
	},

	setState: function(stateName, stateValue) {
		this._state[stateName] = stateValue;
		var className = 'status';
		for (var i in this._state) {
			className += ' ' + this._state[i];
		}
		this._element.className = className;
	},

	updateJobs: function() {
		var num = this._record.jobs;
		if (num === 0) {
			this._element.style.opacity = '';
		} else {
			this._element.style.opacity = 1 / (1 + (num * 0.6));
		}
	},

	getFormattedText: function() {
		if (this._record.retweet) {
			return '<span class="status-retweet-this-is-newer">' +
				'RT ' + this.formatText('@' + this._record.retweet.user.username) + '<span class="status-rt">:</span>' +
			'</span> ' + this.formatText(this._record.retweet.text);
		}
		return this.formatText(this._record.text);
	},

	formatDate: function(cdate) {
		var fdate = '';
		var now = new Date();
		if (cdate.getDate() != now.getDate() || cdate.getMonth() != now.getMonth() || cdate.getFullYear() != now.getFullYear()) {
			fdate = (cdate.getFullYear() != now.getFullYear() ? cdate.getFullYear() + '-' : '') + twoDigits(cdate.getMonth() + 1) + '-' + twoDigits(cdate.getDate()) + ' ';
		}
		return fdate + cdate.getHours() + ':' + twoDigits(cdate.getMinutes()) + ':' + twoDigits(cdate.getSeconds());
	},

	formatText: function(x) {
		var rec = this._record;
		var shouldExpand = x.replace(/(https?:\/\/|www\.)(\S*[\w\/]+)+/g, function(a) {
			if (rec.urls[a]) return decodeUTF(rec.urls[a].expanded_url);
			return a;
		}).length <= 180;
		return x.replace(/((https?:\/\/|www\.)(\S*[\w\/]+)+)|\B(@[a-z0-9_A-Z]+(\/[a-z0-9_A-Z\-]+)?)|\B(#[a-z0-9\-_A-Z]+)/g, function(all, url, url_scheme, url_data, mention, mention_list, hashtag) {
			if (url != null && url !== '') {
				var title = '';
				var display = url;
				var expanded = url;
				if (rec.urls[url]) {
					expanded = rec.urls[url].expanded_url;
					if (shouldExpand) display = rec.urls[url].expanded_url;
					else title = ' title="' + decodeUTF(rec.urls[url].expanded_url, true).replace(/"/g, '&quot;') + '"';
				}
				return '<span islink="yes" class="status-link-this-is-new" ' + dataAttr('url', url) + ' ' + dataAttr('url2', expanded) + ' ' + title + '>' + decodeUTF(display, true).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/"/g, '&gt;') + '</span>';
			}
			if (mention != null && mention !== '') {
				return '<span class="status-link-this-is-new" data-username="' + UserRecord.normalizeName(mention.substr(1)).replace(/[\/].*/, '') + '" ' + dataAttr('username', mention.substr(1)) + '>' + mention + '</span>';
			}
			if (hashtag != null && hashtag !== '') {
				return '<span class="status-link-this-is-new" ' + dataAttr('search', hashtag) + '>' + hashtag + '</span>';
			}
			return all;
		});
	},

	render: function() { return this._record.loaded ? this.renderLoaded() : this.renderNotLoaded(); },

	renderNotLoaded: function() { 
		return '<div class="status-load" ' + dataAttr('load', this._record.id) + '>' +
		(this._record.mtChild ? 'guess original tweet' : 'load more') +
		'</div>'; },
	
	renderLoaded: function() { 
		return '<img class="status-picture" src="' + this._record.user.picture + '" ' + dataAttr('username', this._record.user.username) + '>' +
		'<div class="status-inner">' +
			this.renderInner() +
		'</div>'; },

	renderInner: function() { 
		return '<span class="status-username"><span class="status-username-text">' + this._record.user.username + '</span> </span>' +
		'<span class="status-text"> ' + this.getFormattedText() + ' </span>' +
		'<span class="status-date">' + this.getMeta() + '</span>'; },
	
	renderTo: function(container) {
		container.appendChild(this._element);
	},
	renderElement: function(container) {
		if (this._innerElement) {
			this._innerElement.innerHTML = this.renderInner();
		} else {
			this._content.innerHTML = this.render();
			if (this._content.querySelector) {
				this._innerElement = this._content.querySelector('div.status-inner');
			}
		}
		if (this._record.loaded && this._record.user) {
			this._element.setAttribute('data-username', UserRecord.normalizeName(this._record.user.username));
			this._element.setAttribute('data-user', this._record.user.id);
		}
	},
	getMeta: function() {
		var meta = '';
		for (var i = 0; i < this.meta.length; i ++) {
			meta += this['meta' + this.meta[i]]();
		}
		return meta;
	},
	metaRetweet: function() {
		if (!this._record.retweet) return '';
		return '<span class="status-retweet-indicator status-date-link" ' + dataAttr('owner', this._record.retweet.user.username) + ' ' + dataAttr('status', this._record.retweet.id) + '>(rt) </span>';
	},
	metaGeolocation: function() {
		if (!this._record.geo || !this._record.geo.coordinates || !this._record.geo.coordinates.join) return '';
		return '<span class="status-geo-indicator status-date-link" ' + dataAttr('geo', this._record.geo.coordinates.join(',')) + '>(geo) </span>';
	},
	metaDate: function() {
		return '<span class="status-date-text status-date-link" ' + dataAttr('owner', this._record.user.username) + ' ' + dataAttr('status', this._record.id) + '>' + this.formatDate(this._record.date) + '</span>';
	},
	metaSource: function() {
		var src = this._record.source.name;
		if (this._record.source.url !== '')
			src = '<span class="status-date-link" ' + dataAttr('url', this._record.source.url) + '>' + src + '</span>';
		return '<span class="status-client"> from ' + src + '</span>';
	},
	metaReply: function() {
		if (!this._record.reply) return '';
		return '<span class="status-in-reply-to"> <span class="status-date-link" ' + dataAttr('reply-to', this._record.id) + '> &raquo; ' + this._record.reply.user.username + '</span></span>';
	},

	getPosition: function() {
		return this._element.offsetTop - (this._changeset ? this._changeset.getMargin() : 0);
	},
	getHeight: function() {
		return this._element.offsetHeight;
	},
	reFilter: function() {
		this.visible = this._record.mention || !app._components.filter.check(this._record.text, this._record);
		this.setState('filtered', this.visible ? '' : 'status-filtered');
	}

});

// }

// --changeset--
// set of tweets in an update

defClass("Changeset").prototype.implement({

	init: function(single) {
		this._element = C('changeset');
		this._items = [];
		this._margin = 0;
		this._single = single;
	},
	
	finish: function() {
		if (this._items.length > 0) {
			dtjs2.a.c (0, 1, 0.8, function(v) {
				var margin = Math.round(window.innerHeight * (1 - v));
				this._margin = margin;
				this._element.style.marginTop = margin + 'px';
			}.b(this), dtjs2.ease.sine.o);
		}
	},

	renderTo: function(element) {
		element.appendChild(this._element);
	},

	add: function(item) {
		this._items.push(item);
	},

	isSingle: function() { return this._single; },
	getElement: function() { return this._element; },
	getMargin: function() { return this._margin; }

});

// }



// --base-timeline--

defClass("BaseTimeline").prototype.implement({

	// --base-timeline-factories-- {
	createCommands: function() { return new TimelineCommands(this); },
	createKeyHandler: function() { return new TimelineKeyHandler(this); },
	createMouseHandler: function() { return new TimelineMouseHandler(this); },
	// }

	// --base-timeline-init-- {
	init: function() {
		
		this._changeset = undefined;

		this.initScrollingSystem();
		this.holdScroller = new HoldScroller(this);
		this.cmd          = this.createCommands();
		this.keyHandler   = this.createKeyHandler();
		this.mouseHandler = this.createMouseHandler();

		this.items        = [];        // visible items
		this.allItems     = [];        // ALL items
		this.map          = {};        // map ID to items

		this._selectedItem = undefined; // selected item

		this.checkScrollPeriodically();
		this.initChangers();

	},
	// }

	// --base-timeline-selection-- {

	getCurrent: function() { return this._selectedItem; },
	selectItem: function(n, noScroll) {
		this.select(this.items[n], noScroll);
	},
	select: function(item, noScroll) {
		if (this._selectedItem) this._selectedItem.setState('selected', '');
		item.setState('selected', 'status-selected');
		this._selectedItem = item;
		this.restat();
		if (!noScroll) this.checkScrolling();
	},
	selectById: function(id) {
		this.select(this.map[id]);
	},
	moveItem: function(offset, noScroll) {
		if (!this._selectedItem) return;
		var n = this._selectedItem.index + offset;
		if (n > this.items.length - 1) {
			n = this.items.length - 1;
		} else if (n < 0) {
			n = 0;
		}
		this.selectItem(n, noScroll);
	},
	moveScroll: function(offset) {
		var c = this.getCurrent();
		if (!c) return;
		var oldIndex = c.index, newIndex, add = 0,
			topAnchor = c.getPosition() - this.getScrollPos(),
			bottomAnchor = topAnchor + c.getHeight(),
			threshould = 150,
			visible = {
				top:    el.head.offsetHeight + threshould,
				bottom: this.getHeight() - el.tweetData.offsetHeight - threshould
			};
		this.moveItem (offset, true);
		c = app._components.timeline.getCurrent();
		newIndex = c.index;
		if (oldIndex == newIndex) {
			add = c.getHeight();
		}
		if (offset > 0) {
			topAnchor += (visible.top - topAnchor) / 10;
			app._components.timeline.setScrollPos (c.getPosition() - topAnchor + add);
		} else {
			bottomAnchor += (visible.bottom - bottomAnchor) / 10;
			app._components.timeline.setScrollPos (c.getPosition() + c.getHeight() - bottomAnchor - add);
		}
	},
	movePage: function(direction) {
		var current = 0,
			visible = this.getVisibleArea(),
			target = visible.bottom - visible.top,
			last = this._selectedItem.index;
		for (var i = last; 0 <= i && i < this.items.length; i += direction) {
			current += this.items[i].getHeight();
			if (current > target) {
				break;
			}
			last = i;
		}
		this.selectItem(last);
	},
	find: function(query, direction) {
		var last = this._selectedItem.index;
		for (var i = last + direction; 0 <= i && i < this.items.length; i += direction) {
			if (query === '' ? this.items[i].record.mention : this.items[i].record.test(query)) {
				this.selectItem(i);
				return;
			}
			last = i;
		}
		if (query === '') this.selectItem(last);
		else notify((direction > 0 ? 'End of timeline reached.' : 'Start of timeline reached.'));
	},

	// }

	// --base-timeline-stat-- {
	scrollStatChanged: function(x) {
	},
	unreadStatChanged: function(x) {
	},
	initChangers: function() {
		this._changeScrollStat = changer(this.proxy('scrollStatChanged'));
		this._changeUnreadStat = changer(this.proxy('unreadStatChanged'));
	},
	restat: function() {
		var count = this.allItems.length, unread = 0, mentions = 0;
		this._changeScrollStat((this._selectedItem.realIndex + 1) + ' / ' + count);
		for (var i = this._selectedItem.index + 1; i < this.items.length; i ++) {
			unread ++;
			if (this.items[i].record.mention) mentions ++;
		}
		if (window.platform && window.platform.icon) {
			try {
				window.platform.icon().badgeText = mentions === 0 ? '' : mentions;
			} catch (e) {
			}
		}
		this._changeUnreadStat ((unread ? '(' + (mentions ? mentions + '! ' : '') + unread + ') ' : '') + xtra_keyword + '@' + MY_DAMN_NAME + ' ' + APP_NAME);
	},
	
	// }

	// --base-timeline-add-- {

	beginChangeset: function(single) {
		this._changeset = new Changeset(single === true ? true : false);
	},

	endChangeset: function() {

		var changeset = this._changeset;
		this._changeset = undefined;

		changeset.finish();
		changeset.renderTo(this.element);

		if (this.notifier) {
			this.notifier.commit(!changeset.isSingle());
		}
		if (this._selectedItem != null) {
			this.restat();
		}
		return changeset;

	},

	createItem: function(record) {
		if (this.map[record.id]) {
			return this.map[record.id];
		}
		var item = new Item(this, this._changeset, record);
		this.map[record.id] = item;
		return item;
	},

	appendItem: function(item) {
		item.realIndex = this.allItems.length;
		this.allItems[item.realIndex] = item;
		if (item.visible) {
			item.index = this.items.length;
			this.items[item.index] = item;
		}
	},

	addRecords: function(items) {
		this.beginChangeset();
		for (var i = 0; i < items.length; i ++) {
			this.addRecord(items[i]);
		}
		this.endChangeset();
	},

	setRecords: function(records) {
		while (this.element.firstChild) this.element.removeChild(this.element.firstChild);
		this.items    = [];
		this.allItems = [];
		for (var i = 0; i < records.length; i ++) {
			var record = records[i];
			var item   = this.createItem(record);
			this.renderItem(item);
			this.appendItem(item);
		}
	},

	addRecord: function(record) {
		if (!this._changeset) {
			this.beginChangeset(true);
			var item = this.addRecord(record);
			this.endChangeset();
			return item;
		}
		if (this.map[record.id]) {
			return this.map[record.id];
		}
		var item = this.createItem(record);
		this.renderItem(item);
		this.appendItem(item);
		this._changeset.add(item);
		if (this.notifier && item.visible) {
			this.notifier.addRecord(record);
		}
		return item;
	},

	renderItem: function(item) {
		if (this._changeset) {
			item.renderTo(this._changeset.getElement());
		} else {
			item.renderTo(this.element);
		}
	},
	addItem: function(raw) {
		return this.addRecord(Tweet.addTweet(raw));
	},

	// }

	// --base-timeline-remove-- {
	timelineStructureChanged: function(start) {
		// try to select next item
		var length = this.allItems.length;
		for (var i = start, j = start; 0 <= i || j < length; i --, j ++) {
			if (j < length && this.allItems[j].visible) {
				this.select(this.allItems[j]);
				break;
			}
			if (i != j && 0 <= i && this.allItems[i].visible) {
				this.select(this.allItems[i]);
				break;
			}
		}
		this.restat();
	},

	removeItem: function(item) {
		this.allItems.splice(item.realIndex, 1);
		this.items.splice(item.index, 1);
		var el = item.getElement();
		delete this.map[item.record.id];
		for (var i = item.realIndex; i < this.allItems.length; i ++) {
			this.allItems[i].realIndex = i;
		}
		for (var i = item.index; i < this.items.length; i ++) {
			this.items[i].index = i;
		}
		if (el.parentNode) el.parentNode.removeChild(el);
		this.timelineStructureChanged(item.realIndex);
	}
	// }

});
// }

// --base-timeline-scroll-- {
defClass("BaseTimeline").prototype.implement({
	
	initScrollingSystem: function() {
		this._$scrolling_scrollPos = 0;       // target position
		this._$scrolling_curScrollPos = 0;    // current position
		this.scrollTo(0, 0);
	},
	getHeight: function() { return this.element.parentNode.offsetHeight; },
	getTopPad: function() { return 0; },
	getBottomPad: function() { return 0; },
	getMinScroll: function() { return 0; },
	getMaxScroll: function() { return Math.max(0, this.element.offsetHeight - this.element.parentNode.offsetHeight); },
	getDefaultThreshould: function() { return 100; },

	// internal use
	scrollTo: function(x, y) {
		this.element.style.top = (-y) + 'px';
	},

	// scrolling: use this!
	shouldSmoothScroll: function() { return !this.holdScroller.isScrolling(); },
	getScrollPos: function() { return this._$scrolling_scrollPos; },    // normal usage
	getCurrentScrollPos: function() { return this._$scrolling_curScrollPos; }, // real current scrolling pos

	// scroll to some place
	setScrollPos: function(x, noSmooth) {
		x = Math.round(Math.max(Math.min(x, this.getMaxScroll()), this.getMinScroll()));
		this._$scrolling_scrollPos = x;
		if (!this.shouldSmoothScroll() || noSmooth) {
			this._$scrolling_curScrollPos = x;
			this.scrollTo (0, x);
		} else {
			dtjs2.a.m.add (this.proxy('scroller'));
			this.scroller();
		}
	},

	shiftScrollPos: function(x) {
		this._$scrolling_scrollPos    = Math.round(this._$scrolling_scrollPos + x);
		this._$scrolling_curScrollPos = Math.round(this._$scrolling_curScrollPos + x);
		this.scrollTo (0, this._$scrolling_curScrollPos);
	},

	// scroll tracking
	scroller: function() {
		if (!this._animationInfo) {
			this._animationInfo = {};
		}
		var info = this._animationInfo;
		if (info.target != this._$scrolling_scrollPos) {
			info.target = this._$scrolling_scrollPos;
			info.x0 = Math.abs(this._$scrolling_curScrollPos - this._$scrolling_scrollPos);
			info.v0 = (info.v == null ? 0 : info.v);
			info.direction = this._$scrolling_curScrollPos < this._$scrolling_scrollPos ? -1 : 1;
			info.start = new Date().getTime() - 1000 / 60;
		}
		this._$scrolling_curScrollPos = this._$scrolling_scrollPos;
		var t = (new Date().getTime() - info.start) / 1000 * 50;
		var coeff = 5; // acceleration coefficient
		var friction = 0.27; // friction
		var a = -friction * -(coeff / 2);
		var b = -friction * info.v0 + coeff;
		var c = -friction * info.x0 - info.v0;
		var critical = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
		var x = 0;
		var shouldContinue = true;
		if (t >= critical) {
			x = (info.x0 + info.v0 * critical - coeff / 2 * critical * critical) * Math.exp(-friction * (t - critical));
			info.v = -friction * x;
		} else {
			x = (info.x0 + info.v0 * t - coeff / 2 * t * t);
			info.v = info.v0 - coeff * t;
		}
		this._$scrolling_curScrollPos = Math.round(info.target + info.direction * x);
		if (t >= critical && info.v > -0.2) {
			info.v = 0;
			this._$scrolling_curScrollPos = info.target;
			shouldContinue = false;
		}
		this.scrollTo(0, this._$scrolling_curScrollPos);
		return shouldContinue;
	},

	// check that the current item is in the visible area
	checkScrolling: function(threshould) {
		if (!this._selectedItem) return;
		if (threshould === undefined) threshould = this.getDefaultThreshould();
		var c = this._selectedItem;

		// item
		var t = c.getPosition(),
			b = t + c.getHeight(),
			v = this.getVisibleArea();

		v.top += threshould;
		v.bottom -= threshould;

		if (b > v.bottom) {
			this.setScrollPos (b - app._components.timeline.getHeight() + this.getBottomPad() + threshould);
		} else if (t < v.top) {
			this.setScrollPos (t - this.getTopPad() - threshould);
		}
	},

	getVisibleArea: function() {
		var tt = this.getScrollPos() + this.getTopPad();
		var bb = this.getScrollPos() + this.getHeight() - this.getBottomPad();
		return { top: tt, bottom: bb };
	},
	autoCheckScrolling: function() {
		if (this.shouldSmoothScroll()) this.checkScrolling(0);
	},
	checkScrollPeriodically: function() {
		setInterval (this.proxy('autoCheckScrolling'), 500);
	}

});
// }

// --timeline--
// the timeline component {

defClass("Timeline", BaseTimeline).prototype.implement({

	// --timeline-init-- {
	init: function() {

		this.element  = $('tweet-display');
		this.feed     = new Feed(this);
		this.notifier = app._components.notifier;
		this.announcement = '';

		arguments.callee._super.call(this);

		this.autoScroller = new AutoScroller(this);

	},
	// }

	// --timeline-scroll-- {
	getHeight: function() { return window.innerHeight; },
	getTopPad: function() { return el.head.offsetHeight; },
	getBottomPad: function() { return el.tweetData.offsetHeight; },
	getMaxScroll: function() { return document.documentElement.scrollHeight - window.innerHeight; },

	scrollTo: function(x, y) {
		window.scrollTo (0, y);
	},
	// }
	
	// --timeline-stat-- {
	scrollStatChanged: function(x) {
		el.status.scroll.innerHTML = x;
	},
	unreadStatChanged: function(x) {
		document.title = x;
	},
	// }

	// --timeline-announcement-- {
	setAnnouncement: function(announcement) {
		if (this.announcement !== announcement) {
			this.announcement = announcement;
			if (announcement !== '') {
				this.addAnnouncement(announcement);
			}
		}
	},
	addAnnouncement: function(txt) {
		var announcement = new Announcement(txt);
		announcement.renderTo(this.element);
	},
	// }

	// --timeline-highlight-- {
	reFilter: function() {
		if (this.allItems.length === 0) return;
		var start = this._selectedItem.realIndex, length = this.allItems.length;
		this.items = [];
		for (var i = 0; i < length; i ++) {
			this.allItems[i].reFilter();
			if (this.allItems[i].visible) {
				this.allItems[i].index = this.items.length;
				this.items[this.items.length] = this.allItems[i];
			}
		}
		this.timelineStructureChanged(start);
	}
	// }

});

// }

// --tl-mouse--

defClass("TimelineMouseHandler").prototype.implement({

	handlers: {},
	register: implementable('handlers'),

	init: function(timeline) {
		this._timeline = timeline;
		this._timeline.element.addEventListener('click', this.proxy('handleClick'), false);
	},

	handleClick: function(e) {
		var c;
		function h(n) { return c.hasAttribute('data-tw-' + n); }           // has attribute
		function g(n) { return unescape(c.getAttribute('data-tw-' + n)); } // get attribute
		for (c = e.target; c && c !== this.element && c !== document.body; c = c.parentNode) {
			if (c.hasAttribute) {
				for (var i in this.handlers) {
					if (h(i)) {
						this.handlers[i].call(this, e, c, g);
					}
				}
			}
		}
	}

}).register({

	'status-item': function(e, c, g) {
		this._timeline.selectById(g('status-item'));
		return;
	},
	'username': function(e, c, g) {
		if (!e.shiftKey && !e.metaKey) pwns('?u=' + g('username'));
		else open_link('https://twitter.com/' + g('username'));
	},
	'search': function(e, c, g) {
		if (!e.shiftKey && !e.metaKey) pwns('?q=' + encodeURIComponent(g('search')));
		else open_link('https://search.twitter.com/search?q=' + encodeURIComponent(g('search')));
	},
	'status': function(e, c, g) {
		open_link('https://twitter.com/' + g('owner') + '/status/' + g('status'));
	},
	'reply-to': function(e, c, g) {
		var id = g('reply-to'), record = this._timeline.map[id].record;
		open_link('https://twitter.com/' + record.reply.user.username + '/status/' + record.reply.id);
	},
	'url': function(e, c, g) {
		var url = (e.shiftKey != (PREF('skipTCo') == '1') && c.hasAttribute('data-tw-url2') ? g('url2') : g('url'));
		if (!url.match(/^[a-z0-9]+:/)) url = 'http://' + url;
		UrlHandler.handle(url, e);
	},
	'geo': function(e, c, g) {
		var s = g('geo').split(',');
		showMap(s[0], s[1], false);
	}

});

// }

// --nextreply-- {

var getNextReplyText = function() {
	function normalize(x) {
		return x.toLowerCase();
	}
	function parseMentions(text) {
		var list = [];
		text.replace(/\B@([a-z0-9_A-Z]+)/g, function(all, screenName) {
			list.push('@' + screenName);
		});
		return list;
	}
	function parseInitialMentions(text) {
		var match = text.match(/^((?:@[a-zA-Z0-9_]+[ ]+)*(?:@[a-zA-Z0-9_]+))/);
		if (!match) return { list: [], length: 0 };
		return {
			list: match[0].split(/[ ]+/),
			length: match[0].length
		};
	}
	function tomap(list) {
		var map = {};
		for (var i = 0; i < list.length; i ++) {
			map[normalize(list[i])] = list[i];
		}
		return map;
	}
	function removeNorm(list, ntext) {
		for (var j = 0; j < list.length; j ++) {
			if (normalize(list[j]) == ntext) {
				list.splice(j, 1);
				break;
			}
		}
	}
	return function(myName, myText, yourName, yourText) {

		var replies = parseInitialMentions(myText);
		var replyList = replies.list;
		var replyMap = tomap(replyList);
		var remainder = myText.substr(replies.length);

		// first, make sure the user to reply is already included
		if (!replyMap[normalize('@' + yourName)]) {
			return '@' + yourName + ' ' + myText;
		}

		// move the user to front
		removeNorm(replyList, normalize('@' + yourName));
		replyList.unshift('@' + yourName);

		// then, gather a list of people to reply to
		var peopleToConsider = parseMentions(yourText);
		var peopleToIgnore = tomap(parseMentions(remainder));
		peopleToIgnore[normalize('@' + myName)] = '@' + myName;
		peopleToIgnore[normalize('@' + yourName)] = '@' + yourName;

		// create a final list of people that needs to be added
		var peopleToAdd = [];
		for (var i = 0; i < peopleToConsider.length; i ++) {
			if (peopleToIgnore[normalize(peopleToConsider[i])] == undefined) {
				peopleToAdd.push(peopleToConsider[i]);
				removeNorm(replyList, normalize(peopleToConsider[i]));
			}
		}

		// now, construct a new reply list
		var newReplyList = [replyList[0]];
		for (var i = 0; i < peopleToAdd.length; i ++) {
			newReplyList.push(peopleToAdd[i]);
		}
		for (var i = 1; i < replyList.length; i ++) {
			newReplyList.push(replyList[i]);
		}

		return newReplyList.join(' ') + remainder.replace(/^\s*/, function(all) {
			if (all == null || all == '') return ' '; return all;
		});

	};
}();

// }

// --tl-cmd--
// commands specific to a timeline {

defClass("TimelineCommands").prototype.implement({

	init: function(timeline) {
		this._timeline = timeline;
	},

	reload: function() { (this._timeline.feed || app._components.mainTimeline.feed).load(); },
	
	home: function() { this._timeline.selectItem(0); },
	end: function() { this._timeline.selectItem(this._timeline.items.length - 1); },

	findPreviousMention: function() { this._timeline.find('', -1); },
	findNextMention: function() { this._timeline.find('', 1);  },
	findPrevious: function() { this._timeline.find(app._components.tweetBox.getText(), -1); },
	findNext: function() { this._timeline.find(app._components.tweetBox.getText(), 1);  },

	pageUp: function() { this._timeline.movePage(-1); },
	pageDown: function() { this._timeline.movePage(1);  },

	fave: function() {
		var c = this._timeline.getCurrent();
		if (!c) return;
		c.record.toggleFave();
	},

	retweet: function() {
		var c = this._timeline.getCurrent();
		if (!c) return;
		if (c.record.protect && !c.record.retweet) notify ('Warning: Protected Tweet!');
		if (c.record.dm) notify ('Warning: You are retweeting a DM!');
		app._components.tweetBox.setText (c.record.getRetweetText());
		app._components.tweetBox.replyTo (c.record);
	},

	replyUncheck: function() {
		app._components.tweetBox.replyTo (null);
	},

	reply: function() {

		var c = this._timeline.getCurrent();
		if (!c) return;

		var record = c.record;

		var myText = app._components.tweetBox.getText();

		if (record.dm) {
			var prefix = 'd ' + record.user.username + ' ';
			if (myText.substr(0, prefix.length) != prefix) {
				app._components.tweetBox.setText(prefix + myText);
			}
			return;
		}

		var next = getNextReplyText(MY_DAMN_NAME, myText, record.user.username, record.text);
		var match = next.match(/^(@[a-zA-Z0-9_]+)[ ]+@/);
		if (next == myText && match) {
			var index = match[1].length;
			app._components.tweetBox.setText(next.substr(0, index) + ' ' + next.substr(index));
			app._components.tweetBox.setSelection(index + 1, index + 1);
		} else {
			app._components.tweetBox.setText(next);
		}
		app._components.tweetBox.replyTo(record);

	}

});

// }

// --tweetbox--
// represents the box where tweets are entered {

defClass("TweetReq").prototype.implement({

	replyTo: function(id) {
		this._reply = id;
	},
	retweet: function(id) {
		this._retweet = id;
	},
	setProgress: function(pg) {
		this._pg = pg;
	},
	setText: function(text) {
		this._text = text;
	},
	getText: function() { return this._text; },
	getReply: function() { return this._reply; },
	getRetweet: function() { return this._retweet; },
	oncomplete: function(response) {
	},
	onfail: function(reason) {
	},
	send: function() {
		var replyParam = '';
		if (this._reply != null) {
			replyParam = '&irp=' + this._reply;
		} else if (this._retweet != null) {
			replyParam = '&rtto=' + this._retweet;
		}
		var xh = new XH('POST', API_POST + '?time=' + (new Date().getTime()) + Capabilities.echoParam() + xtra_secure);
		xh.setProgress(this._pg);
		xh.oncomplete = this.proxy('oncomplete');
		xh.sendForm('value=' + encodeURIComponent(this._text) + app._components.geo.getParam() + replyParam + '&tk=' + THE_TOKEN);
	}

});

defClass("TweetProc").prototype.implement({

	handleRecord: function(record) {
		if (this._retweet && xtra_timeline === '') {
			app._components.mainTimeline.addRecord(record);
		}
	},

	onsuccess: function(data, record) {
	},

	sent: function(response) {
		try {
			var data = json_parse(response);
			if (data.redirect !== undefined) {
				this._pg.fail('Authentication Needed');
				location.replace(data.redirect);
				return;
			}
			if (data.id_str) {
				var record = Tweet.addTweet(data);

				// hackish coupling!
				app._components.tweetBox.setLatest(record);

				this.handleRecord(record);
				this.onsuccess(data, record);
				var eea = PREF('evenMoarAwesomeThings');
				this._pg.ok('<span style="color: #7f7" ' + (eea === '1' ? '' : 'onclick="this.innerHTML=\'' + data.user.statuses_count + '\'"') + '><b>Success.</b> Your tweet has been sent.</span>');
				if (eea === '1') {
					SplashNoti.show('<span style="font-size: 2.3em;font-weight:bold">' + data.user.statuses_count + '</span>');
				}
				if (PREF('refreshOnTweet') != '0' && !app._components.mainTimeline.feed.isStreaming()) {
					app._components.mainTimeline.feed.load();
				}
			} else {
				throw new Error('ah');
			}
		} catch (e) {
			if (response.indexOf('<h3>Guru Meditation:</h3>') > -1) {
				this.onfail('<b>Server down!</b> I\'m sorry. Please try again later.');
			} else if (response.indexOf('OVERCAPACITY!!!111') > -1 || response.indexOf('<h2>Twitter is over capacity.</h2>') > -1) {
				this.onfail('<span style="color: #f77"><b>Twitter is Over Capacity.</b> It\'ll be back shortly I hope.</span>');
			} else {
				this.onfail('<b>There is an error</b> because of some reason.');
			}
			this.sendHint();
			throw e;
		}
	},

	onfail: function(reason) {
		this._pg.fail ('<span style="color: #f77">' + reason + '</span>');
	},

	sendHint: function() {
		if (!this._hintSent) {
			this._hintSent = true;
			notify('Hint: Use Ctrl+Z to recover your tweet.');
		}
	},

	send: function(v, replying) {
		var progressText = 'Sending Tweet...';
		this._req = new TweetReq();
		if (replying) {
			if (v === replying.getRetweetText() && !replying.dm && (!replying.protect || replying.retweet)) {
				var id = ((replying.protect && replying.retweet) ? replying.retweet.id : replying.id);
				progressText = 'Retweeting ' + replying.user.username + '...';
				this._retweet = id;
				this._req.retweet(id);
			} else if (replying.check()) {
				progressText = 'Replying ' + replying.user.username + '...';
				this._reply = replying.id;
				this._req.replyTo(this._reply);
			}
			replying.uncheck();
		}
		this._text = v;
		this._pg = new Progress(progressText);
		this._req.setText(this._text);
		this._req.setProgress(this._pg);
		this._req.oncomplete = this.proxy('sent');
		this._req.onfail = this.proxy('onfail');
		this._req.send();
	}

});

defClass("TweetBox").prototype.implement({

	init: function() {
		
		this._element = el.tweetData;
		this._hintSent = false;
		this._latest = null;

		this._element.onkeydown  = this.proxy('delayedCheckTyping');
		this._element.onkeypress = this.proxy('delayedCheckTypingPress');
		this._element.onkeyup    = this.proxy('delayedCheckTyping');

		this.keyHandler = new TweetBoxKeyHandler(this);
		this.checkLength();

	},

	delayedCheckTyping: function() {
		clearTimeout(this._checkTimer);
		this._checkTimer = setTimeout(this.proxy('checkTyping'), 0);
	},

	delayedCheckTypingPress: function(e) {
		this.delayedCheckTyping();
		setTimeout(function() {
			this.checkCharacter(e);
		}.b(this), 0);
	},

	focus: function() { this._element.focus(); },
	blur: function() { this._element.blur(); },

	getText: function() { return this._element.value; },
	
	setText: function(x) {
		this._element.value = x;
		this.checkLength();
	},

	isEmpty: function() { return this._element.value.length == 0; },
	hasSelectedText: function() { return this._element.selectionStart != this._element.selectionEnd; },
	getTextBeforeSelection: function() { return this._element.value.substr(0, this._element.selectionStart); },
	getTextAfterSelection: function() { return this._element.value.substr(this._element.selectionEnd); },

	setSelection: function(start, end) {
		this._element.selectionStart = start;
		this._element.selectionEnd = end;
	},

	replaceTextBeforeSelection: function(count, replaceWith) {
		var oldStart = this._element.selectionStart, oldEnd = this._element.selectionEnd,
			newStart = Math.max(0, oldStart - count) + replaceWith.length,
			newEnd = oldEnd - oldStart + newStart,
			oldValue = this._element.value;
		this._element.value = oldValue.substr(0, Math.max(0, oldStart - count)) + replaceWith + oldValue.substr(oldStart);
		this._element.selectionStart = newStart;
		this._element.selectionEnd = newEnd;
	},

	insertAtCursor: function(x, addWhitespace) {
		var oS = this._element.selectionStart;
		var oE = this._element.selectionEnd;
		var b  = this._element.value.substr(0, oS);
		var e  = this._element.value.substr(oE);
		var cSel = this._element.value.substr(oS, oE - oS);
		if (addWhitespace && b.match(/\S$/)) x = ' ' + x;
		if (addWhitespace && e.match(/^\S/)) x = x + ' ';
		this._element.value = b + x + e;
		this._element.selectionStart = this._element.selectionEnd = oE - cSel.length + x.length;
		this.checkLength();
	},

	replyTo: function(record) {
		if (this._replying) {
			this._replying.uncheck();
		}
		this._replying = record;
		if (this._replying) {
			this._replying.check();
		}
	},

	setLatest: function(record) {
		this._latest = record;
	},

	isReplying: function() { return !!this._replying && this._replying.check(); },
	isRetweeting: function() { return this._replying && this.getText() == this._replying.getRetweetText(); },

	getNormalizedLength: function(text) {
		var deduct = 0;
		text = text.replace(TWITTER_REGEX.url, function(a, b, c, d, e) {
			deduct += e == 'https://' ? TWITTER_CONFIG.short_url_length_https : TWITTER_CONFIG.short_url_length;
			return c;
		});
		return text.length + deduct;
	},

	checkLength: function() {
		var length = this.getNormalizedLength(this._element.value);
		app._components.tweetState.setSwitch('empty',      length === 0);
		app._components.tweetState.setSwitch('full',       length >= 140, true);
		app._components.buttonsBar.setOffset(this._element.scrollWidth - this._element.offsetWidth);
		el.status.chars.innerHTML = app._components.zzzKeyHandler.shouldHintUser() ? 140 : (140 - length);
		if (this._replying) this._replying.check();
	},

	checkTyping: function() {
		this.checkLength();
	},

	checkCharacter: function() {
	},

	send: function() {
		this._latestInfo = {
			text: this.getText(),
			replying: this._replying
		};
		new TweetProc().send(this.getText(), this._replying);
		this._replying = null;
		this.setText('');
	},

	undo: function() {
		if (this._latest != null && this._latestInfo != null) {
			if (confirm('Delete your latest tweet?\n\n" ' + this._latest.text + ' "')) {
				new DeleteProc(this._latest).send();
			}
		} else {
			notify('Cannot undo tweet!');
		}
	},
	removeDone: function() {
		if (this._latest != null && this._latestInfo != null) {
			this._replying = this._latestInfo.replying;
			this.setText(this._latestInfo.text);
			this._latest = null;
			this._latestInfo = null;
		}
	}

});

defClass("DeleteProc").prototype.implement({

	init: function(id) {
		this._record = id;
	},
	oncomplete: function() {
		this._record.remove();
		app._components.tweetBox.removeDone();
	},
	send: function() {
		var xh = new XH('POST', app._components.config.api.rmtweet + '?time=' + (new Date().getTime()) + Capabilities.echoParam() + xtra_secure);
		var complete = this.proxy('oncomplete');
		var pg = new Progress('Removing tweet...');
		xh.setProgress(this._pg);
		xh.oncomplete = function() {
			pg.ok('Removed!');
			complete();
		};
		xh.sendForm('id=' + encodeURIComponent(this._record.id) + '&tk=' + THE_TOKEN);
	}

});

// }

// --holdscroller--
// handles timeline scrolling when the arrow keys are held {

defClass("HoldScroller").prototype.implement({

	init: function(timeline) {
		this._timeline = timeline;
		this._scrolling = false;
		this._started = false;
		this._timer = 0;
		this._direction = 0;
		this._lastTime = 0;
	},

	getScrollDelta: function() {
		var now = new Date().getTime();
		var delta = Math.max(1, Math.ceil((now - this._lastTime) * 0.35));
		this._lastTime = now;
		return delta;
	},

	holdScroll: function() {
		var position  = this._timeline.getScrollPos(),
			delta     = this.getScrollDelta(),
			direction = this._direction,
			next      = direction > 0 ? position + delta : position - delta;
		this._timeline.setScrollPos (next);
		this.next();
		clearTimeout(this._timer);
		this._timer = setTimeout(this.holdScroll.b(this), 20);
	},

	next: function() {
		var direction = this._direction,
			visible   = this._timeline.getVisibleArea(),
			nextItem  = this._timeline.items[this._timeline.getCurrent().index + (direction > 0 ? 1 : -1)],
			move      = false;
		if (nextItem) {
			var t = nextItem.getPosition(),
				b = t + nextItem.getHeight();
			move = direction > 0 ? b < visible.bottom : t > visible.top;
			if (move) this._timeline.selectItem(nextItem.index, true);
		}
		return move;
	},

	scroll: function() {
		clearTimeout(this._timer);
		if (!this.next()) {
			this._lastTime = new Date().getTime();
			this._scrolling = true;
			this._timer = setTimeout(this.holdScroll.b(this), 20);
		} else {
			this._timer = setTimeout(this.scroll.b(this), 100);
		}
	},

	startHoldScroll: function(direction) {
		if (!this._started || direction != this._direction) {
			this._direction = direction;
			this._started = true;
			this._timeline.moveItem(direction);
			clearTimeout(this._timer);
			this._timer = setTimeout(this.scroll.b(this), 300);
		}
	},

	stopHoldScroll: function(direction) {
		this._started = false;
		this._scrolling = false;
		clearTimeout(this._timer);
	},

	isScrolling: function() { return this._scrolling; }

});

// }

// --autoscroller--
// handles scrolling when new items are loaded

defClass("AutoScroller").prototype.implement({

	init: function(timeline) {
		this._timeline = timeline;
		this._timer = 0;
		this.attachTimer();
	},

	styles: {},
	register: implementable('styles'),
	
	attachTimer: function() {
		var that = this;
		this._timeline.implement({
			select: function() {
				that.stopTimer();
				return arguments.callee._super.apply(this, arguments);
			},
			endChangeset: function() {
				var retval = arguments.callee._super.apply(this, arguments);
				that.autoScroll();
				return retval;
			}
		});
	},

	autoScroll: function() {
		var style = PREF('autoScrollOnRefresh');
		this.stopTimer();
		if (style in this.styles) {
			this.styles[style].call(this);
		} else if (style != '0') {
			this.defaultStyle();
		}
	},

	defaultStyle: function() {
		this._timer = setTimeout(function() {
			this._timeline.selectItem(this._timeline.items.length - 1);
		}.b(this), 1000);
	},

	stopTimer: function() {
		clearTimeout(this._timer);
	}

}).register({

	smarter: function() {
		this._timer = setTimeout(function() {
			if (app._components.tweetBox.getText() != '')
				return;
			if (!this._timeline.items.length)
				return;
			var timeline = this._timeline,
				last = timeline.getCurrent().index;
			for (var i = last + 1; i < timeline.items.length; last = i++) {
				if (timeline.items[i].record.mention) {
					break;
				}
			}
			timeline.selectItem(last);
		}.b(this), 2000);
	}

});


// }



// --base-keys--
// base key handler class {

defClass("KeyHandler").prototype.implement({
	
	_bindings: {},

	register: implementable('_bindings'),

	keyDown: function(kc, e) {
		if (e.ctrlKey && this._bindings) {
			if (e.altKey && typeof this._bindings['A' + kc] === 'function') {
				this._bindings['A' + kc].call(this);
				return false;
			}
			if (typeof this._bindings[kc] === 'function') {
				this._bindings[kc].call(this);
				return false;
			}
		}
	}

});

// }

// --zzz--
// &$*#(&%*(&%*($()*()*@()#*()$*&%^^&^&^&^&^&&^#@^#%@^@#^&@#^&@#^&%#*(#()()+++++ {

defClass("ZzzKeyHandler", KeyHandler).prototype.implement({

	_keyCodes: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65, 13],
	
	init: function() {
		this._howFar = 0;
		this._mode = 0;
		this._mode2 = undefined;
	},

	isReady: function() { return this._howFar >= this._keyCodes.length; },
	shouldHintUser: function() { return this._howFar === this._keyCodes.length - 1; },

	keyDown: function(kc, e) {
		if (kc == this._keyCodes[this._howFar]) {
			this._howFar ++;
		} else {
			this._howFar = 0;
		}
		if (this.isReady()) {
			var classNames = ['', 'kinamo'];
			this._mode ++;
			document.body.className = 'body ' + classNames[this._mode % classNames.length];
			if (classNames[this._mode % classNames.length] === '') {
				if (this._mode2 === undefined) {
					this._mode2 = parseInt(PREF('evenMoarAwesomeThings'), 10);
				}
				this._mode2 = (this._mode2 + 1) % 2;
				PREF('evenMoarAwesomeThings=' + this._mode2);
				SplashNoti.show ('\'w\' /');
			}
			app._components.tweetBox.setText('');
			return false;
		}
		return arguments.callee._super.call(this, kc, e);
	}

}).register({

	'77':  function() { notify.vhsifnweihdunsdfux(); },
	'188': function() { Progress.vhsifnweihdunsdfux(); }

});

// }

// --tb-keys--
// key handlers for the tweet box {

defClass("TweetBoxKeyHandler", KeyHandler).prototype.implement({

	init: function(tweetBox) {
		this._tweetBox = tweetBox;
	},

	keyDown: function(kc, e) {

		// 17=ctrl 224=command
		if (kc != 17 && kc != 224 && !e.ctrlKey && !e.metaKey) {
			this._tweetBox.focus();
		}

		// paste / undo
		if ((e.ctrlKey || e.metaKey) && (kc == 86 || kc == 90)) {
			this._tweetBox.focus();
		}

		// send tweet
		if (kc == 13) {
			if (this._tweetBox.getText() != '') {
				this._tweetBox.send ();
				return false;
			}
		}
	
	}

});

// }

// --tl-keys--
// key handlers specific to the timeline
defClass("TimelineKeyHandler", KeyHandler).prototype.implement({

	init: function(timeline) {
		this._timeline = timeline;
	},

	openLink: function(e) {
		var c = this._timeline.getCurrent();
		if (!c) return false;
		var el = c.getElement().querySelector('.status-text span[data-tw-url]');
		if (el) {
			var url = PREF('skipTCo') == '1' && el.hasAttribute('data-tw-url2') ? el.getAttribute('data-tw-url2') : el.getAttribute('data-tw-url');
			UrlHandler.handle(unescape(url), e);
			return true;
		}
		return false;
	},

	enterDefault: function(kc, e) {
		notify('Nothing to send.');
	},

	enter: function(kc, e) {
		if (!this.openLink(e)) {
			return this.enterDefault();
		}
	},

	keyDown: function(kc, e) {

		// enter (this will be called after tweetbox handler)
		if (kc == 13) {
			this.enter(kc, e);
			return false;
		}

		// move up/down
		var isEmpty = app._components.tweetBox.isEmpty();
		if (isEmpty || e.ctrlKey) {
			if (kc == 38) {
				if (e.shiftKey) {
					this._timeline.cmd.findPreviousMention();
				} else {
					this._timeline.holdScroller.startHoldScroll(-1);
				}
				return false;
			}
			if (kc == 40) {
				if (e.shiftKey) {
					this._timeline.cmd.findNextMention();
				} else {
					this._timeline.holdScroller.startHoldScroll(1);
				}
				return false;
			}
		}

		// from now on, leave the shift key alone!
		if (e.shiftKey) {
			return true;
		}

		// home and end
		if (isEmpty) {
			if (kc == 35 && !e.ctrlKey) {
				this._timeline.cmd.end();
				return false;
			}
			if (kc == 36 && !e.ctrlKey) {
				this._timeline.cmd.home();
				return false;
			}
		}

		// page up / page down
		if (kc == 33) {
			this._timeline.cmd.pageUp();
			return false;
		}
		if (kc == 34) {
			this._timeline.cmd.pageDown();
			return false;
		}
		
		return arguments.callee._super.call(this, kc, e);

	},

	keyUp: function(kc, e) {
		if (kc == 38 || kc == 40) {
			this._timeline.holdScroller.stopHoldScroll();
			return false;
		}
	}

}).register({

	'82': function()  { this._timeline.cmd.reload (); },      // R
	'69': function()  { this._timeline.cmd.fave(); },         // E
	'84': function()  { this._timeline.cmd.retweet(); },      // T
	'89': function()  { this._timeline.cmd.reply(); },        // Y
	'A89': function() { this._timeline.cmd.replyUncheck(); }, // Alt+Y
	'70': function()  { this._timeline.cmd.findPrevious(); }, // F
	'71': function()  { this._timeline.cmd.findNext(); }      // G

});

// }

// --gb-cmd--
// global commands {

defClass("GlobalCommands").prototype.implement({

	uploadImage: function() {
		notify('To upload an image, drag them into thaiWitter.');
	},
	shortenURLs: function() {
		new UrlShortener().shortenTweetBox();
	},

	editHighlightKeywords: function() {
		var keywords = prompt('Highlighted keywords (separated by space):', app._components.highlighter.keywords);
		if (keywords === null) return;
		app._components.highlighter.setKeywords(keywords);
	},

	editFilterKeywords: function() {
		var keywords = prompt('Excluded keywords (separated by space):\n\nTip: source:xxxxxx matchs tweets from source xxxxxx.\nfrom:xxxxxx matchs tweets from @xxxxxx.', app._components.filter.keywords);
		if (keywords === null) return;
		app._components.filter.setKeywords(keywords);
	},

	newMentionsWindow: function() { pwns('?mode=mentions'); },
	newHomeTimelineWindow: function() { pwns('?mode=home'); },
	newDMsWindow: function() { pwns('?mode=dms'); },
	newFavesWindow: function() { pwns('?mode=faves'); },

	newSearchWindow: function() {
		var q = prompt('Search query?');
		if (q !== null && q !== '') {
			pwns ('?q=' + encodeURIComponent(q));
		}
	},

	newUserWindow: function() {
		var q = prompt('Please enter username or username/listname');
		if (q !== null && q !== '') {
			pwns ('?u=' + encodeURIComponent(q));
		}
	},

	logout: function() {
		new ReloginProc(false);
	},
	undoTweet: function() {
		app._components.tweetBox.undo();
	}

});

// }

// --gb-keys--
// global key handlers {

defClass("GlobalKeyHandler", KeyHandler).prototype.register({

	'A72': function() { app._components.commands.editHighlightKeywords(); }, // Alt+H
	'A90': function() { setTimeout(app._components.commands.proxy('undoTweet'), 1); }, // Alt+Z
	'73':  function() { app._components.commands.uploadImage (); }, // I

	'72':  function() { setTimeout(app._components.commands.proxy('newSearchWindow'), 1); }, // H
	'85':  function() { setTimeout(app._components.commands.proxy('newUserWindow'), 1); },   // U
	'79':  function() { app._components.commands.newHomeTimelineWindow(); },         // O
	'78':  function() { app._components.commands.newMentionsWindow(); },             // N
	'190': function() { app._components.commands.newDMsWindow(); }                   // .

});

// }

// --handler--
// main event handlers {

function cancelEvent(e) {
	e.stopPropagation ();
	e.preventDefault ();
}

defClass("EventHandler").prototype.implement({

	// handler setups
	init: function() {
		window.addEventListener ('DOMMouseScroll', this.proxy('globalWheel'), false);
		window.addEventListener ('mousewheel',     this.proxy('globalWheelWebkit'), false);
		window.addEventListener ('resize',         this.proxy('globalResize'), false);
		this.setupMenu();
		this.setupWheel();
		this.resizeHandlers = [];
		this._resizing = false;
		this._resizingDisabled = false;
	},

	getResizingDisabled: function() { return this._resizingDisabled; },
	setResizingDisabled: function(t) {
		this._resizingDisabled = t;
	},

	setKeyHandlers: function(keyHandlers) {
		if (!this._keyHandlers) {
			window.addEventListener ('keydown',        this.proxy('globalKeyDown'), false);
			window.addEventListener ('keyup',          this.proxy('globalKeyUp'), false);
		}
		this._keyHandlers = keyHandlers;
	},

	setupMenu: function() {
		$('menu-refresh').onclick    = function() { app._components.timeline.cmd.reload (); };
		$('menu-fave').onclick       = function() { app._components.timeline.cmd.fave (); };
		$('menu-retweet').onclick    = function() { app._components.timeline.cmd.retweet (); };
		$('menu-reply').onclick      = function() { app._components.timeline.cmd.reply (); };
		$('menu-hlwords').onclick    = function() { app._components.commands.editHighlightKeywords (); };
		$('menu-ftwords').onclick    = function() { app._components.commands.editFilterKeywords (); };
		$('menu-additional').onclick = function() { optsNew.toggle (); };
		$('menu-logout').onclick     = function() { app._components.commands.logout (); };
		$('menu-image').onclick      = function() { app._components.commands.uploadImage (); };

		// new window buttons
		$('new-mentions').onclick = function() { app._components.commands.newMentionsWindow(); };
		$('new-home').onclick     = function() { app._components.commands.newHomeTimelineWindow(); };
		$('new-dms').onclick      = function() { app._components.commands.newDMsWindow(); };
		$('new-fav').onclick      = function() { app._components.commands.newFavesWindow(); };
		$('new-search').onclick   = function() { app._components.commands.newSearchWindow(); };
		$('new-userlist').onclick = function() { app._components.commands.newUserWindow(); };
	},

	setupWheel: function() {
		this._cumulativeDelta = 20;
	},

	globalWheel: function(e) {
		var delta = e.detail;
		app._components.timeline.moveScroll(delta > 0 ? 1 : -1);
	},

	globalWheelWebkit: function(e) {
		this._cumulativeDelta += 'wheelDeltaY' in e ? e.wheelDeltaY : e.wheelDelta;
		if (this._cumulativeDelta >= 40) {
			while (this._cumulativeDelta >= 40) this._cumulativeDelta -= 40;
			app._components.timeline.moveScroll(-1);
		} else if (this._cumulativeDelta < 0) {
			while (this._cumulativeDelta < 0) this._cumulativeDelta += 40;
			app._components.timeline.moveScroll(1);
		}
	},

	// if false is returned, cancel event and that's it
	// if true is returned, run default behaviour and that's it
	// else, check the next handler
	decide: function(e, r) {
		if (r === false) {
			cancelEvent(e);
		}
		return r === false || r === true;
	},

	processKeyHandlerQueue: function(eventType, kc, e) {
		var l = this._keyHandlers.length, c;
		for (var i = 0; i < l; i ++) {
			c = this._keyHandlers[i];
			if (typeof c == 'function') c = c();
			if (c[eventType]) {
				if (this.decide(e, c[eventType](kc, e))) return;
			}
		}
	},
	globalKeyDown: function(e) { return this.processKeyHandlerQueue('keyDown', e.keyCode, e); },
	globalKeyUp: function(e) { return this.processKeyHandlerQueue('keyUp',   e.keyCode, e); },

	globalResize: function() {
		if (this._resizing) return;
		if (this._resizingDisabled) return;
		this._resizing = true;
		el.display.style.paddingTop = Math.max(50, window.innerHeight / 1.5) + 'px';
		el.display.style.paddingBottom = Math.max(50, window.innerHeight / 1.5) + 'px';
		for (var i = 0; i < this.resizeHandlers.length; i ++) {
			this.resizeHandlers[i]();
		}
		setTimeout(function() { this._resizing = false; }.b(this), 1); // nasty safari bug
	},
	globalResizeDelayed: function() {
		setTimeout(this.proxy('globalResize'), 1);
	}

});

// }



// --highlighter--
// {

defClass("StatusHighlighter").prototype.implement({

	init: function() {
		this.setKeywords(PREF('hlKeywords'));
	},

	setKeywords: function(keywords) {
		this.check = this.compile(keywords);
		this.keywords = keywords;
		PREF('hlKeywords=' + this.keywords);
		var all = Tweet.getAllTweets();
		for (var i = 0; i < all.length; i ++) all[i].reHighlight();
	},

	compile: function(keywords) {
		var n = ('' + keywords).match(/\S+/g);
		if (!n) return function() { return false; };
		var list = [];
		for (var i = 0; i < n.length; i ++) {
			var c = n[i].toLowerCase();
			list.push (c);
		}
		return function(text) {
			text = ' ' + text.replace(/\s+/g, ' ').toLowerCase() + ' ';
			for (i = 0; i < list.length; i ++) {
				if (text.indexOf(list[i]) != -1) return 1;
			}
			return 0;
		};
	}

});

// }

// --filter--
// {

defClass("StatusFilter").prototype.implement({

	init: function() {
		this.setKeywords(PREF('ftKeywords'));
	},

	setKeywords: function(keywords) {
		this.check = this.compile(keywords);
		this.keywords = keywords;
		PREF('ftKeywords=' + this.keywords);
		app._components.mainTimeline.reFilter();
	},

	compile: function(keywords) {
		var n = ('' + keywords).match(/\S+/g);
		if (!n) return function() { return false; };
		var list = [];
		for (var i = 0; i < n.length; i ++) {
			list.push (this.compileSubfunction(n[i]));
		}
		return function(text, record) {
			if (!record.loaded) return false;
			if (record.mention) return false;
			for (var i = 0; i < list.length; i ++) {
				if (list[i](text, record)) return true;
			}
			return false;
		};
	},

	compileSubfunction: function(keyword) {
		var match;
		var negate = false;
		var property = 'text';
		keyword = keyword.toLowerCase();
		if ((match = keyword.match(/^(-?)(([a-z0-9_]+):)?([\s\S]+)$/))) {
			negate = match[1] === '-';
			property = match[3] ? match[3] : 'text';
			keyword = match[4];
		}
		return function(text, record) {
			var match = ((record.getProperty(property)).toLowerCase().indexOf(keyword) > -1);
			return match ? !negate : negate;
		};
	}

});

// }



// --options--
// {

// options popup show/hide
var optsNew = {
	el: document.getElementById('options'),
	ef: document.getElementById('options-floater'),
	mn: document.getElementById('menu-additional'),
	mode: 0,
	position: 0,
	animation: null,
	animate: function(target) {
		if (optsNew.animation) {
			optsNew.animation();
			delete optsNew.animation;
		}
		optsNew.animation = dtjs2.a.c(optsNew.position, target, 0.3, optsNew.frame, function(v) {
			return 1 - Math.pow(1 - v, 4);
		});
	},
	show: function() {
		if (optsNew.mode === 0) {
			optsNew.animate(1);
			optsNew.el.style.top = (el.head.offsetTop + el.head.offsetHeight - 1) + 'px';
			optsNew.mn.className = 'menu-item menu-item-open';
			optsNew.mode = 1;
		}
	},
	frame: function(v) {
		optsNew.position = v;
		if (v === 0) {
			optsNew.el.style.visibility = 'hidden';
		} else {
			optsNew.el.style.visibility = 'visible';
		}
		optsNew.ef.style.top = (-optsNew.ef.offsetHeight * (1 - v)) + 'px';
	},
	hide: function() {
		if (optsNew.mode == 1) {
			optsNew.animate(0);
			optsNew.mn.className = 'menu-item';
			optsNew.mode = 0;
		}
	},
	toggle: function() {
		optsNew[optsNew.mode ? 'hide' : 'show']();
	}
};

// options tabs manager
defClass("TabsToggler").prototype.implement({

	list: ['option', 'helpme', 'about', 'spwn', 'moar', 'fb'],

	bindings: {},
	register: implementable('bindings'),
	
	_selected: undefined,

	setup: function(id) {
		var that = this;
		$('tb' + id).onclick = function() {
			that.go(id);
		};
		this.hide(id);
	},

	hide: function(id) {
		$('tb' + id).className = 'tabls-item';
		$('td' + id).style.display = 'none';
	},

	show: function(id) {
		$('tb' + id).className = 'tabls-item tabls-item-active';
		$('td' + id).style.display = 'block';
	},

	setupComponent: function() {
		for (var i = 0; i < this.list.length; i ++) {
			this.setup(this.list[i]);
		}
		this.go(this.list[0]);
	},

	go: function(id) {
		if (this._selected !== undefined) this.hide(this._selected);
		this.show(this._selected = id);
		if (this.bindings && this.bindings[id])
			this.bindings[id]();
	}

});

// }

// --user-info--
// displays user info {

defClass("ConnectionChangeProc").prototype.implement({
	init: function(user, method) {
		this._user = user;
		this._method = method;
	},
	setProgress: function(pg) {
		this._pg = pg;
	},
	fire: function() {
		this._xh = new XH('POST', app._components.config.api.connections + '?time=' + (new Date().getTime()) + xtra_secure);
		if (this._pg) this._xh.setProgress(this._pg);
		this._xh.oncomplete = this.proxy('loaded');
		this._xh.sendForm('tk=' + THE_TOKEN + '&u=' + encodeURIComponent(this._user) + '&mode=' + encodeURIComponent(this._method));
	},
	onload: function(success) {
	},
	loaded: function(response) {
		try {
			var data = json_parse(response);
			if (data.following != null) {
				this._pg.ok(this._method == 'destroy' ? 'Unfollowed' : 'Followed');
				this.onload(data);
			} else {
				throw new Error('not in format i want!');
			}
		} catch (e) {
			this._pg.fail('Failed.');
			this.onload(false);
		}
	}
});

defClass("UserInfoView").prototype.implement({
	init: function() {
		this._element = $('user-about');
		this._wrapper = $('user-about-padder');
		this._content = $('user-about-text');
	},
	hide: function() {
		this._element.style.display = 'none';
	},
	show: function(user) {
		this._user = user;
		this.loadUserInfo();
	},
	loadUserInfo: function() {
		var xh = new XH('GET', app._components.config.api.user + '?time=' + (new Date().getTime()) + '&u=' + encodeURIComponent(this._user));
		xh.oncomplete = this.proxy('oncomplete');
		xh.send();
	},
	oncomplete: function(response) {
		var data = json_parse(response);
		this.handleUserInfo(data);
	},
	handleUserInfo: function(data) {
		var html = '<span class="user-realname"></span>';
		var link = 'https://twitter.com/';
		var ftext = 'view full profile';
		var title = 'user information';
		var stats = '';
		var s = function(a, S, P) { return a + ' ' + (a == 1 ? S : P); }
		if (data.screen_name !== undefined) {
			link += data.screen_name;
			stats = ' (' + s(data.statuses_count, 'tweet', 'tweets') + ', ' + s(data.friends_count, 'following', 'following') + ', ' + s(data.followers_count, 'follower', 'followers') + ')';
		} else {
			link += ('' + data.uri).substr(1);
			ftext = 'view list on twitter';
			title = 'list information';
			stats = ' (' + s(data.member_count, 'member', 'members') + ', ' + s(data.subscriber_count, 'follower', 'followers') + ')';
		}
		var justRender = false;
		if (!this._rendered) {
			this._rendered = true;
			justRender = true;
			this._nameElement = C('user-realname', 'span');
			this._nameElement.onclick = this.proxy('nameClicked');
			this._statsElement = C('user-stats');
			this._bioElement = C('user-bio');
			this._showProfileButton = C('menu-item', 'span');
			this._showProfileButton.onclick = this.proxy('showProfile');
			this._followButton = C('menu-item', 'span');
			this._followButton.onclick = this.proxy('toggleFollow');
			this._content.appendChild(this._nameElement);
			this._content.appendChild(this._statsElement);
			this._content.appendChild(this._bioElement);
			this._content.appendChild(this._showProfileButton);
			this._content.appendChild(this._followButton);
		}
		this._data = data;
		$('user-about-title').textContent = title;
		this._nameElement.textContent = data.name;
		this._statsElement.textContent = stats;
		this._bioElement.style.display = data.description == '' ? 'none' : 'block';
		this._bioElement.textContent = data.description;
		this._showProfileLink = link;
		this._showProfileButton.textContent = ftext;
		this._followButton.textContent = data.following ? 'unfollow' : 'follow';
		this._followButton.className = 'menu-item ' + (data.following ? 'unfollow-button' : 'follow-button');
		if (justRender) this.slideIn();
	},
	nameClicked: function() {
	},
	showProfile: function() {
		open_link(this._showProfileLink);
	},
	toggleFollow: function() {
		var proc = new ConnectionChangeProc(this._user, this._data.following ? 'destroy' : 'create');
		var pg = new Progress(this._data.following ? 'Unfollowing...' : 'Following...');
		proc.setProgress(pg);
		proc.fire();
		proc.onload = function(data) {
			if (data) {
				this.handleUserInfo(data);
			}
		}.b(this);
	},
	slideIn: function() {
		var container = this._element, content = this._wrapper;
		dtjs2.a.c(1, 0, 0.8, function(v, f) {
			container.style.height = 'auto';
			content.style.marginTop = (-content.offsetHeight * v) + 'px';
		}, dtjs2.ease.o);
	}
});

// }

// --toggles--
// information toggles {

defClass("InfoToggler").implement({

	keys: ['ifirp', 'ifclient'],

	createHandler: function(key) {
		return function(id, value) {
			if (value == '0') {
				app._components.infoToggler.off(key);
			} else {
				app._components.infoToggler.on(key);
			}
		};
	}

}).prototype.implement({
	
	init: function() {
		this.update();
	},

	on: function(key) {
		PREF(key + '=1');
		this.update();
	},

	off: function(key) {
		PREF(key + '=0');
		this.update();
	},

	update: function() {
		var classes = ['tweet-display'];
		for (var i = 0; i < this.constructor.keys.length; i ++) {
			var key = this.constructor.keys[i];
			classes.push(PREF(key) != '0' ? key + 'on' : key + 'off');
		}
		el.display.className = classes.join(' ');
	}

});

// }



// --selectliek--
// thaiWitter styled select boxes {
function selectLiek(choices, renderTo) {

	// Elements
	function C(cl) {
		return 'selectliek-' + cl.split(' ').join(' selectliek-');
	}
	function D(cl) {
		var e = document.createElement('div');
		e.className = C(cl);
		return e;
	}

	function findt(obj) {
		var x = 0;
		for (; obj; obj = obj.offsetParent) {
			x += obj.offsetTop;
		}
		return x;
	}

	// Animation
	var mode = 0;
	var animValues = [0, 0, 0, 0];
	var animInterval = 0;
	var curChoice = 0;
	var animFire = false;
	function animate(target) {
		var old = animValues.slice();
		var count = 0;
		var total = 25;
		function frame() {
			count ++;
			var v = count / total;
			if (v >= 1) {
				v = 1; clearInterval(animInterval);
				if (mode === 0) renderTo.className = C('container closed');
				if (animFire !== false) {
					setTimeout (function() {
						animFire ();
						animFire = false;
					}, 200);
				}
			}
			var vv = 1 - Math.pow(1 - v, 2);
			for (var i = 0; i < target.length; i ++) {
				if (!old[i]) old[i] = 0;
				animValues[i] = old[i] + (target[i] - old[i]) * vv;
			}
			onAnimation (animValues);
		}
		clearInterval(animInterval);
		animInterval = setInterval(frame, 10);
	}
	function onAnimation(v) {
		var style = {};
		style.width = Math.round(Math.max(0, v[0])) + 'px';
		style.height = Math.round(Math.max(0, v[1])) + 'px';
		style.top = Math.round(v[3]) + 'px';
		style.marginBottom = (26 - Math.round(Math.max(0, v[1]))) + 'px';
		var ns = '';
		for (var i in style) {
			ns += i.replace(/[A-Z]/g, function(a) { return '-' + a.toLowerCase(); }) + ':' + style[i] + ';';
		}
		renderTo.setAttribute ('style', ns);
		inside.style.position = 'relative';
		inside.style.top = -Math.round(Math.max(0, v[2])) + 'px';
	}

	// Generation
	var r = {};
	var ch = [];
	renderTo.className = C('container');
	var inside = D('inside');
	renderTo.appendChild (inside);
	renderTo.onclick = function(e) {
		if (mode === 0) {
			var tp = -ch[curChoice].el.offsetTop;
			var act = findt(renderTo) + tp;
			var nx = Math.max(el.head.offsetHeight + 3, act);
			tp -= act - nx;
			animate ([ renderTo.scrollWidth, renderTo.scrollHeight, 0, tp ]);
			renderTo.className = C('container open');
			mode = 1;
			try {
				e.stopPropagation ();
				e.preventDefault ();
			} catch (err) {}
		}
	};
	function genChoice(value, text) {
		var ob = {};
		ob.value = value;
		ob.text = text;
		var el = D('choice');
		var tx = D('text');
		tx.innerHTML = text;
		el.appendChild (tx);
		ob.el = el;
		ob.tx = tx;
		ch.push (ob);
		var id = ch.length - 1;
		el.onclick = function(e) {
			if (mode == 1) {
				var last = curChoice;
				r.selectChoice (id);
				if (last != id)
					animFire = (function() {
						if (r.onchange) r.onchange (id, value, last);
					});
				try {
					e.stopPropagation ();
					e.preventDefault ();
				} catch (err) {}
			}
		};
		inside.appendChild (el);
	}
	for (var i in choices) {
		genChoice (i, choices[i]);
	}
	animValues = [ renderTo.offsetWidth, renderTo.offsetHeight, 0 ];
	r.selectChoice = function(i) {
		var target = [ ch[i].tx.offsetWidth, ch[i].el.offsetHeight, ch[i].el.offsetTop, 0 ];
		curChoice = i;
		renderTo.className = C('container open');
		for (var idx = 0; idx < ch.length; idx ++) {
			ch[idx].el.className = C(idx == i ? 'choice choice-select' : 'choice');
		}
		mode = 0;
		animate (target);
	};
	r.selectChoiceByValue = function(value) {
		for (var idx = 0; idx < ch.length; idx ++) {
			if (ch[idx].value == value) return r.selectChoice (idx);
		}
	};
	r.selectChoice (0);
	r.choices = ch;
	return r;

}

// }

// --splashnoti--
// splashy notifications {

var SplashNoti = function() {
	var el = document.getElementById('spnt-text');
	var inr = document.getElementById('spnt-inner');
	var tmr = 0;
	var max = 10;
	var cur = max;
	var queue = [];
	var running = 0;
			var match = navigator.userAgent.match(/rv:([\d]+)\.([\d]+)\.([\d]+)/), cool = match && (match[1] > 1 || (match[1] == 1 && match[2] == 9 && match[3] >= 1));
	function gts(i) {
		var a = (1 - i) * 15;
		var b = 6 + 2 * a;
		if (cool)
			return '0 0 ' + a + 'px #ffffff, 0 1px ' + b + 'px #000000';
		return '0 1px ' + b + 'px #000000';
	}
	el.onclick = function() {
		clearTimeout (tmr);
		fadeOut ();
	};
	function enqueue(text) {
		queue.push (text);
		if (!running) {
			dequeue ();
		}
	}
	function dequeue() {
		if (queue.length > 0) {
			running = 1;
			start (queue.shift());
		}
	}
	function start(text) {
		clearTimeout (tmr);
		inr.innerHTML = text;
		el.style.opacity = '1';
		el.style.filter = '';
		el.style.textShadow = gts(1);
		el.style.display = 'block';
		el.style.transform = el.style.WebkitTransform = el.style.MozTransform = '';
		cur = max;
		tmr = setTimeout(fadeOut, 1500);
	}
	function fadeOut() {
		cur --;
		if (cur > 0) {
			tmr = setTimeout(fadeOut, 30);
		} else {
			el.style.display = 'none';
			running = 0;
			dequeue ();
		}
		var v = 1 - Math.pow(1 - cur / max, 2);
		el.style.filter = 'alpha(opacity=' + Math.round(v * 100) + ')';
		el.style.opacity = v;
		el.style.transform = el.style.WebkitTransform = el.style.MozTransform = 'translate(0, ' + (1 - v) * 30 + 'px) scale(' + (v * 0.4 + 0.6) + ')';
		el.style.textShadow = gts(v);
	}
	if (cool) el.className += ' spn-cool';
	return {
		show: enqueue
	};
}();

// }

// --options-gui--
// initializes the gui for the options {

defClass("OptionBox").prototype.implement({

	init: function(options) {
		this._options = options;
		if (!this._options.visible || this._options.visible()) {
			this.render();
		}
		if (this._options.init) {
			this._options.init();
		}
	},

	render: function() {
		var element = C('selecti');
		var help = C('span-help', 'span');
		var container = C('sl-container');
		help.innerHTML = this._options.title;
		help.title     = this._options.description;
		element.appendChild(help);
		element.appendChild(document.createTextNode(': '));
		element.appendChild(container);
		if (!this._options.renderTo) this._options.renderTo = 'tdoption';
		$(this._options.renderTo).appendChild(element);
		this.renderSelectBox(container);
	},

	renderSelectBox: function(where) {
		this.select = selectLiek(this._options.options, where);
		this.select.onchange = this.proxy('changed');
		this.select.selectChoiceByValue(this._options.value ? this._options.value() : PREF(this._options.key));
	},

	changed: function(id, value, oldValue) {
		if (this._options.key !== undefined) {
			PREF(this._options.key + '=' + value);
		}
		if (this._options.validate) {
			var newValue = this._options.validate(id, value, oldValue);
			if (newValue !== undefined && newValue != value) {
				value = newValue;
				if (this._options.key !== undefined) {
					PREF(this._options.key + '=' + value);
				}
				this.select.selectChoiceByValue(value);
			}
		}
		if (this._options.handler) {
			this._options.handler(id, value);
		}
	}

});

defClass("OptionsUI").prototype.implement({

	loadOptions: function() {
		this._options = [];
		for (var i = 0; i < this.constructor.options.length; i ++) {
			this._options.push(new OptionBox(this.constructor.options[i]));
		}
	}

});

OptionsUI.ON_OFF = { '0': 'Off', '1': 'On' };

OptionsUI.options = [
	{
		title: 'Popup Notification<span id="popup-override-indicator"></span>',
		description: 'Displays popup notifications on new tweets / mentions. Only available in some platforms.',
		key: 'sysNotifyMode',
		options: {
			'0' : 'Off',
			'1' : 'On',
			'2' : 'Only Mentions',
			'3' : 'Mentions &amp; Highlights',
			'override': '<span id="popup-override-text">Override</span>'
		},
		validate: function(id, value, oldValue) {
			if ((window.platform === undefined || window.platform.showNotification === undefined) && (window.thaiWitterClientNotify === undefined) && !window.webkitNotifications && value != '0') {
				notify ('Popup notifications are only available in Mozilla Prism and Google Chrome.');
				return '0';
			}
			if (value == 'override') {
				app._components.notifier.overridden = !app._components.notifier.overridden;
				if (app._components.notifier.overridden) {
					$('popup-override-text').innerHTML = '<b>Override</b>';
					$('popup-override-indicator').innerHTML = ' <span title="Overridden: Popup notifications will show regardless of the settings.">[O]</span>';
					notify ('Popup notifications will always be shown for this window.');
				} else {
					$('popup-override-text').innerHTML = 'Override';
					$('popup-override-indicator').innerHTML = '';
					notify ('Popup notifications override turned off.');
				}
				return oldValue;
			}
			if (window.webkitNotifications && window.webkitNotifications.checkPermission() !== 0) {
				var requestPermission = function() {
					window.webkitNotifications.requestPermission();
				};
				notify ('Please enable notifications: <span style="-webkit-appearance: button; color: ButtonText; display: inline-block; padding: 3px 6px" onclick="' + requestPermission.callback() + '()">Click Here</span>');
			}
		}
	},
	{
		title: 'Refresh Rate',
		description: 'How many seconds between each automatic refresh.',
		key: 'refreshRate',
		options: {
			'30' : '30 seconds',
			'45' : '45 seconds',
			'60' : '60 seconds',
			'75' : '75 seconds',
			'90' : '90 seconds',
			'120' : '2 minutes',
			'180' : '3 minutes',
			'240' : '4 minutes',
			'300' : '5 minutes'
		},
		handler: function() {
			app._components.timeline.feed.resetTimer();
		}
	},
	{
		title: 'Refresh on Tweet',
		description: 'Refresh the timeline after tweeting.',
		key: 'refreshOnTweet',
		options: OptionsUI.ON_OFF
	},
	{
		title: 'Auto Login',
		description: 'Login automatically when starting thaiWitter.',
		handler: function(id, value) {
			var enabled = (value == '0' ? '0' : '1');
			var xh = new XH('POST', app._components.config.api.auto + '?time=' + (new Date().getTime()));
			var pg = new Progress('Saving Settings...');
			xh.setProgress(pg);
			xh.oncomplete = function(response) {
				try {
					var data = json_parse(response);
					if (data.scs) {
						pg.ok('<span style="color: #7f7"><b>Success.</b> Login Info Saved.</span>');
					} else {
						pg.ok('Cannot Save Login Info');
					}
				} catch (e) {
					pg.fail('Cannot Save Login Info');
				}
			};
			xh.sendForm('enable=' + enabled + '&tk=' + THE_TOKEN);
		},
		options: OptionsUI.ON_OFF,
		value: function() {
			var cookie = document.cookie;
			return app._components.config.autologinCheck(cookie) ? '1' : '0';
		}
	},
	{
		title: 'Show Client',
		description: 'Show client name in the timeline.',
		key: 'ifclient',
		options: OptionsUI.ON_OFF,
		handler: InfoToggler.createHandler('ifclient')
	},
	{
		title: 'Show In Reply To',
		description: 'Show the username and link to referred status in timeline.',
		key: 'ifirp',
		options: OptionsUI.ON_OFF,
		handler: InfoToggler.createHandler('ifirp')
	},
	{
		title: 'Auto Scroll',
		description: 'Scroll to the bottom of the timeline automatically.',
		key: 'autoScrollOnRefresh',
		options: { '0': 'No', '1': 'Yes', 'smarter': 'Smarter Yes!' }
	},
	{
		title: 'Use Retweet API',
		description: 'Use Twitter\'s official API when retweeting without altering the message.',
		key: 'useRetweetAPI',
		options: OptionsUI.ON_OFF
	},
	{
		title: 'Direct API Call',
		description: 'Call Twitter\'s API directly (instead of calling through thaiWitter servers). [Desktop Version]',
		key: 'clientEcho',
		options: OptionsUI.ON_OFF,
		visible: function() { return Capabilities.canEcho(); }
	},
	{
		title: 'User Stream',
		description: 'Real time twitter streaming using user streams. [Desktop Version]',
		key: 'clientStream',
		options: OptionsUI.ON_OFF,
		visible: function() { return Capabilities.canStream(); }
	},
	{
		title: 'Geolocation<span id="geo-status"></span>',
		description: 'Send your location with your tweet.',
		key: 'geolocationMode',
		options: { '0' : 'Off', '1' : 'On', '2' : 'Fixed' },
		handler: function(id, value) {
			if (value == '1') {
				app._components.geo.on ();
			} else {
				app._components.geo.off ();
			}
		},
		validate: function(id, value) {
			if (value == '1') {
				if (!navigator.geolocation) {
					notify ('No geolocation support for you(r browser)!');
					return '0';
				}
			}
			if (value == '2') {
				notify ('Not implemented.');
				return '0';
			}
		},
		init: function() {
			if (PREF('geolocationMode') == '1') app._components.geo.on();
		}
	},
	{
		title: 'Hardcore Mode',
		description: 'Hides the top and bottom bar, lets you see the tweet.',
		key: 'hardcoreMode',
		options: OptionsUI.ON_OFF,
		renderTo: 'tdmoar',
		handler: function(id, value) {
			app._components.appState.setSwitch('hardcore', value != '0', true);
			app._components.tweetBox.checkLength();
		},
		init: function() {
			app._components.appState.setSwitch('hardcore', PREF('hardcoreMode') != '0', true);
			app._components.tweetBox.checkLength();
		}
	},
	{
		title: 'Bypass t.co',
		description: 'Go to the link directly instead of through t.co, thanks to MICT blocking it.',
		options: OptionsUI.ON_OFF,
		key: 'skipTCo',
		renderTo: 'tdmoar'
	},
	{
		title: 'Image Upload Provider',
		description: 'Use which provider to upload images.',
		key: 'imageUploader',
		options: {
			'twitter': 'pic.twitter.com',
			'upic': 'upic.me'
		},
		renderTo: 'tdmoar'
	},
	{
		title: 'Notification Type',
		description: 'Select the type for notification. Use built in notification or Growl.',
		key: 'notificationEngine',
		options: {
			'builtin': 'Built-in Notification',
			'gntp': 'GNTP / Growl'
		},
		renderTo: 'tdmoar',
		visible: function() { return Capabilities.canGrowl(); }
	},
	{
		title: 'Notification Picture',
		description: 'Display profile picture on notifications.',
		key: 'notificationPicture',
		options: OptionsUI.ON_OFF,
		renderTo: 'tdmoar'
	}
];

// }

// --xtra--
// url keywords (timeline mode) {

function handleKeywords() {
	var m;
	var showUserInfo = false;
	if (location.search.match(/^\?mode=mentions/)) {
		xtra_keyword = '[@] ';
		xtra_timeline = 'mentions';
		xtra_params = '&timeline=mentions';
	} else if (location.search.match(/^\?mode=faves/)) {
		xtra_keyword = '[Fav] ';
		xtra_timeline = 'fave';
		xtra_params = '&timeline=faves';
	} else if (location.search.match(/^\?mode=dms/)) {
		xtra_keyword = '[DM] ';
		xtra_timeline = 'dms';
		xtra_params = '&timeline=dms';
	} else if ((m = location.search.match(/^\?q=([^&]+)/))) {
		var terms = decodeURIComponent(m[1]);
		xtra_keyword = '[search: ' + terms + '] ';
		xtra_timeline = 'search';
		xtra_params = '&timeline=search&q=' + encodeURIComponent(terms);
	} else if ((m = location.search.match(/^\?u=([^&]+)/))) {
		var username = decodeURIComponent(m[1]);
		xtra_keyword = '[' + (username.indexOf('/') > -1 ? 'list' : 'user') + ': ' + username + '] ';
		xtra_timeline = 'user';
		xtra_params = '&timeline=user&u=' + encodeURIComponent(username);
		showUserInfo = true;
		app._components.userInfoView.show(username);
	}
	if (!showUserInfo)
		app._components.userInfoView.hide();
}

// }






// --mixin: custom-css--
// wtf {

defClass("CustomCss").prototype.implement({

	init: function() {
		this._element = document.createElement('style');
		try {
			this.append();
		} catch (e) {
			document.addEventListener ('DOMContentLoaded', this.proxy('append'), false);
		}
		this.update (PREF('customCSS'));
	},

	getCSS: function() { return this._text; },

	append: function() {
		document.getElementsByTagName('head')[0].appendChild (this._element);
	},

	update: function(style) {
		var css = '@import "data:text/css,' + encodeURIComponent(style) + '";';
		try {
			this._element.innerHTML = css;
		} catch (e) {
			this._element.textContent = css;
		}
		this._text = style;
		PREF('customCSS=' + this._text);
	},
	
	openEditor: function() {
		var that = this;
		openPopup('custom-css.html', '', "toolbar=no,location=no,status=no,menubar=no,scrollbars=no,width=300,height=200,resizable=yes");
	}

});

defClass("CssEditor").implement({

	watch: function(element) {
		var editor = new this(element);
	}

}).prototype.implement({

	init: function(element) {
		this._element = element;
		this.loadCss();
		this.registerEventHandlers();
		this._timer = 0;
	},

	loadCss: function() {
		this._element.value = app._components.customCSS.getCSS();
	},

	saveCss: function() {
		app._components.customCSS.update(this._element.value);
	},

	registerEventHandlers: function() {
		this._element.addEventListener('keypress', this.proxy('textChanged'), false);
		this._element.addEventListener('mouseup',  this.proxy('textChanged'), false);
		this._element.addEventListener('change',   this.proxy('textChanged'), false);
	},

	textChanged: function() {
		clearTimeout(this._timer);
		this._timer = setTimeout(this.proxy('saveCss'), 500);
	}

});

defClass("ZzzKeyHandler").prototype.register({

	'A67': function() { app._components.customCSS.openEditor(); },
	'A88': function() { if (confirm('Reset custom CSS?')) app._components.customCSS.update('/* Custom CSS */\n\n'); }

});

defClass("Application").prototype.implement({
	registerComponents: function() {
		arguments.callee._super.apply(this, arguments);
		this.register('customCSS', new CustomCss());
	}
});

// }

// --mixin: conversaion--
// allows showing of conversation!

defClass("TimelineCommands").prototype.implement({
	showConversation: function() {
		new Conversation(this._timeline.getCurrent().record).show();
	}
});

defClass("TimelineKeyHandler").prototype.implement({
	enter: function(kc, e) {
		if (e.shiftKey) {
			this._timeline.cmd.showConversation();
		} else {
			return arguments.callee._super.call(this, kc, e);
		}
	}
});

defClass("TimelineMouseHandler").prototype.register({
	'reply-to': function(e, c, g) {
		var id = g('reply-to');
		if (!e.altKey) {
			new Conversation(this._timeline.map[id].record).show();
		} else {
			arguments.callee._super.call(this, e, c, g);
		}
	}
});

// --conversation--

defClass("Conversation").prototype.implement({

	init: function(target) {
		this._target  = target;
		this._root    = this._target.findRoot();
		this._aborted = false;
	},

	getTarget: function() { return this._target; },
	getRoot: function() { return this._root; },

	show: function() {
		if (this._root.loaded) { // the root found is loaded
			this.display();
		} else {
			if (confirm('Do you want to fetch to the root of the conversation?\n' +
				'This feature is still at experimental state, so...\n\n' +
				'Pressing OK will make thaiWitter make a lot of API calls!\n    and get a more complete overview of the conversation.\n' +
				'Pressing cancel and thaiWitter will only use the available information\n    without fetching additional data.\n\n' +
				'Don\'t blame me if you used up all your API limit, OK?')) {
				this.loadAll();
			} else {
				this.display();
			}
		}
	},

	loadAll: function(callback) {
		this._pg = new Progress('Loading Conversation...');
		this._onfinish = callback;
		this.loadRoot();
	},

	cancel: function() {
		this._aborted = true;
		if (this._xh) {
			this._xh.abort();
		}
		if (this._pg) {
			this._pg.fail('Aborted!');
			this._pg = undefined;
		}
		if (this._onfinish) {
			this._onfinish();
		}
	},

	loadRoot: function() {
	  	if (this._root.mtChild) {
			this._xh = new XH('GET', app._components.config.api.mt + '?id=' + this._root.id.substr(4) + '&u=' + this._root.mtOwner);
			this._xh.oncomplete = this.proxy('oncomplete');
			this._xh.isMt = this._root
			this._xh.send();
			return
		}
		this._xh = new XH('GET', app._components.config.api.show + '?id=' + this._root.id);
		this._xh.oncomplete = this.proxy('oncomplete');
		this._xh.send();
	},

	gotTweet: function(data) {
		var tweet = Tweet.addTweet(data);
		if (this._xh.isMt) {
			Tweet.addConnection(tweet.id, this._xh.isMt.mtChild)
			this._root = tweet
			this._target = tweet
		}
		this._root = this._root.findRoot();
		if (this._root.loaded || this._root.mtChild) {
			this._pg.ok ('Conversation loaded!');
			this._pg = undefined;
			if (this._onfinish) this._onfinish();
			this.display();
		} else {
			this._pg.intermediate();
			this.loadRoot();
		}
	},

	oncomplete: function(response) {
		if (this._aborted) {
			return;
		}
		var data = json_parse(response);
		if (data.id_str) {
			this.gotTweet(data);
		} else {
			this._pg.fail('Can\'t fetch conversation!');
		}
	},

	buildList: function() {
		this._list = [];
		this.addBranches(this._root);
		this._list.sort(function(a, b) {
			return parseInt(a.id, 10) > parseInt(b.id, 10) ? 1 : -1;
		});
	},

	addBranches: function(node) {
		this._list.push(node);
		var branches = node.getBranches();
		if (branches) {
			for (var i in branches) {
				this.addBranches(branches[i]);
			}
		}
	},

	display: function() {
		this.buildList();
		if (this._list.length <= 1) {
			notify('No conversation found!');
			return;
		}
		var d = 'Conversation:\n===========================\n';
		for (var i = 0; i < this._list.length; i ++) {
			d += '[' + (this._list[i] == this._target ? '*' : '') + this._list[i].user.username + '] ' + this._list[i].text + '\n';
		}
		d += '===========================\nI seriously need a better UI for this.';
		alert (d);
	},

	getList: function() { return this._list; }

});

// }

// }

// --mixin: conversation-view--

defClass("ConversationKeyHandler", TimelineKeyHandler).prototype.implement({
	keyDown: function(kc, e) {
		if (kc === 27) {
			this._timeline.hide();
			return false;
		}
		return arguments.callee._super.call(this, kc, e);
	}
});

defClass("ConversationView", BaseTimeline).prototype.implement({

	init: function() {

		this._$conversation_visible = false;
		this.container = C('secondary-container');
		this.wrap      = C('secondary-wrapper');
		this.element   = C('secondary-display');
		this.container.appendChild(this.wrap);
		this.container.style.display = 'none';
		this.wrap.appendChild(this.element);

		window.addEventListener('resize', this.proxy('windowResized'), true);
		rootElement.appendChild(this.container);

		arguments.callee._super.apply(this, arguments);

	},

	getTopPad: function() { return 0; },
	getBottomPad: function() { return 0; },

	windowResized: function() {
		this.container.style.top    = (el.head.offsetHeight + 20) + 'px';
		this.container.style.bottom = (el.tweetData.offsetHeight + 20) + 'px';
	},

	createKeyHandler: function() { return new ConversationKeyHandler(this); },
	shouldSmoothScroll: function() { return arguments.callee._super.apply(this, arguments) && this._$conversation_visible; },
	getHeight: function() { return this.container.offsetHeight; },
	isVisible: function() { return this._$conversation_visible; },

	show: function() {
		this._$conversation_visible = true;
		this.container.style.display = 'block';
		this.element.style.paddingTop    = Math.round(this.getHeight() * 0.4) + 'px';
		this.element.style.paddingBottom = Math.round(this.getHeight() * 0.6) + 'px';
		this.windowResized();
		app.setActiveTimeline(this);
	},

	hide: function() {
		this._$conversation_visible = false;
		this.container.style.display = 'none';
		app.setActiveTimeline(app._components.mainTimeline);
		if (this.conversation) {
			this.conversation.cancel();
			this.conversation = undefined;
		}
	},

	showList: function(conversation) {
		this.conversation = conversation;
		var c = this.getCurrent();
		var oldPosition;
		if (c && !conversation.getTarget()) {
			oldPosition = c.getPosition() + c.getHeight();
		}
		this.setRecords(conversation.getList());
		if (conversation.getTarget()) {
			this.selectById(conversation.getTarget().id);
		}
		if (c && oldPosition != null) {
			this.shiftScrollPos(c.getPosition() + c.getHeight() - oldPosition);
		}
		this.show();
		this.updateRelatedRecords();
	},

	handleRecords: function(records) {
		if (this._$conversation_visible) {
			var relevant = [], root = this.conversation.getRoot();
			for (var i = 0; i < records.length; i ++) if (records[i].findRoot() == root) relevant.push(records[i]);
			this.addRecords(relevant);
			this.updateRelatedRecords();
		}
	},

	select: function(item, noScroll) {
		arguments.callee._super.apply(this, arguments);
		this.updateRelatedRecords();
	},

	updateRelatedRecords: function() {
		var cur = this.getCurrent();
		if (!cur) return;
		var related = [];
		var c = cur.record.getParent();
		if (c) related.push(c);
		//var b = cur.record.getBranches();
		//if (b) {
		//	for (var i in b) related.push(b[i]);
		//}
		this.setRelatedRecords(related);
	},

	setRelatedRecords: function(records) {
		if (this._$conversation_relatedItems) {
			for (var i = 0; i < this._$conversation_relatedItems.length; i ++) {
				this._$conversation_relatedItems[i].setState('conversation-related', '');
			}
		}
		this._$conversation_relatedItems = [];
		for (var i = 0; i < records.length; i ++) {
			if (this.map[records[i].id]) {
				this._$conversation_relatedItems.push(this.map[records[i].id]);
				this.map[records[i].id].setState('conversation-related', 'status-related');
			}
		}
	}

});

defClass("Application").prototype.implement({
	registerComponents: function() {
		arguments.callee._super.apply(this, arguments);
		this.register('conversation', new ConversationView());
	}
});

defClass("Conversation").prototype.implement({
	show: function() {
		this.display();
	},
	display: function() {
		this.buildList();
		app._components.conversation.showList(this);
	},
	gotTweet: function(data) {
		arguments.callee._super.apply(this, arguments);
		this.display();
	},
	handleLoadAll: function(record) {
		if (!record.loaded && record.jobs == 0) {
			this._target = undefined;
			this.loadAll(record.doJob());
			return true;
		}
		return false;
	}
});

defClass("TimelineKeyHandler").prototype.implement({
	enter: function(kc, e) {
		if (this._timeline.conversation && this._timeline.getCurrent() && this._timeline.conversation.handleLoadAll(this._timeline.getCurrent().record)) {
			return;
		} else {
			arguments.callee._super.call(this, kc, e);
		}
	}
});

defClass("AutoScroller").prototype.implement({
	autoScroll: function() {
		if (app._components.conversation.isVisible()) {
			return;
		}
		return arguments.callee._super.call(this, arguments);
	}
});

defClass("TimelineMouseHandler").prototype.implement({
	handleClick: function(e) {
		if (app._components.conversation.isVisible() && this._timeline !== app._components.conversation) {
			app._components.conversation.hide();
		} else {
			return arguments.callee._super.call(this, e);
		}
	}
}).register({
	'load': function(e, c, g) {
		var record = this._timeline.map[g('load')].record;
		if (this._timeline.conversation) {
			this._timeline.conversation.handleLoadAll(record);
		}
	}
});

defClass("TweetProc").prototype.implement({
	handleRecord: function(record) {
		app._components.conversation.handleRecords([record]);
		return arguments.callee._super.apply(this, arguments);
	}
});

defClass("Feed").prototype.implement({
	addRecordsToTimeline: function(records) {
		app._components.conversation.handleRecords(records);
		return arguments.callee._super.apply(this, arguments);
	}
});

// }

// --mixin: following-list

defClass("TabsToggler").prototype.list.push('lss');

defClass("TabsToggler").prototype.register({
	'lss': function() {
		FollowingList.activate();
	}
});

defClass("FollowingList").implement({

	activate: function() {
		this.sharedInstance().activate();
	}

}).prototype.implement({

	init: function() {
		this._loaded = false;
		this._button = $('lssbutton');
		this._button.onclick = this.proxy('buttonClicked');
		this.getList();
	},

	getList: function() {
		var gotList = this.proxy('gotList');
		var pg = new Progress('Loading Lists...');
		if (!this._loaded) {
			$('listslist').innerHTML    = '<div class="listbox-loading">Loading...</div>';
			$('searcheslist').innerHTML = '<div class="listbox-loading">Loading...</div>';
		}
		var xh = new XH('GET', app._components.config.api.follow + '?time=' + (new Date().getTime()));
		pg.oncancel = xh.proxy('abort');
		xh.setProgress(pg);
		xh.oncomplete = function(response) {
			try {
				var data = json_parse(response);
				gotList(data);
				pg.ok('Loaded!');
			} catch (e) {
				pg.fail('Can\'t Load Lists!');
			}
		};
		xh.send();
	},

	buttonClicked: function() {
		this.getList();
	},

	createLink: function(text, link) {
		return '<span class="listbox-item" onclick="pwns(unescape(\'' + escape(link) + '\'))">' + text + '</span>';
	},

	gotList: function(data) {
		var lists = '', searches = '';
		this._loaded = true;
		data.lists.sort(function(a, b) { return a.full_name.toLowerCase() < b.full_name.toLowerCase() ? -1 : 1; });
		data.searches.sort(function(a, b) { return a.query.toLowerCase() < b.query.toLowerCase() ? -1 : 1; });
		for (var i = 0; i < data.lists.length; i ++) {
			lists += this.createLink(data.lists[i].full_name, '?u=' + encodeURIComponent(data.lists[i].full_name.substr(1)));
		}
		for (var i = 0; i < data.searches.length; i ++) {
			searches += this.createLink(data.searches[i].query, '?q=' + encodeURIComponent(data.searches[i].query));
		}
		$('listslist').innerHTML = lists;
		$('searcheslist').innerHTML = searches;
	},

	activate: function() {
	}

});

// }

// --mixin: touch--
// touch manager {

defClass("TouchManager").prototype.implement({

	touchClass: (window.innerWidth >= 512 ? 'tablet' : 'mobile'),
	_isTouch: null,

	isTouch: function() {
		if (this._isTouch !== null) {
			return this._isTouch;
		}
		if (location.search.match(/[&?]emulatetouch/)) {
			return this._isTouch = true;
		}
		return this._isTouch = ('ontouchstart' in document.body);
	},

	has3d: function() {
		if (this._has3d == null) {
			this._has3d = (typeof WebKitCSSMatrix != 'undefined') && ('m44' in new WebKitCSSMatrix());
		}
		return this._has3d;
	},

	init: function() {
		if (!this.isTouch()) return;
		this.hook();
	},

	setAppearance: function() {
		if (!this.isTouch()) return;
		app._components.appState.set('touch-mode', true);
		app._components.appState.set(this.touchClass, true);
		$('install-tw').style.display = 'none';
		$('reload-tw').style.display = '';
	},

	hook: function() {

		defClass("EventHandler").prototype.implement({
			init: function() {
				arguments.callee._super.apply(this, arguments);
				window.addEventListener('orientationchange', function() {
					setTimeout(function() {
						var old = getResizingDisabled();
						this.setResizingDisabled(false);
						this.globalResize();
						this.setResizingDisabled(old);
					}.b(this), 0);
				}.b(this), false);
				this.resizeHandlers.push(function() {
					rootElement.style.top = (document.documentElement.offsetHeight - window.innerHeight) + 'px';
				});
			}
		});		

		defClass("TweetBox").prototype.implement({
			init: function() {
				arguments.callee._super.apply(this, arguments);
				this._element.addEventListener('focus', function() {
					app._components.events.globalResize();
					app._components.events.setResizingDisabled(true);
				}, false);
				this._element.addEventListener('blur',  function() {
					app._components.events.setResizingDisabled(false);
					app._components.events.globalResize();
				}, false);
			}
		});

		defClass("BaseTimeline").prototype.implement({

			init: function() {
				this._$touch_touchScrollDriver = new TouchScrollDriver(this);
				arguments.callee._super.apply(this, arguments);
				this._$touch_touchScroller = new TouchScroller(this);
			},

			getTouchScroller: function() { return this._$touch_touchScroller; },
			getDefaultThreshould: function() { return 64; },
			
			scrollTo: function(x, y) {
				this._$touch_touchScrollDriver.scrollTo (y);
			},

			shouldSmoothScroll: function() { return arguments.callee._super.apply(this, arguments) && (this._$touch_touchScroller ? !this._$touch_touchScroller.isScrolling() : true); },
			getMaxScroll: function() { return Infinity; },
			getMinScroll: function() { return -Infinity; }

		});

		defClass("Timeline").prototype.implement({

			scrollTo: function(x, y) {
				this._$touch_touchScrollDriver.scrollTo (y);
			},

			getMaxScroll: function() { return Infinity; },
			getMinScroll: function() { return -Infinity; }

		});

		defClass("TWButtonsBar").prototype.implement({

			setOffset: function(offset) {
				this._element.style.marginRight = 0;
				this._element.style.marginLeft  = 0;
			}

		});

	}

});

// --touch-driver-- {

defClass("TouchScrollDriver").prototype.implement({

	init: function(timeline) {
		this._position = 0;
		this._lastPosition = 0;
		this._timeline = timeline;
	},

	getPosition: function() { return this._position; },

	scrollTo: function(x) {
		this._lastPosition = this._position;
		this._position = x;
		this.update ();
	},

	update: function() {
		if (!app._components.touch.has3d()) {
			this._timeline.element.style.top = '' + (-this._position) + 'px';
		} else {
			this._timeline.element.style.WebkitTransform = 'translateY(' + (-this._position) + 'px) translateZ(0)';
		}
	}

});

// }

// --touch-tracker-- {

defClass("TouchTracker").prototype.implement({

	init: function(threshould) {
		this._threshould = threshould;
		this.clear();
	},
	
	clear: function() {
		this._data = [];
	},

	prune: function(time) {
		var threshould = this._threshould;
		while (this._data.length > 0 && this._data[0].time < time - threshould) {
			this._data.shift ();
		}
	},

	track: function(time, position) {
		this.prune (time);
		this._data.push ({
			time: time,
			position: position
		});
	},

	getSpeed: function(time) {
		this.prune (time);
		if (this._data.length > 1) {
			var first = this._data[0];
			var last = this._data[this._data.length - 1];
			return (last.position - first.position) / (last.time - first.time);
		}
		return 0;
	}

});

// }

// --touch-scroller-- {

defClass("TouchFingerTracker").prototype.implement({
	init: function(f) {
		this._id = f.id;
		this._x = f.x;
		this._y = f.y;
	}
});

defClass("TouchScroller").prototype.implement({

	/*
	@lastEventTime = false;
	@lastFingerPosition = undefined;
	@initialFingerPositon = undefined;

	@scrolling = false;
	@down = false;
	*/

	_scrolling: false,
	_down: null,
	_animation: 0,
	_animationSpeed: 0,
	_animationPosition: undefined,
	_animationTime: undefined,

	isScrolling: function() { return this._scrolling; },

	init: function(timeline) {
		this._tracker = new TouchTracker(app._components.touch.has3d() ? 100 : 360);
		this._timeline = timeline;
		this._content = this._timeline.element;
		this._wrapper = this._content.parentNode;
		this.addHandlers(this._timeline instanceof Timeline ? document : this._wrapper, this);
		this.hookOnResize();
		this.onresize();
		this._timeline.setScrollPos (20);
	},

	hookOnResize: function() {
		var that = this;
		defClass("EventHandler").prototype.implement({
			init: function() {
				arguments.callee._super.apply(this, arguments);
				this.resizeHandlers.push(that.proxy('onresize'));
			}
		});
	},

	// --touch-scroller-events-- {
	addHandlers: function(element, handler) {
		function createFinger(e, id) {
			return { x: e.clientX, y: e.clientY, id: id, time: new Date().getTime() };
		}
		function createHandler(name) {
			return function(e) {
				if (e.target.nodeName == 'TEXTAREA') return;
				for (var c = e.target; c; c = c.parentNode) {
					if (c.hasAttribute && c.hasAttribute('data-tw-popup')) {
						return;
					}
				}
				for (var i = 0; i < e.changedTouches.length; i ++) {
					handler[name](e, createFinger(e.changedTouches[i], e.changedTouches[i].identifier));
				}
				e.preventDefault();
				e.stopPropagation();
			};
		}
		if ('ontouchstart' in document.body) {
			element.addEventListener('touchstart', createHandler('ontouchstart'), false);
			element.addEventListener('touchmove', createHandler('ontouchmove'), false);
			element.addEventListener('touchend', createHandler('ontouchend'), false);
		} else {
			var down = false;
			element.addEventListener ('mousedown', function(e) {
				down = true;
				handler.ontouchstart(e, createFinger(e, 1));
			}, false);
			element.addEventListener ('mousemove', function(e) {
				if (down) {
					handler.ontouchmove(e, createFinger(e, 1));
				}
			}, false);
			element.addEventListener ('mouseup', function(e) {
				down = 0;
				handler.ontouchend(e, createFinger(e, 1));
			}, false);
		}
		if (handler.setup) {
			handler.setup();
		}
	},
	ontouchstart: function(e, f) {
		if (this._down) return;
		this._down = this._last = f;
		this._down.scrollingInitiated = false;
		this._animationSpeed = 0;
		this.stopAnimation();
		this._tracker.clear();
	},
	ontouchmove: function(e, f) {
		if (!this._down) return;
		if (f.id !== this._down.id) return;
		if (this._scrolling) {
			this._timeline.shiftScrollPos(this._last.y - f.y);
			this._tracker.track(f.time, this._timeline.getCurrentScrollPos());
		}
		if (Math.abs(this._down.y - f.y) >= 5) {
			this._down.scrollingInitiated = true;
			if (!this._scrolling) {
				this._scrolling = true;
				this._tracker.track(f.time, this._timeline.getCurrentScrollPos());
			}
		}
		this._last = f;
	},
	ontouchend: function(e, f) {
		if (!this._down) return;
		if (f.id !== this._down.id) return;
		if (this._scrolling) {
			this._tracker.track(f.time, this._timeline.getCurrentScrollPos());
			this._animationSpeed = this._tracker.getSpeed(f.time) * 18;
			this._animationPosition = this._timeline.getCurrentScrollPos();
			if (!this._down.scrollingInitiated) { // this is stopping motion
				this.sendClickStatus(e.target);
			}
			this.startAnimation();
		} else {
			if (e.type == 'touchend') {
				this.sendClick(e.target);
			}
		}
		this._down = null;
	},
	sendClick: function(t) {
		var evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		t.dispatchEvent(evt);
	},
	sendClickStatus: function(t) {
		for (var c = t; c; c = c.parentNode) {
			if (c.hasAttribute && c.hasAttribute('data-tw-status-item')) {
				return this.sendClick(c);
			}
		}
		return this.sendClick(t);
	},
	onresize: function() {
		if (this._lastTimelineHeight != null) {
			this._timeline.shiftScrollPos(this._lastTimelineHeight - window.innerHeight);
			this._lastTimelineHeight = window.innerHeight;
		}
	},
	// }
	
	// --touch-scroller-done-- {
	
	doneScrolling: function() {
	
		if (this._timeline.items.length === 0) return;

		var tt = this._timeline.getScrollPos() + el.head.offsetHeight;
		var bb = this._timeline.getScrollPos() + this._timeline.getHeight() - el.tweetData.offsetHeight;

		var i = this._timeline.getCurrent().index;
		
		var c = this._timeline.items[i];
		var t = c.getPosition();
		var b = t + c.getHeight();
		if (b > bb) {
			for (i --; i >= 0; i --) {
				c = this._timeline.items[i];
				t = c.getPosition();
				b = t + c.getHeight();
				if (b <= bb || i === 0) {
					this._timeline.selectItem (i, true);
					break;
				}
			}
		} else if (t < tt) {
			for (i ++; i < this._timeline.items.length; i ++) {
				c = this._timeline.items[i];
				t = c.getPosition();
				if (t >= tt || i == this._timeline.items.length - 1) {
					this._timeline.selectItem (i, true);
					break;
				}
			}
		}
		
	},

	// }

	// --touch-scroller-animation-- {
	startAnimation: function() {
		var that = this;
		this._animationTime = new Date().getTime();
		if (this._timeline.items.length > 0) {
			this.minScroll = this._timeline.items[0].getPosition() + this._timeline.items[0].getHeight() - this._timeline.getHeight() + this._timeline.getBottomPad() + 24;
			this.maxScroll = this._timeline.items[this._timeline.items.length - 1].getPosition() - this._timeline.getTopPad() - 24;
		} else {
			this.minScroll = 0;
			this.maxScroll = 0;
		}
		clearInterval (this._animation);
		this._animation = setInterval(function() {
			that.animationFrame ();
		}, 1000 / 60);
	},
	stopAnimation: function() {
		clearInterval (this._animation);
	},
	animationDone: function(command) {
		this._scrolling = false;
		if (command) {
			this._timeline.cmd[command]();
		} else {
			this.doneScrolling ();
		}
		this.stopAnimation ();
	},
	animationFrame: function() {
		var newTime = new Date().getTime(),
			content = this._content, wrapper = this._wrapper,
			elapsed = (newTime - this._animationTime) * 60 / 1000,
			newSpeed = this._animationSpeed * Math.pow(0.97, elapsed),
			newPosition = (this._animationSpeed * (Math.pow(0.97, elapsed) - 1)) / (Math.log(0.97)) + this._animationPosition,
			minPosition = this.minScroll, maxPosition = this.maxScroll,
			brake = false;
		this._timeline.setScrollPos (Math.round(newPosition));
		this._animationTargetCommand = undefined;
		if (newPosition < minPosition) {
			brake = true;
			this._animationTarget = minPosition;
			// @animationTargetCommand = 'home';
		} else if (newPosition > maxPosition) {
			brake = true;
			this._animationTarget = maxPosition;
			// @animationTargetCommand = 'end';
		}
		if (brake) {
			var that = this;
			clearInterval (this._animation);
			this._animationTime = newTime;
			this._animationSpeed = newSpeed;
			this._animationPosition = newPosition;
			this._animation = setInterval(function() {
				that.leaveFrame();
			}, 1000 / 60);
		} else if (Math.abs(newSpeed) < 0.5) {
			this.animationDone();
		}
	},
	leaveFrame: function() {
		var newTime = new Date().getTime(),
			elapsed = (newTime - this._animationTime) * 60 / 1000,
			newPosition = this._animationPosition + this._animationSpeed * elapsed;
		this._timeline.setScrollPos (Math.round(newPosition));
		if (elapsed > 8) {
			var that = this;
			clearInterval (this._animation);
			this._animationTime = newTime;
			if ((this._animationPosition - this._animationTarget) * (newPosition - this._animationTarget) < 0
				&& (newPosition - this._animationTarget) * this._animationSpeed > 0) {
				this._animationPosition = newPosition;
				this._animation = setInterval(function() {
					that.animationFrame();
				}, 1000 / 60);
			} else {
				this._animationPosition = newPosition - this._animationTarget;
				this._animation = setInterval(function() {
					that.brakeFrame();
				}, 1000 / 60);
			}
		}
	},
	brakeFrame: function() {
		var newTime = new Date().getTime(),
			elapsed = (newTime - this._animationTime) * 60 / 1000,
			newPosition = this._animationPosition * Math.pow(0.8, elapsed) + this._animationTarget,
			roundedPosition = Math.round(newPosition);
		this._timeline.setScrollPos (roundedPosition);
		if (roundedPosition == this._animationTarget) {
			this.animationDone(this._animationTargetCommand);
		}
	}
	// }

});

// }

defClass("Application").prototype.implement({
	registerComponents: function() {
		this.register('touch', new TouchManager());
		arguments.callee._super.call(this);
	},
	launchApplication: function() {
		this.locate('touch').setAppearance();
		arguments.callee._super.apply(this, arguments);
	}
});

// --touch-easter--
// what is this going to do? {
defClass("TouchEasterEgg").prototype.implement({
	_pi: [2, 0, 3, 0, 4],
	init: function() {
		this._queue = [];
	},
	notify: function(index) {
		this._queue.push(index);
		while (this._queue.length > this._pi.length) this._queue.shift();
		if (this._queue.length != this._pi.length) return;
		for (var i = 0; i < this._queue.length; i ++) {
			if (this._pi[i] != this._queue[i]) return;
		}
		this._queue = [];
		var dialog = new TWDialog('?!?', this.proxy('renderContent'), 'What is it?');
		dialog.show();
		dialog.onhide = this.proxy('scatter');
	},
	scatter: function(cont, dc) {
		var ai = [];
		dc();
		for (var i = 0; i < this._buttons.length; i ++) {
			ai.push({
				el: this._buttons[i],
				top: this._buttons[i].offsetTop,
				left: this._buttons[i].offsetLeft,
				angle: Math.random() * Math.PI * 2
			});
		}
		this._animation = dtjs2.a.c(0, 1, 0.3, function(v, fin) {
			for (var i = 0; i < ai.length; i ++) {
				ai[i].el.style.top = (ai[i].top + Math.sin(ai[i].angle) * v * 108) + 'px';
				ai[i].el.style.left = (ai[i].left + Math.cos(ai[i].angle) * v * 108) + 'px';
			}
			if (fin) {
				cont();
			}
		}, dtjs2.ease.o);
	},
	button: function(cls, label, kc) {
		var el = C('magic-button magic-button-' + cls);
		el.appendChild(document.createTextNode(String.fromCharCode(label)));
		el.onclick = function(e) {
			app._components.events.processKeyHandlerQueue('keyDown', kc, e);
			app._components.events.processKeyHandlerQueue('keyUp', kc, e);
			app._components.tweetBox.blur();
		}.b(this);
		this._element.appendChild(el);
		this._buttons.push(el);
	},
	renderContent: function(el) {
		if (!this._element) {
			this._element = C('magic-box');
			this._buttons = [];
			this.button('left', 9664, 37);
			this.button('down', 9660, 40);
			this.button('up', 9650, 38);
			this.button('right', 9654, 39);
		}
		if (this._animation) this._animation();
		for (var i = 0; i < this._buttons.length; i ++) {
			this._buttons[i].style.top = '';
			this._buttons[i].style.left = '';
		}
		el.appendChild(this._element);
	}
});

defClass("TouchManager").prototype.implement({
	hook: function() {
		arguments.callee._super.apply(this, arguments);
		var touchEEController = new TouchEasterEgg();
		defClass("Timeline").prototype.implement({
			select: function(item) {
				var ret = arguments.callee._super.apply(this, arguments);
				if (item && item.index != null) {
					touchEEController.notify(item.index);
				}
				return ret;
			}
		});
	}
});

// }

// }

// --mixin: facebook--
// facebook integration {

defClass("Application").prototype.implement({
	getBottomButtons: function() {
		var r = arguments.callee._super.apply(this, arguments);
		r.unshift(this.locate('facebookButton'));
		return r;
	},
	registerComponents: function() {
		this.register('facebookButton', new BottomButton('btn-facebook'));
		arguments.callee._super.apply(this, arguments);
		this.register('facebookController', new FacebookController(this.locate('facebookButton')));
	},
	launchApplication: function() {
		arguments.callee._super.apply(this, arguments);
		this.locate('facebookController').hookTweetBox(this.locate('tweetBox'));
	}
});

defClass("TimelineKeyHandler").prototype.implement({
	enter: function(kc, e) {
		var controller = app._components.facebookController;
		if (!controller) return arguments.callee._super.apply(this, arguments);
		if (!controller.isEnabled()) return arguments.callee._super.apply(this, arguments);
		if (kc == 27) if (controller.flashDismiss() === false) return;
		if (kc == 13) if (controller.flashRespond() === false) return;
		return arguments.callee._super.apply(this, arguments);
	}
});

defClass("FacebookController").prototype.implement({
	_enabled: false,
	_connected: false,
	_intervened: false,
	_shouldTweet: false,
	init: function(button) {
		this._button = button;
		this._button.onclick = this.proxy('onclick');
		this._statusElement = $('fb-status');
		this._descriptionElement = $('fb-description');
		this._userElement = $('fb-user');
		this._buttonElement = $('fb-connect-button');
		this._buttonContainer = $('fb-connect-button-container');
		this._dataElement = $('fb-data');
		this._dataElement.style.display = 'none';
		this._buttonElement.onclick = this.proxy('connectButtonClicked');
	},
	hookTweetBox: function(tb) {
		this._tweetBox = tb;
		var that = this;
		this._tweetBox.implement({
			checkLength: function() {
				arguments.callee._super.apply(this, arguments);
				that.checkText();
			}
		});
	},
	isEnabled: function() { return this._enabled; },
	shouldFlash: function() { return PREF('facebookTweet') == 'delayed' && this.determineByText() && !this._intervened; },
	on: function() {
		if (!this._enabled) {
			this._button.show(); this._button.dim(); this._button.updateState();
			this._dataElement.style.display = 'block';
			this._descriptionElement.style.display = 'none';
			this._enabled = true;
			this.checkSession(false);
		}
	},
	off: function() {
		if (this._enabled) {
			this._button.hide(); this._button.updateState();
			this._enabled = false;
			this._dataElement.style.display = 'none';
			this._descriptionElement.style.display = 'block';
		}
	},
	determineByText: function() {
		if (this._tweetBox.getText() == '') return false;
		if (this._tweetBox.isReplying()) return false;
		if (this._tweetBox.isRetweeting() && PREF('facebookTweet') != '2' && PREF('facebookTweet') != 'delayed') return false;
		if (this._tweetBox.getText().match(/^\s*d\s+\w+/i)) return false;
		if (this._tweetBox.getText().match(/^\s*@/i)) return false;
		return true;
	},
	determine: function() {
		if (!this.determineByText()) return false;
		if (PREF('facebookTweet') == 'selective' && !this._tweetBox.getText().match(/#fb/i)) return false;
		if (PREF('facebookTweet') == 'delayed') return false;
		return true;
	},
	checkText: function() {
		if (this._tweetBox.getText() == '') {
			this._intervened = false;
		}
		if (this._intervened) return;
		if (this.determine()) {
			this.setShouldTweet(true);
		} else {
			this.setShouldTweet(false);
		}
		if (this._tweetBox.getText() == '' || (PREF('facebookTweet') == 'delayed' && this.determineByText())) {
			this._button.setState('shouldTweet', 'btn-fb-none');
		}
		this._button.updateState();
	},
	setShouldTweet: function(shouldTweet) {
		this._shouldTweet = shouldTweet;
		this._button.setState('shouldTweet', shouldTweet ? 'btn-fb-update' : 'btn-fb-noupdate');
	},
	onclick: function() {
		if (!this._connected) {
			optsNew.show();
			app._components.tabsToggler.go('fb');
		} else {
			this.toggleShouldTweet();
		}
	},
	toggleShouldTweet: function() {
		this._intervened = true;
		this.setShouldTweet(!this._shouldTweet);
		this._button.updateState();
	},
	connectButtonClicked: function() {
		if (!this._connected) {
			pwns('fb-page.html#redir=' + escape(this._loginUrl).replace(/%/g, ','));
		} else {
			this.disconnect();
		}
	},
	shouldTweet: function() {
		return this._enabled && this._connected && this._shouldTweet;
	},
	notConnected: function(text, login) {
		this._loginUrl = login;
		this._buttonContainer.style.display = login != null ? 'block' : 'none';
		this._buttonElement.innerHTML = 'Connect to Facebook';
		this._statusElement.innerHTML = text;
		this._userElement.innerHTML = '';
		this._userElement.className = 'fb-disconnected';
		this._connected = false;
		this._button.dim(); this._button.updateState();
	},
	connected: function(name) {
		this._buttonContainer.style.display = 'block';
		this._buttonElement.innerHTML = 'Sign Out';
		this._statusElement.innerHTML = 'Connected';
		this._userElement.innerHTML = name;
		this._userElement.className = 'fb-connected';
		this._connected = true;
		this._button.undim(); this._button.updateState();
	},
	disconnect: function() {
		this.performSessionAPI('POST', 'signout=outtahere&tk=' + THE_TOKEN);
	},
	checkSession: function(fromLogin) {
		this.performSessionAPI('GET', '');
	},
	performSessionAPI: function(method, data) {
		this._buttonContainer.style.display = 'none';
		this._statusElement.innerHTML = '(Loading...)';
		var xh = new XH(method, app._components.config.api.fbcheck + '?time=' + (new Date().getTime()) + xtra_secure);
		xh.oncomplete = function(response) {
			try {
				var data = json_parse(response);
				if (!data.loggedIn) {
					this.notConnected('Not Connected', data.redirect);
				} else {
					this.connected(data.name);
				}
			} catch (e) {
				this.notConnected('Error!', null);
			}
		}.b(this);
		if (method == 'POST') xh.sendForm(data); else xh.send();
	}
});

defClass("FacebookController").prototype.implement({
	_$flash_flashing: false,
	_$flash_hintSent: false,
	flash: function(o) {
		this._button.startFlashing();
		this._$flash_flashing = true;
		this._$flash_flashCallback = o;
		setTimeout(this.proxy('flashTimeout'), 5000);
	},
	stopFlashing: function() {
		this._button.stopFlashing();
		this._$flash_flashing = false;
		this._$flash_flashCallback = null;
	},
	flashTimeout: function() {
		this.stopFlashing();
	},
	flashDismiss: function() {
		if (!this._$flash_flashing) return;
		this.stopFlashing();
		return false;
	},
	flashRespond: function() {
		if (!this._$flash_flashing) return;
		this._$flash_flashCallback.sendToFacebook();
		this.stopFlashing();
		return false;
	}
});

defClass("OptionsUI").options.push(
	{
		title: 'Tweet To Facebook',
		description: 'Update your Facebook status after tweeting.',
		key: 'facebookTweet',
		options: {
			'0': 'Off',
			'1': 'On',
			'2': 'On + Retweets',
			'selective': '<span style="cursor:help" title="Only when your status contains #fb, or you enable it yourself">Only #fb / Manual</span>',
			'delayed': '<span style="cursor:help" title="After you tweet, you have 5 seconds to press Enter again">5 Seconds</span>'
		},
		renderTo: 'fb-option',
		handler: function(id, value) {
			if (value != '0') {
				app._components.facebookController.on();
				app._components.facebookController.checkText();
			} else {
				app._components.facebookController.off();
			}
		},
		init: function() {
			if (PREF('facebookTweet') != '0') app._components.facebookController.on();
		}
	}
);

defClass("GlobalKeyHandler").prototype.register({
	'A70': function() { app._components.facebookController.onclick(); }
});

defClass("FacebookStatusUpdateProc").prototype.implement({
	setPicture: function(picture) { this._picture = picture; },
	setLink: function(link) { this._link = link; },
	setText: function(text) { this._text = text; },
	send: function() {
		var pg = new Progress('Posting to Facebook');
		var xh = new XH('POST', app._components.config.api.fbpost);
		xh.oncomplete = function(response) {
			try {
				var data = json_parse(response);
				if (data.success) {
					pg.ok('Posted to Facebook!', [59, 89, 152]);
				} else {
					pg.fail('Can\'t post to Facebook!');
				}
			} catch (e) {
				pg.fail('Can\'t post to Facebook!');
			}
		}.b(this);
		var linkParam = '', picture = this._picture, link = this._link;
		if (picture != null) linkParam += '&picture=' + encodeURIComponent(picture);
		if (link != null) linkParam += '&link=' + encodeURIComponent(link);
		xh.sendForm('value=' + encodeURIComponent(this._text) + linkParam + '&tk=' + THE_TOKEN);
	}
});

defClass("TweetProc").prototype.implement({
	init: function() {
		this._$facebook_shouldSend = app._components.facebookController.shouldTweet();
		this._$facebook_alreadySent = false;
		this._$facebook_facebookProc = null;
		if (app._components.facebookController.shouldFlash()) {
			app._components.facebookController.flash(this);
		}
	},
	onsuccess: function(data) {
		arguments.callee._super.apply(this, arguments);
		var text = this._req.getText();
		var proc = new FacebookStatusUpdateProc();
		if (PREF('facebookTweet') == 'selective') {
			text = text.replace(/#fb$/i, '');
		}
		if (data && data.entities && data.entities.media && data.entities.media.length > 0) {
			text = data.text.replace(/https?:\/\/t\.co\/(\w+)/g, function(all, word) {
				for (var i = 0; i < data.entities.media.length; i ++) {
					var medium = data.entities.media[i];
					if (all == medium.url) {
						if (medium.display_url == 'pic.twitter.com/' + word) {
							var picURL = 'http://' + medium.display_url;
							proc.setPicture(medium.media_url_https || medium.media_url);
							proc.setLink(picURL);
							return picURL;
						}
					}
				}
				return all;
			});
		}
		proc.setText(text);
		this._$facebook_facebookProc = proc;
		if (this._$facebook_shouldSend) {
			this.sendToFacebook();
		}
	},
	sendToFacebook: function() {
		if (this._$facebook_facebookProc) {
			if (this._$facebook_alreadySent) return;
			this._$facebook_alreadySent = true;
			this._$facebook_facebookProc.send();
		} else {
			this._$facebook_shouldSend = true;
		}
	}
});

// }

// --mixin: image-upload--
// {
defClass("ImageFile").prototype.implement({
	init: function(file) {
		this._file = file;
		this._element = C('image-upload-file');
		this._removeButton = C('image-upload-remove-button');
		this._name = C('image-upload-name');
		this._element.appendChild(this._removeButton);
		this._element.appendChild(this._name);
		this._removeButton.onclick = this.proxy('removeButtonClicked');
		this._name.appendChild(document.createTextNode(this._file.name));
	},
	getFile: function() { return this._file; },
	renderTo: function(el) {
		el.appendChild(this._element);
	},
	remove: function(cont) {
		if (this._removed) return;
		this._removed = true;
		dtjs2.a.c(this._element.offsetHeight, 0, 0.25, function(v, f) {
			this._element.style.height = v + 'px';
			if (f) if (this._element.parentNode) { this._element.parentNode.removeChild(this._element); if (cont) cont(); }
		}.b(this), dtjs2.ease.io);
	},
	removeButtonClicked: function() {}
});

defClass("ImageUploader").prototype.implement({
	init: function() {
		this._popup = new TweetBarPopup('right');
		this._element = C('image-upload-files');
		this._popup.getContentElement().appendChild(this._element);
		this._queue = [];
		var dropTarget = document;
		dropTarget.addEventListener('dragenter', this.proxy('ondragenter'), false);
		dropTarget.addEventListener('dragover',  this.proxy('ondragover'), false);
		dropTarget.addEventListener('drop',      this.proxy('ondrop'), false);
	},
	hasImages: function() { return this._queue.length > 0; },
	getReserveLength: function() { return this._queue.length * (TWITTER_CONFIG.characters_reserved_per_media); },
	getFiles: function() {
		var files = [];
		for (var i = 0; i < this._queue.length; i ++) {
			files.push(this._queue[i].getFile());
			this._queue[i].remove();
		}
		this._queue = [];
		this._popup.hide();
		return files;
	},
	queueFileForUpload: function(file) {
		var image = new ImageFile(file);
		if (file.size > TWITTER_CONFIG.photo_size_limit) {
			notify(file.name + ': too large!');
		}
		this._queue.push(image);
		this.pruneToLimit();
		image.renderTo(this._element);
		image.removeButtonClicked = function() {
			this.removeImage(image);
		}.b(this);
	},
	pruneToLimit: function() {
		while (this._queue.length > TWITTER_CONFIG.max_media_per_upload) {
			var c = this._queue.shift();
			c.remove(this.proxy('updatePopupHeight'));
		}
	},
	updatePopupHeight: function() {
		app._components.tweetBox.checkLength();
		if (this._queue.length > 0) {
			this._popup.updateHeight();
		} else {
			this._popup.hide();
		}
	},
	removeImage: function(img) {
		for (var i = 0; i < this._queue.length; i ++) {
			if (this._queue[i] == img) {
				this._queue.splice(i, 1);
				img.remove(this.proxy('updatePopupHeight'));
				break;
			}
		}
	},
	ondragenter: function(e) {
		e.stopPropagation();
		e.preventDefault();
	},
	ondragover: function(e) {
		e.stopPropagation ();
		e.preventDefault ();
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'copy';
			e.dataTransfer.dropEffect = 'copy';
		}
	},
	ondrop: function(e) {
		var dt, files;
		e.stopPropagation ();
		e.preventDefault ();
		dt = e.dataTransfer;
		files = dt.files;
		for (var i = 0; i < files.length && i < 1; i ++) {
			this.queueFileForUpload(files[i]);
		}
		this._popup.show();
		app._components.tweetBox.checkLength();
	}
});

defClass("ImageXH", XH).prototype.implement({
	init: function() {
		this._$multipart_fields = [];
		arguments.callee._super.apply(this, arguments);
	},
	createXHR: function() {
		var xhr = arguments.callee._super.apply(this, arguments);
		if (xhr.upload && xhr.upload.addEventListener) {
			xhr.upload.addEventListener('progress', this.proxy('onprogress'), false);
		}
		return xhr;
	},
	addFormField: function(name, value, cont) {
		this._$multipart_fields.push('Content-Disposition: form-data; name="' + name + '"\r\n\r\n' + unescape(encodeURIComponent(value)));
		cont();
	},
	addFile: function(name, fileName, file, cont) {
		var fields = this._$multipart_fields;
		function work(binary) {
			fields.push('Content-Disposition: form-data; name="' + name + '"; filename="' + fileName + '"\r\nContent-Type: ' + file.type + '\r\n\r\n' + binary);
			cont();
		}
		if (file.getAsBinary) {
			work(file.getAsBinary());
		} else {
			var r = new FileReader();
			r.onload = function(e) { work(e.target.result); };
			r.readAsBinaryString(file);
		}
	},
	generateBoundary: function() {
		var boundary = '---------------------------THAIWITTERUPLOAD';
		for (var i = 0; i < 20; i ++) {
			boundary += Math.floor(Math.random() * 10);
		}
		return boundary;
	},
	sendAll: function() {
		for(;;) {
			var boundary = this.generateBoundary();
			var ok = true;
			for (var i = 0; i < this._$multipart_fields.length; i ++) {
				if (this._$multipart_fields[i].indexOf(boundary) != -1) {
					ok = false; break;
				}
			}
			if (ok) break;
		}
		var payload = '--' + boundary;
		for (var i = 0; i < this._$multipart_fields.length; i ++) {
			payload += '\r\n' + this._$multipart_fields[i] + '\r\n--' + boundary;
		}
		payload += '--';
		this.setRequestHeader("Content-Type", "multipart/form-data, boundary="+boundary);
		this.setRequestHeader("Content-Length", payload.length);
		this._xhr.sendAsBinary(payload);
	},
	onprogress: function() {
	}
});

defClass("ImageUploadReq").prototype.implement({
	init: function(tweetReq, files, pg) {
		this._tweetReq = tweetReq;
		this._files = files;
		this._pg = pg;
		this._provider = PREF('imageUploader');
	},
	upload: function() {
		var echoAPI = this._provider == 'upic' ? app._components.config.api.echo : app._components.config.api.imgecho;
		var xh = new XH('GET', echoAPI + '?time=' + (new Date().getTime()));
		xh.setProgress(this._pg);
		xh.oncomplete = this.proxy('gotEcho');
		xh.send();
	},
	gotEcho: function(response) {
		if (response.substr(0, 15) == 'Authorization: ') {
			try {
				this._pg.intermediate();
				this.startUpload(response.substr(15));
			} catch (e) {
				this.onfail('Error starting image upload!');
				throw e;
			}
		} else {
			this.onfail('Unauthorized!');
		}
	},
	onfail: function(reason) {
	},
	oncomplete: function(response) {
	},
	appendLinkAndSend: function(url) {
	},
	startUpload: function(auth) {
		var xh;
		var files = this._files;
		var pg;

		var authServiceProvider = 'https://upload.twitter.com/1/statuses/update_with_media.json';
		var mediaFieldName = 'media[]';
		var action = 'complete';
		var endpoint = app._components.config.api.upload;
		if (this._provider == 'upic') {
			authServiceProvider = 'https://api.twitter.com/1/account/verify_credentials.json';
			mediaFieldName = 'media';
			action = 'append';
			endpoint = 'http://upic.me/api/upload?resp=json';
		}

		xh = new ImageXH('POST', endpoint);

		xh.setProgress(this._pg);
		xh.setRequestHeader("X-Auth-Service-Provider", authServiceProvider);
		xh.setRequestHeader("X-Verify-Credentials-Authorization", auth);
		xh.oncomplete = function(response) {
			if (pg) {
				pg.ok('Uploaded!');
			}
			if (action == 'complete') {
				this.oncomplete.apply(this, arguments);
			} else if (action == 'append') {
				try {
					var x = json_parse(response);
					if (!x.mediaurl) throw new Error('cannot find link D:');
					this.appendLinkAndSend(x.mediaurl);
				} catch (e) {
					this.onfail('cannot find link!');
				}
			}
		}.b(this);
		xh.onprogress = function(e) {
			if (e && e.lengthComputable) {
				pg.intermediate(e.loaded / e.total * 100);
			}
		};
		this.setFormFields(xh, function() {
			var i = 0;
			function loop() {
				if (!(i < files.length)) return next();
				var file = files[i];
				xh.addFile(mediaFieldName, file.name, file, function() {
					i ++;
					loop();
				});
			}
			function next() {
				pg = new Progress('Uploading...', true);
				xh.sendAll();
			}
			loop();
		});
	},
	getFormFields: function() {
		if (this._provider == 'upic') {
			return [['message', this._tweetReq.getText()]];
		} else {
			var fields = [['status', this._tweetReq.getText()]];
			if (this._tweetReq.getReply() != null) fields.push(['in_reply_to_status_id', this._tweetReq.getReply()]);
			var coord = app._components.geo.getCoordinates();
			if (coord != null) {
				fields.push(['lat', coord[0]]);
				fields.push(['long', coord[1]]);
				fields.push(['display_coordinates', 'true']);
			}
			return fields;
		}
	},
	setFormFields: function(xh, callback) {
		var fields = this.getFormFields();
		var i = 0;
		function loop() {
			if (!(i < fields.length)) return callback();
			xh.addFormField(fields[i][0], fields[i][1], function() {
				i ++; loop();
			});
		}
		loop();
	}
});

defClass("TweetReq").prototype.implement({
	send: function() {
		if (app._components.imageUploader.hasImages()) {
			this._$image_upload = new ImageUploadReq(this, app._components.imageUploader.getFiles(), this._pg);
			this._$image_upload.onfail = this.proxy('onfail');
			this._$image_upload.oncomplete = this.proxy('oncomplete');
			this._$image_upload.appendLinkAndSend = this.proxy('appendLinkAndSend');
			this._$image_upload.upload();
			return;
		}
		return arguments.callee._super.apply(this, arguments);
	},
	appendLinkAndSend: function(url) {
		this._text += (this._text.match(/\s+$/) ? '' : ' ') + url;
		this.send();
	}
});

defClass("TweetBox").prototype.implement({
	getNormalizedLength: function() {
		return arguments.callee._super.apply(this, arguments) + (app._components.imageUploader ? app._components.imageUploader.getReserveLength() : 0)
	}
});

defClass("Application").prototype.implement({
	registerComponents: function() {
		arguments.callee._super.apply(this, arguments);
		this.register('imageUploader', new ImageUploader());
	}
});
// }

// --thai-text-fix-- {
// fixes thai text in iOS

if (AM_I_IOS) {

	InfoToggler.keys.push('ifiosthai');

	OptionsUI.options.push({
		title: 'Enlarge Thai Fonts (iOS)',
		description: 'Enlarge Thai text in iOS (they are small!)',
		key: 'ifiosthai',
		options: OptionsUI.ON_OFF,
		renderTo: 'tdmoar',
		handler: InfoToggler.createHandler('ifiosthai')
	});

	defClass("Item").prototype.implement({
		formatText: function() {
			return (arguments.callee._super.apply(this, arguments)).replace(/[\u0e01-\u0e5b]+/g, function(all) {
				return '<span class="thai-text">' + all + '</span>';
			});
		}
	});

}

// }




// --mixin: image-preview--
// preview images in a popup {

defClass("Application").prototype.implement({

	registerComponents: function() {
		arguments.callee._super.apply(this, arguments);
		this.register('mediaPreviewKeyHandler', new MediaPreviewKeyHandler());
	},

	getKeyHandlers: function() {
		var l = arguments.callee._super.apply(this, arguments);
		l.unshift(this.locate('mediaPreviewKeyHandler'));
		return l;
	}

});

defClass("IMediaLoader").prototype.implement({
	onload: function() { },
	onerror: function() { },
	load: function() {throw new Error("unimplemented: IMediaLoader#load()");}
});

defClass("MediaLoaderCache").implement({
	_map: {},
	register: function(url, loader) {
		this._map[url] = loader;
	},
	get: function(url) {
		return this._map[url];
	}
});

defClass("MediaLoaderOEmbed", IMediaLoader).prototype.implement({
	init: function(api, url) {
		this._api = api;
		this._url = url;
	},
	load: function() {
		getRestApi(this._api.replace(/:url/, encodeURIComponent(this._url)).replace(/:callback/, this.proxy('oncomplete').callback()));
	},
	oncomplete: function(data) {
		if (data.type != 'photo' && !data.thumbnail_url) this.onfail();
		this.provider = [data.provider_name, data.provider_url];
		this.url = data.url;
		if (data.type != 'photo') {
			this.url = data.thumbnail_url;
		}
		if (data.width && data.height) {
			this.size = [data.width, data.height];
		} else if (data.thumbnail_width && data.thumbnail_height) {
			this.size = [data.thumbnail_width, data.thumbnail_height];
		}
		if (this.url) this.onload();
		else this.onerror();
	}
});

defClass("MediaLoaderTwitter", IMediaLoader).prototype.implement({
	provider: ['pic.twitter.com', 'https://pic.twitter.com/'],
	init: function(media) {
		this._media = media;
	},
	load: function() {
		this.url = this._media.media_url_https || this._media.media_url;
		var maxSize = 0;
		if (this._media.sizes) for (var k in this._media.sizes) {
			var c = this._media.sizes[k];
			var pixels = c.w * c.h;
			if (pixels > maxSize) {
				this.size = [c.w, c.h]; 
				maxSize = pixels;
			}
		}
		if (this.url) this.onload();
		else this.onerror();
	}
});

defClass("MediaLoaderURL", IMediaLoader).prototype.implement({
	init: function(provider, url, sizeHint) {
		this._provider = provider;
		this._url = url;
		this._sizeHint = sizeHint;
	},
	load: function() {
		this.provider = this._provider;
		this.url = this._url;
		if (this._sizeHint) {
			this.size = this._sizeHint;
		}
		this.onload();
	}
});

defClass("UrlHandler").implement({

	handle: function(url, e) {
		if (e.shiftKey || e.metaKey) return arguments.callee._super.apply(this, arguments);
		if (PREF('mediaPreview') == '0') return arguments.callee._super.apply(this, arguments);
		var c = MediaPreviewer.getCurrent();
		if (c && c.getURL() == url) {
			setTimeout(function() {
				c.onclick();
			}, 1);
			return false;
		}
		var loader;
		if ((loader = this.getMediaLoader(url))) {
			this.previewMedia(loader, url);
			return;
		}
		return arguments.callee._super.apply(this, arguments);
	},

	getMediaLoader: function(url) {
		var media, cached;
		if ((cached = MediaLoaderCache.get(url))) {
			return cached;
		}
		if ((media = TwitterMedia.get(url))) {
			return new MediaLoaderTwitter(media);
		}
		url = UrlExpander.expand(url);
		for (var i = 0; i < this.mediaHandlers.length; i ++) {
			var c = this.mediaHandlers[i];
			for (var j = 0; j < c.patterns.length; j ++) {
				if (c.patterns[j].test(url)) {
					var loader = c.createLoader(url);
					if (loader) return loader;
				}
			}
		}
		return false;
	},

	previewMedia: function(loader, url) {
		new MediaPreviewer(loader, url).preview();
	}

});

defClass("UserInfoView").prototype.implement({
	nameClicked: function() {
		if (this._data.profile_image_url) {
			var url = this._showProfileLink;
			var image = this._data.profile_image_url.replace(/_normal(\....)/, '_reasonably_small$1');
			var loader = new MediaLoaderURL(['Twitter', 'http://twitter.com/'], image);
			new MediaPreviewer(loader, url).preview();
		}
	}
});

defClass("MediaPreviewKeyHandler", KeyHandler).prototype.implement({
	keyDown: function(kc, e) {
		var c = MediaPreviewer.getCurrent();
		if (kc == 27 && c) {
			c.hide();
			return false;
		}
	}
});

defClass("MediaPreviewer").implement({

	_current: null,
	_imageCache: [],

	setCurrent: function(cur) {
		this._current = cur;
	},

	putCache: function(img) {
		this._imageCache.push(img);
		while (this._imageCache.length > 3) this._imageCache.shift();
	},

	getCache: function(src) {
		for (var i = this._imageCache.length - 1; i >= 0; i --) {
			if (this._imageCache[i].src == src) {
				return this._imageCache[i];
			}
		}
	},

	getCurrent: function() { return this._current; }

}).prototype.implement({

	init: function(loader, url) {
		this._loader = loader;
		this._loader.onload = this.proxy('onload');
		this._loader.onerror = this.proxy('onerror');
		this._url = url;
		this._element = C('media-preview-container');
		this._element.onclick = this.proxy('onclick');
		this._dialog = new TWDialog('Media Preview', this.proxy('renderContent'), '');
		this._dialog.onhide = this.proxy('onhide');
		this._displayed = false;
	},

	getURL: function() { return this._url; },
	getImage: function() { return this._image; },

	hide: function() {
		this._dialog.hide();
	},

	onhide: function(cont, dc) {
		this.constructor.setCurrent(null);
		cont();
	},

	onclick: function() {
		open_link(this._url);
		this.hide();
	},

	setMessage: function(message) {
		this._element.innerHTML = '<div class="media-preview-loading"><b>' + message + '</b><br>(click to open in browser)</div>';
	},

	renderContent: function(el) {
		this.setMessage('loading media information..');
		el.appendChild(this._element);
	},

	onload: function() {
		this._loader.previewLoaded = true;
		MediaLoaderCache.register(this._url, this._loader);
		this.loadImage();
	},

	loadImage: function() {
		this.setMessage('loading image..');
		var cache = this.constructor.getCache(this._loader.url);
		if (cache) {
			this._image = cache.image;
			this._image.onload = this.proxy('imageLoaded');
			this._image.onerror = this.proxy('onerror');
			this._loader.size = cache.size;
			this.displayImage();
		} else {
			this._image = new Image();
			this._image.onload = this.proxy('imageLoaded');
			this._image.onerror = this.proxy('onerror');
			this._image.src = this._loader.url;
			if (this._loader.size) {
				this.displayImage();
			}
		}
	},

	imageLoaded: function() {
		this._loader.size = [this._image.width, this._image.height];
		this._image.onload = null;
		this.displayImage();
	},

	displayImage: function() {
		if (this._displayed) return;
		this.constructor.putCache({ src: this._loader.url, image: this._image, size: [this._loader.size[0], this._loader.size[1]] });
		this._displayed = true;
		this._imageWidth = Math.min(window.innerWidth - 96, this._loader.size[0]);
		this._imageHeight = Math.min(window.innerHeight - 256, this._imageWidth / this._loader.size[0] * this._loader.size[1]);
		this._imageWidth = this._imageHeight / this._loader.size[1] * this._loader.size[0];
		this._dialog.setWidth(Math.max(this._imageWidth, 320) + 4, true, this.proxy('dialogAdjusted'));
	},

	dialogAdjusted: function() {
		this._element.innerHTML = '';
		this._image.style.width = this._imageWidth + 'px';
		this._image.style.marginLeft = (this._imageWidth / -2) + 'px';
		this._image.style.height = this._element.style.height = this._imageHeight + 'px';
		this._element.appendChild(this._image);
		if (this._loader.provider) {
			var link = C('link', 'span');
			var url = this._loader.provider[1];
			link.appendChild(document.createTextNode((this._loader.provider[0] + '').toLowerCase()));
			link.onclick = function() { open_link(url); };
			this._dialog.updateFooter(function(el) {
				el.appendChild(document.createTextNode('provider : '));
				el.appendChild(link);
			});
		}
	},

	onerror: function() {
		this.setMessage('can\'t load image!');
		this._image.onerror = null;
	},

	preview: function() {
		this._dialog.show();
		if (this._loader.previewLoaded) {
			this.loadImage();
		} else {
			this._loader.load();
		}
		this.constructor.setCurrent(this);
	}

});

defClass("UrlHandler").mediaHandlers = [
	{
		createLoader: function(url) {
			return new MediaLoaderURL(["upic.me", "http://upic.me/"], url);
		},
		patterns: [
			/^http:\/\/upic\.me\/i\/\w+\/.+$/i,
		]
	},
	{
		createLoader: function(url) {
			return new MediaLoaderURL(["MOLOME", "http://molo.me/"], url.replace(/\/p\//, '/photos/pop_big/'), [210, 210]);
		},
		patterns: [
			/^http:\/\/molo\.me\/p\/\w+$/i
		]
	},
	{
		createLoader: function(url) {
			var m = url.match(/\/([a-z0-9]+)$/i);
			if (!m || m[1] == 'search') return false;
			return new MediaLoaderURL(["Twitpic", "http://twitpic.com/"], 'https://twitpic.com/show/large/' + m[1]);
		},
		patterns: [
			/^http:\/\/twitpic\.com\/[a-z0-9]+$/i,
			/^http:\/\/www\.twitpic\.com\/[a-z0-9]+$/i,
			/^http:\/\/twitpic\.com\/photos\/[a-z0-9]+$/i,
			/^http:\/\/www\.twitpic\.com\/photos\/[a-z0-9]+$/i		
		]
	},
	{
		createLoader: function(url) {
			return new MediaLoaderOEmbed("http://api.embed.ly/1/oembed?key=492bc16c09cb11e1858e4040d3dc5c07&url=:url&format=json&callback=:callback", url);
		},
		patterns: [
			/^http:\/\/.*imgur\.com\/.*$/i,
			/^http:\/\/i.*\.photobucket\.com\/albums\/.*$/i,
			/^http:\/\/s.*\.photobucket\.com\/albums\/.*$/i,
			/^http:\/\/media\.photobucket\.com\/image\/.*$/i,
			/^http:\/\/www\.tinypic\.com\/view\.php.*$/i,
			/^http:\/\/tinypic\.com\/view\.php.*$/i,
			/^http:\/\/www\.tinypic\.com\/player\.php.*$/i,
			/^http:\/\/tinypic\.com\/player\.php.*$/i,
			/^http:\/\/www\.tinypic\.com\/r\/.*\/.*$/i,
			/^http:\/\/tinypic\.com\/r\/.*\/.*$/i,
			/^http:\/\/.*\.tinypic\.com\/.*\.jpg$/i,
			/^http:\/\/.*\.tinypic\.com\/.*\.png$/i,
			/^http:\/\/phodroid\.com\/.*\/.*\/.*$/i,
			/^http:\/\/img\.ly\/.*$/i,
			/^http:\/\/twitrpix\.com\/.*$/i,
			/^http:\/\/.*\.twitrpix\.com\/.*$/i,
			/^http:\/\/picplz\.com\/.*$/i,
			/^http:\/\/lockerz\.com\/s\/.*$/i,
			/^http:\/\/share\.ovi\.com\/media\/.*\/.*$/i,
			/^http:\/\/www\.flickr\.com\/photos\/.*$/i,
			/^http:\/\/twitgoo\.com\/.*$/i,
			/^http:\/\/instagram\.com\/p\/.*$/i,
			/^http:\/\/instagr\.am\/p\/.*$/i,
			/^http:\/\/twitter\.com\/.*\/status\/.*\/photo\/.*$/i,
			/^http:\/\/twitter\.com\/.*\/statuses\/.*\/photo$/i,
			/^http:\/\/pic\.twitter\.com\/.*$/i,
			/^http:\/\/www\.twitter\.com\/.*\/statuses\/.*\/photo\/.*$/i,
			/^http:\/\/mobile\.twitter\.com\/.*\/status\/.*\/photo\/.*$/i,
			/^http:\/\/mobile\.twitter\.com\/.*\/statuses\/.*\/photo\/.*$/i,
			/^https:\/\/twitter\.com\/.*\/status\/.*\/photo\/.*$/i,
			/^https:\/\/twitter\.com\/.*\/statuses\/.*\/photo\/.*$/i,
			/^https:\/\/www\.twitter\.com\/.*\/status\/.*\/photo\/.*$/i,
			/^https:\/\/www\.twitter\.com\/.*\/statuses\/.*\/photo\/.*$/i,
			/^https:\/\/mobile\.twitter\.com\/.*\/status\/.*\/photo\/.*$/i,
			/^https:\/\/mobile\.twitter\.com\/.*\/statuses\/.*\/photo\/.*$/i,
			/^http:\/\/twitpic\.com\/.*$/i,
			/^http:\/\/www\.twitpic\.com\/.*$/i,
			/^http:\/\/twitpic\.com\/photos\/.*$/i,
			/^http:\/\/www\.twitpic\.com\/photos\/.*$/i		
		]
	},
	{
		createLoader: function(url) {
			return new MediaLoaderOEmbed("http://upic.me/api/oembed?url=:url&format=json&callback=:callback", url);
		},
		patterns: [
			/^http:\/\/upic\.me\/\w+/i,
			/^http:\/\/upic\.me\/show\/\d+$/i
		]
	}
];

defClass("OptionsUI").options.push(
	{
		title: 'Media Preview',
		description: 'Display media previews inside application.',
		key: 'mediaPreview',
		options: OptionsUI.ON_OFF,
		renderTo: 'tdmoar'
	}
);
// }






defClass("Application").prototype.implement({
	registerComponents: function() {
		this.register('autoCompleter', new AutoCompleter());
		arguments.callee._super.apply(this, arguments);
	},
	launchApplication: function() {
		arguments.callee._super.apply(this, arguments);
		this.locate('autoCompleter').launch();
	}
});

defClass("ACUtils").implement({
	atRegex: new RegExp(ATSIGN_REGEX + '$|\s+$|^$'),
	atRegexStrict: new RegExp(ATSIGN_REGEX + '$'),
	regex: new RegExp(MENTIONS_REGEX + '$'),
	mentions: new RegExp(MENTIONS_REGEX, 'g')
});

defClass("ACInteractionRecord").implement({
	_db: {},
	_changed: false,
	_loaded: false,
	add: function(user, time) {
		var c = this._db[user.id];
		if (!c) {
			c = this._db[user.id] = new ACInteractionRecord(user);
			user.interaction = c;
		}
		c.setLastInteracted(time);
		this._changed = true;
	},
	load: function() {
		var d = JSON.parse(sessionStorage.getItem('autocompleteDB'));
		if (!d) throw new Error('empty database!');
		for (var i = 0; i < d.length; i ++) {
			this.add(UserRecord.makeUser(d[i]), d[i].lastInteracted);
		}
		this._loaded = true;
	},
	setLoaded: function() {
		this._loaded = true;
	},
	save: function() {
		if (!this._loaded) return;
		if (!this._changed) return;
		this._changed = false;
		var o = [];
		for (var k in this._db) {
			var c = this._db[k];
			if (c.getLastInteracted() > -1) {
				o.push({
					lastInteracted: c.getLastInteracted(),
					id_str: k,
					screen_name: c.getUser().username,
					name: c.getUser().name
				});
			}
		}
		if (o.length == 0) {
			sessionStorage.setItem('autocompleteDB', '');
		} else {
			sessionStorage.setItem('autocompleteDB', JSON.stringify(o));
		}
	},
	delayedSave: function() {
		clearTimeout(this._delay);
		this._delay = setTimeout(this.proxy('save'), 1000);
	}
}).prototype.implement({
	init: function(user) {
		this._user = user;
		this._lastInteracted = -1;
	},
	setLastInteracted: function(time) {
		if (time > this._lastInteracted) this._lastInteracted = time;
	},
	getLastInteracted: function() { return this._lastInteracted; },
	getUser: function() { return this._user; }
});


defClass("UserRecord").prototype.implement({
	load: function() {
		arguments.callee._super.apply(this, arguments);
		ACDatabase.addUser(this);
	}
});

defClass("Feed").prototype.implement({
	handleFirstLoad: function() {
		arguments.callee._super.apply(this, arguments);
		app._components.autoCompleter.loadDatabase();
	}
});

defClass("Tweet").prototype.implement({
	load: function() {
		var r = arguments.callee._super.apply(this, arguments);
		if (this.mention) {
			ACInteractionRecord.add(this.user, this.date.getTime());
		}
		if (this.mine && this.entities) {
			if (this.entities && this.entities.user_mentions) {
				var l = this.entities.user_mentions;
				for (var j = 0; j < l.length; j ++) {
					ACInteractionRecord.add(UserRecord.makeUser(l[j]), this.date.getTime());
				}
			}
		}
		ACInteractionRecord.delayedSave();
		return r;
	}
});

defClass("OptionsUI").options.push(
	{
		title: 'Username AutoComplete',
		description: 'Automatically display a popup of users when you type @. (Note: you can use Tab even when this is disabled.)',
		key: 'usernameAutoComplete',
		options: {
			'0': 'Off',
			'1': 'On'
		},
		renderTo: 'tdmoar'
	}
);

defClass("AutoCompleter").prototype.implement({
	init: function() {
	},
	launch: function() {
		this._view = new ACView();
		this._touch = !!(app._components.touch && app._components.touch.isTouch());
		this._view.setTouchMode(this._touch);
		this._view.onclick = this.proxy('onclick');
	},
	loadDatabase: function() {
		try {
			ACInteractionRecord.load();
		} catch (e) {
			this.loadDatabaseFromServer();
		}
	},
	loadDatabaseFromServer: function() {
		var pg = new Progress('Loading Autocomplete Data');
		var xh = new XH('GET', app._components.config.api.completedb);
		xh.oncomplete = function(response) {
			try {
				var d = json_parse(response);
				for (var i = 0; i < d.length; i ++) {
					ACInteractionRecord.add(UserRecord.makeUser(d[i]), d[i].lastInteracted);
				}
				ACInteractionRecord.setLoaded();
				ACInteractionRecord.save();
				pg.ok('Autocomplete Data Loaded');
			} catch (e) {
				pg.fail('Autocomplete Data Failed to Load!');
				throw e;
			}
		}.b(this);
		xh.send();
	},
	handle: function(match, prefix) {
		if (this._state && this._state.isActivated()) {
			return;
		}
		if (!this._state || this._state.getPrefix() != prefix) {
			var list = ACDatabase.getList(prefix);
			if (list.length > 0) {
				this._state = new ACState(match, list);
				this._view.update(this._state);
			} else {
				this.clear();
			}
		}
	},
	onclick: function(index) {
		if (this._state) {
			var previous = this._state.getText();
			this._state.setIndex(index);
			var current = this._state.getText();
			app._components.tweetBox.replaceTextBeforeSelection(previous.length, current);
			this.clear();
		}
	},
	handleKey: function(kc, e, tb) {
		if (!this._state && (kc == 9 || (kc == 32 && e.ctrlKey))) {
			if (!tb.hasSelectedText()) {
				var t = tb.getTextBeforeSelection(), m;
				if ((m = t.match(ACUtils.regex))) {
					this.handle(m[2] + m[3], m[3].toLowerCase());
				} else if ((m = t.match(ACUtils.atRegex))) {
					if (!m[1]) m[1] = '';
					this.handle(m[1], '$');
				}
			}
		}
		if (this._state) {
			if (kc == 9 || kc == 38 || kc == 40) {
				var previous = this._state.getText();
				if (!this._state.isActivated()) {
					this._state.activate();
				} else {
					this._state.next((kc == 40 ? -1 : 1) * (e.shiftKey ? -1 : 1));
				}
				var current = this._state.getText();
				tb.replaceTextBeforeSelection(previous.length, current);
				this._view.update(this._state);
				return false;
			} else if (kc != 16) {
				this.clear();
				if (kc == 13) return false;
			}
		}
	},
	shouldAutoComplete: function() {
		return PREF('usernameAutoComplete') == '1';
	},
	handleCharacter: function(e, tb) {
		if (this.shouldAutoComplete() && e.charCode) {
			if (!tb.hasSelectedText()) {
				var t = tb.getTextBeforeSelection(), m;
				if ((m = t.match(ACUtils.regex))) {
					this.handle(m[2] + m[3], m[3].toLowerCase());
				} else if (this._touch && (m = t.match(ACUtils.atRegexStrict))) {
					this.handle(m[0], '$');
				}
			}
		}
	},
	clear: function() {
		if (this._state) {
			this._state = null;
			this._view.clear();
		}
	}
});

defClass("TweetBox").prototype.implement({
	checkCharacter: function(e) {
		arguments.callee._super.apply(this, arguments);
		app._components.autoCompleter.handleCharacter(e, this);
	}
});

defClass("TweetBoxKeyHandler").prototype.implement({
	keyDown: function(kc, e) {
		var v = app._components.autoCompleter.handleKey(kc, e, this._tweetBox);
		if (v === true || v === false) return v;
		return arguments.callee._super.apply(this, arguments);
	}
});

defClass("ACView").prototype.implement({
	init: function() {
		this._popup = new TweetBarPopup('left');
		this._placeholder = C('ac-placeholder');
		this._element = C('ac-users');
		this._element.onclick = this.proxy('elementOnclick');
		this._popup.getContentElement().appendChild(this._element);
		this._popup.getContentElement().appendChild(this._placeholder);
		this._subviews = [];
		this._visible = {};
		this._count = 0;
		this._touch = false;
	},
	elementOnclick: function(e) {
		var c = e.target;
		for (; c && c != this._element; c = c.parentNode) {
			if (c.getAttribute) {
				var d = parseInt(c.getAttribute('data-tw-ac-index'));
				this.onclick(d); return false;
			}
		}
	},
	onclick: function(i) {
	},
	setTouchMode: function(touch) {
		this._touch = !!touch;
	},
	createSubview: function(index) {
		var el = C('ac-user ac-user-hidden');
		this._element.appendChild(el);
		return el;
	},
	getSubview: function(index) {
		while (this._count <= index) {
			this._subviews[this._count] = this.createSubview(this._count);
			this._count++;
		}
		return this._subviews[index];
	},
	update: function(state) {
		var list = state.getList();
		var index = 0;
		var selectedIndex = state.getIndex();
		var visible = {};
		var max = 7;
		for (var i = Math.max(0, Math.min(selectedIndex - Math.floor(max / 2), list.length - max)); index < max && i < list.length; i ++) {
			var j = this._touch ? index : max - index;
			var sub = this.getSubview(j);
			index++;
			sub.innerHTML = list[i].username;
			sub.className = 'ac-user ac-user-' + (i == selectedIndex ? 'selected' : 'visible');
			sub.setAttribute('data-tw-ac-index', i);
			visible[j] = true;
		}
		for (var k in this._visible) {
			if (!visible[k]) {
				this.getSubview(parseInt(k)).className = 'ac-user ac-user-hidden';
			}
		}
		this._visible = visible;
		this._popup.show();
		this._placeholder.style.width  = this._element.offsetWidth + 'px';
		this._placeholder.style.height = this._element.offsetHeight + 'px';
		this._popup.updateHeight();
	},
	clear: function() {
		this._popup.hide();
	}
});

defClass("ACState").prototype.implement({
	init: function(prefix, list) {
		this._prefix = prefix;
		this._list = list;
		this._activated = false;
		this._index = -1;
	},
	activate: function() {
		this._activated = true;
		this._index = 0;
	},
	next: function(increment) {
		this._index += increment;
		if (this._index < -1) this._index = this._list.length - 1;
		if (this._index >= this._list.length) this._index = -1;
	},
	setIndex: function(index) {
		this._activated = true;
		this._index = index;
	},
	getCurrent: function() {
		if (!this._activated) return null;
		if (this._index == -1) return null;
		return this._list[this._index];
	},
	getText: function() {
		var current = this.getCurrent();
		return current ? '@' + current.username : this._prefix;
	},
	isActivated: function() { return this._activated; },
	getPrefix: function() { return this._prefix; },
	getList: function() { return this._list; },
	getIndex: function() { return this._index; }
});

defClass("ACDatabase").implement({

	_map: {},
	_prefixes: {},

	getList: function(prefix) {
		if (prefix == '') prefix = '$';
		if (!this._prefixes[prefix]) return [];
		return this._prefixes[prefix].getList();
	},

	addUser: function(user) {
		var name = user.normalizedUsername;
		if (this._map[user.id]) {
			return;
		}
		this._map[user.id] = user;
		this.addPrefixEntry('$', user);
		for (var i = 1; i <= name.length; i ++) {
			this.addPrefixEntry(name.substr(0, i), user);
		}
	},

	addPrefixEntry: function(prefix, user) {
		if (!this._prefixes[prefix])
			this._prefixes[prefix] = new ACPrefix();
		this._prefixes[prefix].add(user);
	}

});

defClass("ACPrefix").prototype.implement({

	init: function() {
		this._list = [];
		this._length = 0;
		this._dirty = false;
	},

	add: function(user) {
		this._list[this._length++] = user;
		this._dirty = true;
	},

	sort: function() {
		var compare = function(a, b, c) {
			if (a == b) return c ? c() : 0;
			return a < b ? -1 : 1;
		};
		var now = new Date().getTime();
		var rank = function(x) {
			if (!x.interaction) return 0;
			var diff = (now - x.interaction.getLastInteracted()) / 1000;
			if (diff < 60) return -10;
			if (diff < 600) return -9;
			if (diff < 7200) return -8;
			if (diff < 86400) return -7;
			if (diff < 7 * 86400) return -6;
			return 0;
		};
		this._list.sort(function(a, b) {
			return compare(rank(a), rank(b), function() {
				return compare(a.normalizedUsername, b.normalizedUsername);
			});
		});
	},

	getList: function() {
		if (this._dirty) {
			this._dirty = false;
		}
		this.sort();
		return this._list.slice();
	}

});





