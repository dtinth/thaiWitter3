
var fs = require('fs');
var compile = require('./../template-compiler');
var postprocess = require('./../template-postprocessor');

function compileTemplate(template) {
	return compile(template,
		function(files) {
			return files.map(function(x) { return '<link rel=stylesheet href="' + x + '">'; }).join('');
		},
		function(files) {
			return files.map(function(x) { return '<script src="' + x + '"></script>'; }).join('');
		}
	);
}

module.exports = function mainPageServer(fileName, productionMode) {

	var templateData = null;

	function getContent(cont) {
		if (productionMode && templateData != null) {
			return cont(null, templateData);
		} else {
			console.log('compiling template...');
			return fs.readFile(fileName, 'utf-8', function(err, data) {
				if (err) return cont(err, null);
				require('./../twitter-config').getConfiguration(function(config) {
					templateData = postprocess(compileTemplate(data), config);
					console.log('compiling template : done, size = ' + templateData.length);
					return cont(null, templateData);
				});
			});
		}
	}

	if (productionMode) {
		getContent(function() {
		});
	}

	return function(req, res, next) {
		var pathname = require('url').parse(req.url).pathname;
		if (pathname == '/thaiWitter') {
			return res.redirect('/thaiWitter/');
		}
		if (pathname == '/thaiWitter/') {
			return getContent(function(err, data) {
				if (err) return next(err);
				res.send(data);
			});
		}
		return next();
	};

};

