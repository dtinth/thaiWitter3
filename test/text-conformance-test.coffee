
fs = require 'fs'
vm = require 'vm'
{ tests } = require './twitter-text-conformance/extract'

describe 'T.text conformance', ->

	context = vm.createContext({ T: {} })
	vm.runInContext(fs.readFileSync(__dirname + '/../' + './client/vendor/underscore-min.js', 'utf-8'), context)
	vm.runInContext(fs.readFileSync(__dirname + '/../' + './client/T/Y.js', 'utf-8'), context)
	vm.runInContext(fs.readFileSync(__dirname + '/../' + './client/T/twitter-regex.js', 'utf-8'), context)
	vm.runInContext(fs.readFileSync(__dirname + '/../' + './client/T/text.js', 'utf-8'), context)

	eachTest = (list, callback) ->
		list.forEach (testcase) ->
			it 'should ' + testcase.description.replace(/^[a-z]/, (a) -> a.toLowerCase()), ->
				callback(testcase)

	testExtract = (type, twtype) -> ->
		eachTest tests[type], (testcase) ->
			text = context.T.text(testcase.text)
			list = (c.text.substr(1) for c in text.entities when c.type == twtype)
			expect(list).to.deep.equal(testcase.expected)

	describe.skip 'mentions', testExtract('mentions', 'user')
	describe.skip 'hashtags', testExtract('hashtags', 'hashtag')


