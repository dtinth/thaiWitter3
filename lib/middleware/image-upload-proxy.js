var url = require('url');
var http = require('http');
var https = require('https');
module.exports = function imageUploadProxyMiddleware() {
	return function(req, res, next) {
		var pathname = url.parse(req.url).pathname;
		if (pathname != '/upload') return next();
		if (req.method != 'POST' && req.method != 'OPTIONS') return next(new Error('NAH POST AND OPTIONS ONLYY'));
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'X-Auth-Service-Provider, X-Verify-Credentials-Authorization, x-requested-with');
		res.header('Access-Control-Max-Age', '1728000');
		if (req.method != 'POST') return res.end();
		var serviceProvider = url.parse(req.header('X-Auth-Service-Provider'));
		if (serviceProvider.protocol && serviceProvider.hostname) {
			var module = serviceProvider.protocol == 'https:' ? https : http;
			var headers = {
				'Authorization': req.header('X-Verify-Credentials-Authorization'),
				'Content-Length': req.header('Content-Length'),
				'Content-Type': req.header('Content-Type')
			};
			if (serviceProvider.port == null) {
				serviceProvider.port = serviceProvider.protocol == 'https:' ? 443 : 80;
			}
			var options = {
				host: serviceProvider.hostname,
				port: serviceProvider.port,
				method: 'POST',
				path: serviceProvider.pathname + (serviceProvider.search ? serviceProvider.search : ''),
				headers: headers
			};
			// console.log('options:', options);
			var areq = module.request(
				options,
				function(ares) {
					res.writeHead(ares.statusCode, ares.headers);
					ares.on('data', function(chunk) {
						// console.log('ares -> res:', chunk.length);
						res.write(chunk);
					});
					ares.on('end', function() {
						// console.log('ares -> res: (end)');
						res.end();
					});
				}
			);
			areq.on('error', function(err) {
				// console.log('areq:', err);
				next(err);
			});
			req.on('data', function(chunk) {
				// console.log('req -> areq:', chunk.length);
				//console.log(chunk);
				areq.write(chunk);
			});
			req.on('end', function() {
				//console.log('req -> areq: (end)');
				areq.end();
			});
		} else {
			next(new Error('YR SERVIZ BROVIDER IS INVALIDD'));
		}
	}
};
