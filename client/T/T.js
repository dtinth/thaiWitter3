

var T = this.T = {}

T.module = function(name) {
	T[name] = T[name] || {}
};

T.parseJSON = function parseJSON(x) {
	if (typeof JSON != 'undefined' && JSON.parse) return JSON.parse(x);
	var y = x.replace(/[\[\]{}:,]|"(?:\\[\s\S]|[^"])*"|\-?\d+(?:\.\d+)?|null|true|false/g, '');
	if (y != '') throw new Error('unsafe json D:');
	return eval('(' + x + ')');
};

T.changer = function changer(fn) {
	var d;
	return function(x) {
		if (x !== d) {
			fn (x);
			d = x;
		}
	};
};

T.digits = function digits(str, length) {
  	str = str + '';
	while (str.length < length) str = '0' + str;
	return str;
};

T.partialRight = function partialRight(f) {
  	var args = _.rest(arguments)
	  , sole = args.length == 1 // stupid optimization
  	return function partialRightOutput() {
	  	if (arguments.length == 1 && sole) { // stupid optimization
			return f.call(this, arguments[0], args[0])
		}
		return f.apply(this, _.toArray(arguments).concat(args))
	};
};

T.twoDigits = T.partialRight(T.digits, 2);

T.decodeUTF = function decodeUTF(x, z) {
	return x.replace(/%([cd][0-9a-f]%[89ab][0-9a-f]|e[0-9a-f](?:%[89ab][0-9a-f]){2}|f[0-7](?:%[89ab][0-9a-f]){3}|f[89ab](?:%[89ab][0-9a-f]){4}|f[cd](?:%[89ab][0-9a-f]){5})/ig, function(a) {
		return z ? '&#' + decodeURIComponent(a).charCodeAt(0) + ';' : decodeURIComponent(a);
	});
};

T.count = function(array, iterator) {
	var out = 0;
	for (var i = 0; i < array.length; i ++) if (iterator(array[i])) out++;
	return out;
};




