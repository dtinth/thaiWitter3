
T.request = function(url) {

	var r = {
		url: url,
		method: 'GET'
	};

	r.send = function() {
		return T.request.send(r)
	};

	return r;

};

T.request.send = function(opt) {
	return T.future(function(resolver) {
		var xh = new XMLHttpRequest();
		xh.open('GET', opt.url, true);
		xh.onreadystatechange = function() {
			if (xh.readyState != 4) return;
			if (xh.status == 200) {
				resolver.resolve(xh);
			} else {
				resolver.reject(xh);
			}
		};
		xh.send('');
	});
};

