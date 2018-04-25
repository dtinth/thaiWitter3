
var fs = require('fs');
var thaiJS = require('../thaijs');

module.exports = function(base) {
	return function(req, res, next) {
		if (req.url.match(/\.\./)) return next();
		if (req.url.match(/\0/)) return next();
		readPublicFileList(base + '/public-files.txt', function(err, list) {
			if (err) return next(err);
			list.push('js');
			handleFileList(base, list, req, res, next);
		});
	};
};

function readPublicFileList(fileName, callback) {
	fs.readFile(fileName, 'utf-8', function(err, data) {
		if (err) return callback(err, null);
		var list = data.split('\n').map(function(x) { return x.replace(/^\s+|\s+$/g, ''); }).filter(function(x) { return x != ''; });
		return callback(null, list);
	});
}

function handleFileList(base, list, req, res, next) {
	var pathname = require('url').parse(req.url).pathname;
	for (var i = 0; i < list.length; i ++) {
		var virtual = '/thaiWitter/' + list[i];
		if (pathname == virtual || pathname.substr(0, virtual.length + 1) == virtual + '/') {
			return serveFile(base + list[i] + pathname.substr(virtual.length), res, next);
		}
	}
	return next();
}

function serveFile(file, res, next) {
	return fs.stat(file, function(err, stat) {
		if (err) return next(err);
		if (!stat.isFile()) return next(new Error('ITZ NOT A FIEL'));
		res.header('Cache-Control', 'nocache');
		res.header('Pragma', 'nocache');
		if (file.match(/\.thaijs$/)) {
			res.header('Content-Type', 'text/javascript; charset=utf-8');
			return fs.readFile(file, 'utf-8', function(err, data) {
				try {
					return res.send(thaiJS.compile(data));
				} catch (e) { return next(e); }
			});
		}
		return res.sendfile(file);
	});
}
