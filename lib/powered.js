exports.getPowered = function() {
	function link(url, contents) {
		return '<span class="attrbt" onclick="open_link(unescape(\''
			 + escape(url) + '\'))">' + contents + '</span>'
	}
	function html(html) {
		return { html: html }
	}
	var poweredByNode = link('http://nodejs.org/', 'powered by node.js') + link('http://expressjs.com/', ' + express');
	var POWERED_BY = process.env.POWERED_BY;
	if (POWERED_BY == 'heroku') {
		return [
			html('running on Heroku'),
			html(link('http://heroku.com/', '(http://heroku.com/)')),
			html(poweredByNode)
		];
	}
	if (POWERED_BY == 'icez') {
		return [
			html('hosting provided by icez network'),
			html(link('https://twitter.com/icez', '(@icez)')),
			html(poweredByNode)
		];
	}
	return [
		html('local testing version'),
		html(poweredByNode)
	];
};







