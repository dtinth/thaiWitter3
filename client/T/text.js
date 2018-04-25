



T.text = function parseText(text) {
	var matches = T.text.matcher(text)
	var out = new (T.text.Text)()
	out.entities = T.text.extract(text, matches)
	return out
}

T.text.Text = function Text() {
}

T.text.Text.prototype.stringify = function(stringifier) {
	return _.map(this.entities, function(e) { return stringifier[e.type](e) }).join('')
}

;(function() {

	var GROUP_URL = 1,
		GROUP_MENTION = 4,
		GROUP_MENTION_LIST = 5,
		GROUP_HASHTAG = 6

	function classifyMatch(match) {
		if (match[GROUP_URL]) return 'url'
		if (match[GROUP_MENTION_LIST]) return 'list'
		if (match[GROUP_MENTION]) return 'user'
		if (match[GROUP_HASHTAG]) return 'hashtag'
	}

	function classify(match) {
		return {
			type: classifyMatch(match),
			text: match[0],
			index: match.index
		}
	}

	function addText(lastIndex, index, text, out) {
		if (index > lastIndex) {
			out.push({
				type: 'text',
				text: text.substring(lastIndex, index),
				index: lastIndex
			})
		}
	}

	T.text.extract = function extract(text, matches) {
		var entities =  _.filter(_.map(matches, classify), Y.notNull(Y.get('type')))
		var out = [], lastIndex = 0
		_.each(entities, function(current) {
			addText(lastIndex, current.index, text, out)
			out.push(current)
			lastIndex = current.index + current.text.length
		})
		addText(lastIndex, text.length, text, out)
		return out
	}

})()

T.text.matchAll = function matchAll(pattern, text) {
	var match, output = [], index
	pattern.lastIndex = 0
	while ((match = pattern.exec(text))) {
		output.push(match)
	}
	return output
}

T.text.regex = /((https?:\/\/|www\.)(\S*[\w\/]+)+)|\B(@[a-z0-9_A-Z]+(\/[a-z0-9_A-Z\-]+)?)|\B(#[^\s#"'()\[\]\{\}<>]+)/g
T.text.matcher = _.partial(T.text.matchAll, T.text.regex)



T.text.shouldExpand = function(expander, text) {
	var length = 0
	_.each(text.entities, function(e) {
		length += (e.type == 'url' ? expander(e.text) : e.text).length
	})
	return length <= 180
}





