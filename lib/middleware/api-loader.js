
var fs = require('fs');

module.exports = function handlerLoaderMiddleware() {
	return function(req, res, next) {
		runHandlerLoader(req, res, next);
	}
};

function runHandlerLoader(req, res, next) {
	fs.readFile(__dirname + '/api.js', 'utf-8', function(err, data) {
		if (err) return next(err);
		try {
			execModule(data)()(req, res, next);
		} catch (e) {
			return next(e);
		}
	});
};

function execModule() {
	var module = {};
	eval(arguments[0]);
	return module.exports;
}
