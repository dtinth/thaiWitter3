
var fs = require('fs');

module.exports = function thaiWitterErrorHandler() {
	return function(err, req, res, next) {
		res.status(err.status || 500)
		res.render('error', { text: err + '' })
		console.log(err)
		if (err && err.stack) console.log(err.stack)
	};
};
