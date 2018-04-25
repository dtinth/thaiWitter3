

var txt = require('twitter-text'),
	fs = require('fs')

function nonasciiescape(s) {
	var o = ""
	for (var i = 0; i < s.length; i ++) {
		if (s.charCodeAt(i) <= 127) {
			o += s.charAt(i)
		} else {
			var c = '0000' + s.charCodeAt(i).toString(16).toUpperCase()
			o += '\\u' + c.substr(c.length - 4)
		}
	}
	if (eval(s) !== eval(o)) {
		throw new Error('wtf')
	}
	return o
}

function regex(rgx) {
	var s = JSON.stringify(rgx.source)
	if (process.argv[2] != '-n') s = nonasciiescape(s)
	return s
}

var o = []

o.push('T.regex = {};')
o.push('T.regex.hashtag = new RegExp(' + regex(txt.regexen.validHashtag) + ', "g");')
o.push('T.regex.mentionOrList = new RegExp(' + regex(txt.regexen.validMentionOrList) + ', "g");')

if (process.argv[2] != '-n') {
	fs.writeFileSync(__dirname + '/../' + 'client/T/twitter-regex.js', o.join('\n'), 'utf-8')
} else {
	console.log(o.join('\n'))
}




