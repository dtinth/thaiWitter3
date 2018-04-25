
var Q = require('q')

function ScriptAggregator(options) {
	var dev = options.development
	function aggregatorDev(content, next) {
		var js = JSON.parse(content).map(function(filename) {
				return '<script src="/assets/' + filename + '"></script>'
			}).join('')
		return 'document.write(' + JSON.stringify(js) + ')'
	}
	function aggregator(content, next) {
		return Q.all(JSON.parse(content).map(next))
			.then(function(array) {
				return array.join('\n;\n')
			})
	}
	return {
		pattern: /\.js$/,
		extension: '.ag',
		process: dev ? aggregatorDev : aggregator
	}
}

module.exports = ScriptAggregator
