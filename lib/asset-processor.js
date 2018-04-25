

var Q = require('q')
  , fs = require('fs')
  , readFile = Q.nfbind(fs.readFile)
  , error = require('./error')
  , normalize = require('path').normalize
  , join = require('path').join

function exists(path) {
	var defer = Q.defer()
	fs.exists(path, function(value) {
		defer.resolve(value)
	})
	return defer.promise
}

function preprocessPath(preprocessors, path, realpath, index, next) {
	if (index >= preprocessors.length) throw error('Path not found: ' + path, 404)
	var current = preprocessors[index]
	  , pattern = current.pattern
	  , extension = current.extension
	  , process = current.process
	if (!pattern || realpath.match(pattern)) {
		var trypath = !pattern ? realpath : realpath.replace(pattern, '') + extension
		return exists(trypath)
			.then(function(res) {
				if (res) {
					return readFile(trypath, 'utf-8')
						.then(function(content) {
							return process(content, next)
						})
				}
				return preprocessPath(preprocessors, path, realpath, index + 1, next)
			})
	} else {
		return preprocessPath(preprocessors, path, realpath, index + 1, next)
	}
}

function AssetProcessor(base, options) {
	var cache = options.cache ? {} : null
	var processor = {}
	var preprocessors = [ NORMAL_PROCESSOR ]
	function process(path) {
		var key = '/' + path
		return cache ? cache[key] || saveCache(key, doProcess(path)) : doProcess(path)
	}
	function saveCache(key, promise) {
		cache[key] = promise
		promise.fail(function() { delete cache[key] })
		return promise
	}
	function doProcess(path) {
		return preprocessPath(preprocessors, path, normalize(join(base, path)), 0, process)
	}
	processor.use = function(fileProcessor) {
		preprocessors.push(fileProcessor)
	}
	processor.process = process
	return processor
}

var NORMAL_PROCESSOR = {
	pattern: null,
	extension: '',
	process: function(content, next) {
		return content
	}
}

AssetProcessor.NORMAL_PROCESSOR = NORMAL_PROCESSOR

module.exports = AssetProcessor







