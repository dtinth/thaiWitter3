
var send = require('send')
  , url = require('url')

module.exports = function(processor, options) {

	var cache = 'no-cache'
	if (options.cache) cache = 'public, max-age=' + (86400 * 7)

	return function(req, res, next) {
		var pathname = decodeURIComponent(url.parse(req.url).pathname)
		  , re = /^\/asset(?:s|\/[0-9a-fA-F]+)\//

		if (!pathname.match(re)) return next()
		var path = pathname.replace(re, '')
		if (path.indexOf('\0') != -1) return next(error('wtf MAN?', 400))
		
		processor.process(path)
			.then(function(data) {
				res.setHeader('Content-Type', send.mime.lookup(path))
				res.setHeader('Cache-Control', cache)
				res.end(data)
			})
			.fail(next)

	}

}

module.exports.url = function(hash, pathname) {
	return '/asset' + (hash ? '/' + hash.substr(0,16) + '/' : 's/') + pathname
}
