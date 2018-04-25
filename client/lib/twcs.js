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

