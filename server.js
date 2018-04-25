
var express = require('express');
var connect = require('connect');
var crypto = require('crypto');
var app = express();
var fs = require('fs');
var stats = require('./lib/stats');
var Q = require('q')
var version = JSON.parse(fs.readFileSync('version.json', 'utf-8'))

// Edit 2018: Add .env support
require('dotenv').config();
// End Edit

// global configuration
app.configure(function() {
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(require('./lib/middleware/image-upload-proxy')());
	app.use(express.bodyParser());
	app.use(express.compress());
	app.set("view engine", "hjs")
	app.set("views", __dirname + '/views')
});


// environment-specific configuration
var dev = false
app.configure('development', function() {
	console.log('(development mode)');
	app.use(express.static(__dirname + '/public'));
	dev = true;
});
app.configure('staging', 'production', function() {
	console.log('(production mode)');
	app.use(express.static(__dirname + '/public', { maxAge: 1 * 86400 * 1000 }));
});


// append "-dev" if in development mode
if (dev) version += '-dev'
global.thaiWitterVersion = version


// start displaying messages
console.log('~~~[[ #thaiWitter Server |~| #thaiWitter Version ' + version + ' ]]~~~');
stats.init();

// set-up other middlewares
var api = require('./lib/middleware/api')
  , errorHandler = require('./lib/middleware/error-handler')
  , mainServer = require('./lib/middleware/main-server')
  , assetServer = require('./lib/middleware/asset-server')

var AssetProcessor = require('./lib/asset-processor')
  , ScriptAggregator = require('./lib/processors/script-aggregator')
  , thaiJS = require('./lib/thaijs')
  , coffeeScript = require('coffee-script')
  , base = __dirname + '/client'

var processor = new AssetProcessor(base, { cache: !dev })
processor.use(new ScriptAggregator({ development: dev }))
processor.use({ extension: '.thaijs', pattern: /\.js$/, process: thaiJS.compile.bind(thaiJS) })
processor.use({ extension: '.coffee', pattern: /\.js$/, process: coffeeScript.compile.bind(coffeeScript) })

// utility function: calculate sha1
function sha1(text) {
	return crypto.createHash('sha1').update(text).digest('hex')
}

function getAssets(hash) {
	var assets = {}
	function getAsset(key, filename) {
		return processor.process(filename)
			.then(sha1)
			.then(function(digest) { assets[key] = assetServer.url(digest, filename) })
	}
	return Q.all(Object.keys(hash).map(function(key) { return getAsset(key, hash[key]) }))
		.then(function() { return assets; })
}

// we need to get the script files
var powered = require('./lib/powered')
getAssets({ script: 'main.js', style: 'css/css.css' })
	.then(function(assets) {

		// continue configuring the server
		app.use(mainServer(assets, powered.getPowered(), version));
		app.use(assetServer(processor, { cache: !dev }));
		app.use(api());
		app.use(errorHandler());
		app.listen(process.env.PORT || 3003);

	})
	.done()





